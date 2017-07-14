'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    locks = require('locks'),
    log4js = require('log4js'),
    _ = require('lodash');

var tubeServer = require('./tube_server'),
    Oled = require('./oled'),
    Th02 = require('./th02');

var th02 = new Th02();
var oled = new Oled();
var mutex = locks.createMutex();
var logger;

var deviceAgent ={};
deviceAgent.sensors = [
  {
    name: 'Temperature',
    type: 'temperature',
    getValue: th02.getTemperature.bind(th02),
    eventSensor:false,
  }, {
    name: 'Humidity',
    type: 'humidity',
    getValue: th02.getHumidity.bind(th02),
    eventSensor:false,
  }, {
    name: 'oled(12x12)',
    type: 'lcd',
    //actuating: _actuatingOled
  }
];

log4js.configure(__dirname + '/logger_cfg.json', { reloadSecs: 30, cwd: 'log' });
logger = log4js.getLogger('DA');

function discover(cb) {
  logger.debug('request discover');
  return cb && cb(deviceAgent.sensors);
}

function sensing(name, cb) {
  console.log('sensing ' + name);

  logger.debug('request sensing(%s)', name);

  var sensor = _.find(deviceAgent.sensors, {'name': name});
  if (!sensor) {
    logger.error('invalid sensor name');
    return cb && cb(new Error('invalid sensor name'));
  }

  mutex.lock(function () {
    sensor.getValue(function (err, sensorValue) {
      mutex.unlock();
      return cb && cb(err, sensorValue);
    });
  });
}

function _oledActuation(cmd, options, cb) {
  function _callback(err, value) {
    if (err) {
      logger.error('oled actuating failed');
      return cb && cb(new Error('oled actuating failed'));
    }

    return cb && cb(null, 'success');
  }

  switch (cmd) {
  case 'print':
    oled.print(options.text, options.row, options.column, _callback);
    break;
  case 'clear':
    oled.clear(options.row, _callback);
    break;
  default:
    if (cb) {
      process.nextTick(function () {
        cb(new Error('unknown cmd(%s)', cmd));
      });
    }
    break;
  }
}

function actuating(name, cmd, options, cb) {
  var sensor = _.find(deviceAgent.sensors, {'name': name});
  if (!sensor) {
    logger.error('invalid sensor name');
    return cb && cb(new Error('invalid sensor name'));
  }

  if (sensor.name === 'oled(12x12)') {
    return _oledActuation(cmd, options, cb);
  }

  return cb && cb(new Error('Unknown sensor'));
}

function sensorStatus(name, cb) {
  logger.debug('request %s status', name);
  return cb && cb('on');
}

deviceAgent.init = function () {
  tubeServer.init(deviceAgent.sensors, discover, sensing, actuating, sensorStatus);
};

deviceAgent.init();
