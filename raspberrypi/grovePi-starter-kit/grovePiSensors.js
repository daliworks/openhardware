#!/usr/bin/env node
/*
 * Copyright (c) 2015, Daliworks. All rights reserved.
 *
 * Reproduction and/or distribution in source and binary forms 
 * without the written consent of Daliworks, Inc. is prohibited.
 *
 */
'use strict';

var _ = require('lodash'),
    util = require('util'),
    events = require('events'),
    logger = require('log4js').getLogger('Sensor');

logger.setLevel('INFO');

// for GrovePi
var GrovePi = require('node-grovepi').GrovePi,
    Board = GrovePi.board,
    AnalogSensor = GrovePi.sensors.base.Analog,
    DigitalSensor = GrovePi.sensors.base.Digital,
    UltrasonicDigitalSensor = GrovePi.sensors.UltrasonicDigital,
    DHTDigitalSensor = GrovePi.sensors.DHTDigital,
    LightAnalogSensor = GrovePi.sensors.LightAnalog;

var ADC = 5; // 5V
var GROVE_VCC = 5; // 5V
var ULTRASONIC_VALID_DURATION = 1000;

function RotaryAngleAnalogSensor(pin) {
  this.preDegree = 0;
  AnalogSensor.apply(this, Array.prototype.slice.call(arguments));
  this.board.pinMode(this.pin, this.board.INPUT);
}
RotaryAngleAnalogSensor.FULL_ANGLE = 300;
RotaryAngleAnalogSensor.prototype = new AnalogSensor();
RotaryAngleAnalogSensor.prototype.read = function() {
  var res = AnalogSensor.prototype.read.call(this);
  var sensorValue = parseInt(res);

  if (isNaN(sensorValue)) {
    return this.preDegree;
  }

  var voltage = sensorValue * ADC / 1023;
  var degree = Math.round(voltage * RotaryAngleAnalogSensor.FULL_ANGLE / GROVE_VCC);

  this.preDegree = degree;
  return degree;
};

function SoundAnalogSensor(pin) {
  AnalogSensor.apply(this, Array.prototype.slice.call(arguments));
  this.board.pinMode(this.pin, this.board.INPUT);
}
SoundAnalogSensor.prototype = new AnalogSensor();

function VibrationAnalogSensor(pin) {
  AnalogSensor.apply(this, Array.prototype.slice.call(arguments));
  this.board.pinMode(this.pin, this.board.INPUT);
}
VibrationAnalogSensor.prototype = new AnalogSensor();

function OnOffDigitalSensor(pin) {
  DigitalSensor.apply(this, Array.prototype.slice.call(arguments));
  this.board.pinMode(this.pin, this.board.OUTPUT);
}
OnOffDigitalSensor.prototype = new DigitalSensor();

function ButtonDigitalSensor(pin) {
  DigitalSensor.apply(this, Array.prototype.slice.call(arguments));
  this.board.pinMode(this.pin, this.board.INPUT);
}
ButtonDigitalSensor.prototype = new DigitalSensor();
ButtonDigitalSensor.prototype.read = function() {
  var res = DigitalSensor.prototype.read.call(this);
  var buttonState;

  if (res && res.length > 0) {
    buttonState = res[0];
  }
  else {
    buttonState = 0;
  }

  return buttonState;
};

// GrovePiSensors
function GrovePiSensors() {
  var self = this;
  self.sensors = {};
}
util.inherits(GrovePiSensors, events.EventEmitter);

