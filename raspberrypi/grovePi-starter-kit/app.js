#!/usr/bin/env node
/*
 * Copyright (c) 2015, Daliworks. All rights reserved.
 *
 * Reproduction and/or distribution in source and binary forms 
 * without the written consent of Daliworks, Inc. is prohibited.
 *
 */
'use strict';
var jsonrpc = require('jsonrpc-tcp'),
    _ = require('lodash'),
    os = require('os'),
    log4js = require('log4js');

var Lcd = require('./grovePiLcd'),
    StringSensor = require('./string-sensor'),
    StringActuator = require('./string-actuator'),
    grovePiSensors = require('./grovePiSensors');

//log4js.configure(__dirname + '/logger_cfg.json', {
//  reloadSecs: 30,
//  cwd: './log'
//});

var logger = log4js.getLogger('Main');

/**
 * Configuration
 **/
var
JSONRPC_PORT = 50800,     // JSON-RPC server port
STATUS_INTERVAL = 60000,  // status report interval; less than gateway one.

setNotiTable = {}, // notification is enabled or not for each sensor
clientConnection,  // the connection(assuming only one) from client.
device0Id = '0',   // device address, any string allowed for url

/* 
 * Devices and its sensors info to be used for discovery response.
 *
 * Note: Sensor id can be any url unreserved characters on condition 
 *       that it is uniq across your devices under the gateway.
 */
DEVICES = [{
  deviceAddress: device0Id,
  sensors: [
    // Analog
    {
      id: [device0Id, 'sound'].join('-'),
      type: 'noise',
      name: 'sound',
      notification: false
    },
    {
      id: [device0Id, 'light'].join('-'),
      type: 'light',
      name: 'light',
      notification: false
    },
    {
      id: [device0Id, 'rotary'].join('-'),
      type: 'rotaryAngle',
      name: 'rotary',
      notification: false
    },
//    {
//      id: [device0Id, 'vib'].join('-'),
//      type: 'vibration',
//      name: 'vibration',
//      notification: false
//    },
    // Digital
    { // actuator
      id: [device0Id, 'buzz'].join('-'),
      type: 'buzzer',
      name: 'buzzer',
      notification: false
    },
    { // actuator
      id: [device0Id, 'led'].join('-'),
      type: 'led',
      name: 'led',
      notification: false
    },
    { // actuator
      id: [device0Id, 'relay'].join('-'),
      type: 'powerSwitch',
      name: 'relay',
      notification: false
    },
    { //event
      id: [device0Id, 'button'].join('-'),
      type: 'onoff',
      name: 'button',
      notification: true
    },
    { //event
      id: [device0Id, 'ultra'].join('-'),
      type: 'onoff',
      name: 'ultrasonic',
      notification: true
    },
    { //series
      id: [device0Id, 'temp'].join('-'),
      type: 'temperature',
      name: 'temperature',
      notification: false
    },
    { //series
      id: [device0Id, 'humi'].join('-'),
      type: 'humidity',
      name: 'humidity',
      notification: false
    },
    {
      id: [device0Id, 'string'].join('-'),
      type: 'string',
      name: 'stringSensor',
      notification: false
    },
    {
      id: [device0Id, 'stringActuator'].join('-'),
      type: 'stringActuator',
      name: 'stringActuator',
      notification: false
    },
    { // actuator
      id: [device0Id, 'lcd'].join('-'),
      type: 'lcd',
      name: 'lcd',
      notification: false
    }
  ]
}];

var sensorNames = [];
var grovePiLcd = new Lcd();
var stringSensor = new StringSensor();
var stringActuator = new StringActuator();

// util function: find target sensor from DEVICES
function getSensorInfo(cond) {
  var found;
  _.each(DEVICES, function(device) {
    var sensor = _.find(device.sensors, cond);
    found = sensor;

    if (found) {
      return false;
    }
  });
  return found || {};
}

/**
 * JSON-RPC server setup 
 *
 */
//JSON-RPC service functions: get/set/setNotification
var Sensor = {
  set: function (id, cmd, options, result) { 
    logger.info('[set actuator] id=%s cmd=%s options=%j', id, cmd, options);
    var target = getSensorInfo({id: id});

    if (target.name === 'lcd') {
      grovePiLcd.doCommand(target.name, cmd, options);
    } else if (target.name === 'stringActuator') {
      stringActuator.doCommand(target.name, cmd, options);
    } else {
      grovePiSensors.doCommand(target.name, cmd, options);
    }

    if (target.name === 'relay') {
      result(null, 'ok');
    } else {
      result(null, 'success');
    }
  },

  setNotification: function (id, result) { 
    if (!setNotiTable[id]) {
      setNotiTable[id] = true;
    }
    result(null, 'success');
  },

  get: function (id, result) {
    var target = getSensorInfo({id: id});
    var sensorData;

    if (target.name === 'lcd') {
      sensorData = grovePiLcd.getData(target.name);
    } 
    else if (target.name === 'stringActuator') {
      sensorData = stringActuator.getValue(target.name);
    }
    else if (target.name === 'stringSensor') {
      sensorData = stringSensor.getValueSync();
    }
    else {
      sensorData = grovePiSensors.getData(target.name);
    }
    return result(null, {value: sensorData && sensorData.value, status: (sensorData && sensorData.status) || 'err'});
  }
};

// create JSON-RPC server
var server = jsonrpc.createServer(function (client/*, remote*/) {
  clientConnection = client;
  logger.warn('New client connection');
});
// Handling client connection error
server.on('clientError', function(err, conn) {
  logger.error('Connection closed');
  if (clientConnection === conn) {
    clientConnection = null;
    _.each(setNotiTable, function (v, k) {
      setNotiTable[k] = false;
    });
  }
});
// Exposing JSON-RPC services
server.expose('discover', function discover(result) { 
  logger.info('discovering', JSON.stringify(DEVICES));
  return result(null, DEVICES);
});
server.expose('sensor', Sensor);
// Start listening JSON-RPC server
server.listen(JSONRPC_PORT, function () {
  logger.info('listening port=%d', JSONRPC_PORT);
});

/*
 * GrovePi board setup
 */
// On Arduino board ready, handles sensors data and status from board event.
grovePiSensors.on('ready', function() {
  logger.info('ready');

  //set listener for sensor data notification from the board
  grovePiSensors.on('event', function(name, value) {
    var target = getSensorInfo({name: name});
    if (!clientConnection || !(setNotiTable[target.id])) {
      return; //skip if no client or no notification set.
    }

    clientConnection.send({method: 'sensor.notification',
      params: [target.id, {value: value}] });
  });

  //notify sensor status periodically.
  setInterval(function() {
    _.each(DEVICES, function(device) {
      _.each(device.sensors, function (target) {
        if (!clientConnection || !(setNotiTable[target.id])) {
          return; //skip if no client or no notification set.
        }
        var sensorData = grovePiSensors.getStatus(target.name);
        //notify sensor status
        clientConnection.send({method: 'sensor.notification',
          params: [target.id, {status: sensorData.status}] });
      });
    });
  }, STATUS_INTERVAL);
});

_.each(DEVICES, function(device) {
  sensorNames = _.union(sensorNames, _.pluck(device.sensors, 'name'));
});

grovePiSensors.init(sensorNames);
