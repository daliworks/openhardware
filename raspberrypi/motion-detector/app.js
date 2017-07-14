'use strict';

var log4js = require('log4js'),
    _ = require('lodash');

var Pir = require('./pir'),
    //Led = require('./led'),
    tubeServer = require('./tube_server');

//var led = new Led(23);
var pir = new Pir(27);

var devices = [{
    deviceAddress: 0,
    deviceModelId: 'jsonrpcFullV1.0',
    sensors:[{
      name: 'PIR',
      type: 'motion',
      notification: true
    }
    /*
    {
      name: 'LED',
      type: 'led'
    }*/]
  }
];

var logger;

log4js.configure(__dirname + '/logger_cfg.json', { reloadSecs: 30, cwd: 'log' });
logger = log4js.getLogger('DEVICEAGENT');


function actuating(deviceAddress, name, cmd, options, cb) {
  function _callback(err) {
    if (err) {
      logger.error(name + ' ' + cmd + ' actuating failed');
      logger.error(err);
      return cb && cb(new Error('actuating failed'));
    }

    return cb && cb(null, options || 'ok');
  }

  /*
  switch (cmd) {
  case 'on':
    return led.on(options.duration, _callback);
  case 'blink':
    return led.blink();
  case 'off':
    return led.off(_callback);
  default:
    return cb && cb(new Error('This command is not support'));
  }
  */
}

function sensing(deviceAddress, name, cb) {
  if (deviceAddress != 0) {
    logger.error('Invalid deviceAddress');
    return cb && cb(new Error('Invalid deviceAddress'));
  }

  if (name === 'PIR') {
    return cb && cb(null, pir.readSync());
  }

  return cb && cb(new Error('Unknown sensor name'));
}

function sensorStatus(deviceAddress, name, cb) {
  cb && cb('on');
}

function deviceAgentInit() {
  logger.info('deviceAgentInit');
  tubeServer.init(devices, sensing, actuating, sensorStatus);
  pir.watch(function (err, value) {
    if (err) {
      logger.error('PIR watching error' + err);
      return;
    }

    tubeServer.sendValue(0, 'PIR', value);
  });
};

deviceAgentInit();