GrovePiSensors.prototype.init = function (sensorNames) {
  var self = this,
      board;

  logger.info('init', sensorNames);

  _.each(sensorNames, function(sensorName) {
    self.sensors[sensorName] = {};
  });

  board = new Board({
    debug: true,
    onError: function(err) {
      logger.error('Something wrong just happened', err);
    },
    onInit: function(res) {
      if (res) {

        logger.info('GrovePi Version :: ' + board.version());

        // Analog
        self.sensors.sound.instance = new SoundAnalogSensor(0);
        self.sensors.light.instance = new LightAnalogSensor(1);
        self.sensors.rotary.instance = new RotaryAngleAnalogSensor(2);
        //self.sensors.vibration.instance = new VibrationAnalogSensor(2);

        // Digital
        self.sensors.buzzer.instance = new OnOffDigitalSensor(2);
        self.sensors.led.instance = new OnOffDigitalSensor(3);
        self.sensors.relay.instance = new OnOffDigitalSensor(4);
        self.sensors.button.instance = new ButtonDigitalSensor(5);
        self.sensors.ultrasonic.instance = new UltrasonicDigitalSensor(6);
        self.sensors.temperature.instance = self.sensors.humidity.instance =
          new DHTDigitalSensor(7, DHTDigitalSensor.VERSION.DHT11, DHTDigitalSensor.CELSIUS);

        logger.info('Ultrasonic Digital Sensor (start watch)');

        self.sensors.ultrasonic.instance.on('change', function (value) {
          var ultrasonicValue;

          if (value === false || value === 'false' || value === 65535) {
            return;
          }

          if (value < 20) {
            ultrasonicValue = 1;
          } else {
            ultrasonicValue = 0;
          }

          logger.debug('onChange', 'ultrasonic', ultrasonicValue, value);

          if (!_.isUndefined(self.sensors.ultrasonic.preValue) &&
            self.sensors.ultrasonic.preValue !== ultrasonicValue)
          {
            logger.debug('onChange', 'ultrasonic', 'prev !== curr', ultrasonicValue);
            if (self.sensors.ultrasonic.timer) {
              logger.debug('onChange', 'ultrasonic', 'clearTimeout', ultrasonicValue);
              clearTimeout(self.sensors.ultrasonic.timer);
              self.sensors.ultrasonic.timer = null;
            } else {
              logger.debug('onChange', 'ultrasonic', 'setTimeout', ultrasonicValue);
              self.sensors.ultrasonic.timer = setTimeout(function () {
                logger.info('send event', 'ultrasonic', self.sensors.ultrasonic.preValue);
                self.emit('event', 'ultrasonic', self.sensors.ultrasonic.preValue);
                self.sensors.ultrasonic.timer = null;
              }, ULTRASONIC_VALID_DURATION);
            }
          } else {
            logger.debug('onChange', 'ultrasonic', 'prev === curr', ultrasonicValue);
          }

          self.sensors.ultrasonic.preValue = ultrasonicValue;
        });
        self.sensors.ultrasonic.instance.watch(100);

        logger.info('Button Digital Sensor (start watch)');
        self.sensors.button.instance.on('change', function(buttonState) {

          if (!_.isUndefined(self.sensors.button.preValue) &&
              self.sensors.button.preValue === buttonState) {
            return;
          }

          if (!self.sensors.button.timer) {
            if (buttonState) {
              logger.info('send event', 'button', 1);
              self.emit('event', 'button', 1);

              self.sensors.button.timer = setTimeout(function () {
                if (!self.sensors.button.preValue) {
                  logger.info('send event', 'button', 0);
                  self.emit('event', 'button', 0);
                }
                self.sensors.button.timer = null;
              }, 15 * 1000);
            } else {
              if (self.sensors.button.preValue !== buttonState) {
                logger.info('send event', 'button', 0);
                self.emit('event', 'button', 0);
              }
            }
          }
          self.sensors.button.preValue = buttonState;
        });
        self.sensors.button.instance.watch(10);
      }
    }
  });

  board.init();

  self.emit('ready');
};

GrovePiSensors.prototype.getData = function (name) {
  var self = this;
  var value, rtn;

  if (name === 'temperature') {
    value = self.sensors[name].instance.read()[0];
  } else if (name === 'humidity') {
    value = self.sensors[name].instance.read()[1];
  } else if (name === 'sound') {
    value = self.sensors[name].instance.read() * 200 / 1024;
  } else if (name === 'light') {
    value = 10000 / (Math.pow(self.sensors[name].instance.read() * 10, 4 / 3));
  } else {
    value = self.sensors[name].instance.read();
  }
  rtn = { value: value, status: 'on' };

  logger.info('getData', name, rtn);
  return rtn;
};

GrovePiSensors.prototype.getStatus = function (name) {
  var rtn = { status: 'on' };
  logger.info('getStatus', name, rtn);

  return rtn;
};

GrovePiSensors.prototype.doCommand = function (name, cmd, options) {
  var self = this;
  var command;

  logger.info('doCommand', name, cmd, options);

  if (cmd === 'on') {
    command = 1;
    if (options && options.duration) {
      clearTimeout(self.sensors[name].timer);
      self.sensors[name].timer = setTimeout(function () {
        self.sensors[name].instance.write(0); // off
      }, options.duration);
    }
  } else if (cmd === 'blink') {
    if (self.sensors[name].blinkTimer) {
      clearTimeout(self.sensors[name].blinkTimer);
    }

    self.sensors[name].blinkTimer = setInterval(function () {
      self.sensors[name].instance.write(!self.sensors[name].instance.read()[0]);
    }, options.interval || 1000);

    if (options.duration) {
      self.sensors[name].offTimer = setTimeout(function() {
        clearTimeout(self.sensors[name].blinkTimer);
        self.blinkTimer = null;
        self.offTimer = null;
        self.sensors[name].instance.write(0);
      }, options.duration || 10000);
    }
    return;
  } else { // 'off'
    command = 0;
  }

  self.sensors[name].instance.write(command);
};

module.exports = new GrovePiSensors();
