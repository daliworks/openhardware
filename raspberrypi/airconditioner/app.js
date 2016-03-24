'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    winston = require('winston'),
    _ = require('lodash');

var airconditioner = require('./airconditioner');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({label: 'DEVICE_AGENT'}),
    new (winston.transports.File)({
      label: 'DEVICE_AGENT', 
      filename: 'log/device_agent.log', 
      json: false,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      level: 'debug'}),
  ]
});

var tubeServer = require('./tube_server');

var deviceAgent ={};
deviceAgent.sensors = [
  {
    name: 'Airconditioner',
    type: 'powerSwitch',
    actuating: airconditionerActuating,
  }
];

function airconditionerActuating(cmd, options, cb) {
  function _callback(err) {
    if (err) {
      logger.error('relay actuating failed');
      return cb && cb(new Error('relay actuating failed'));
    }

    return cb && cb(null, options || 'ok');
  }

  switch (cmd) {
    case 'on':
      airconditioner.on(_callback);
      break;
    case 'off':
      airconditioner.off(_callback);
      break;
    default:
      logger.error('unknown cmd', cmd);
      return cb && cb(new Error('unknown cmd'));
  }
}

function discover(cb) {
  logger.debug('request discover');
  cb && cb(deviceAgent.sensors);
}

function actuating(name, cmd, options, cb) {
  logger.debug('request actuating %s', name);

  var sensor = _.find(deviceAgent.sensors, {'name': name});
  if (!sensor) {
    logger.error('invalid sensor name');
    return cb && cb(new Error('invalid sensor name'));
  }

  sensor.actuating(cmd, options, function (err, result) {
    if (err) {
      logger.error('actuating faied');
      return cb && cb(err);
    }

    return cb && cb(null, result);
  });
}

function sensing(name, cb) {
  logger.debug('request sensing(%s)', name);

  var sensor = _.find(deviceAgent.sensors, {'name': name});
  if (!sensor) {
    logger.error('invalid sensor name');
    return cb && cb(new Error('invalid sensor name'));
  }
}

function sensorStatus(name, cb) {
  logger.debug('request %s status', name);
  cb && cb('on');
}

deviceAgent.init = function () {
  tubeServer.init(deviceAgent.sensors, discover, sensing, actuating, sensorStatus);
};

deviceAgent.init();
