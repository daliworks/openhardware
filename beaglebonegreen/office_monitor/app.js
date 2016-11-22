'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    winston = require('winston'),
    _ = require('lodash');

var tubeServer = require('./tube_server'),
    Co2 = require('./grove_co2'), Th02 = require('./th02');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({label: 'DEVICE_AGENT'}),
    new (winston.transports.File)({
      label: 'DEVICE_AGENT', 
      filename: 'log/device_agent.log', 
      json: false,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      level: 'debug'})
  ]
});

var th02 = new Th02();
var co2 = new Co2();

var deviceAgent ={};
deviceAgent.sensors = [
  {
    name: 'Co2',
    type: 'co2',
    getValue: co2.getCo2.bind(co2)
  }, {
    name: 'Temperature',
    type: 'temperature',
    getValue: th02.getTemperature.bind(th02)
  }, {
    name: 'Humidity',
    type: 'humidity',
    getValue: th02.getHumidity.bind(th02)
  }
];

function discover(cb) {
  logger.debug('request discover');
  cb && cb(deviceAgent.sensors);
}

function sensing(name, cb) {
  logger.debug('request sensing(%s)', name);

  var sensor = _.find(deviceAgent.sensors, {'name': name});
  if (!sensor) {
    logger.error('invalid sensor name');
    return cb && cb(new Error('invalid sensor name'));
  }

  sensor.getValue(cb);
}

function sensorStatus(name, cb) {
  logger.debug('request %s status', name);
  cb && cb('on');
}

deviceAgent.init = function () {
  tubeServer.init(deviceAgent.sensors, discover, sensing, null, sensorStatus);
};

deviceAgent.init();
