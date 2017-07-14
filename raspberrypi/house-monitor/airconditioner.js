'use strict';

var exec = require('child_process').exec,
    log4js = require('log4js'),
    locks = require('locks');

var mutex = locks.createMutex();

var targetTemperature = -1;
var targetFanSpeed = -1;
var airconditionStatus = 'OFF';
var logger;

log4js.configure(__dirname + '/logger_cfg.json', { reloadSecs: 30, cwd: 'log' });
logger = log4js.getLogger('AirConditioner');

function irSend(params, cb) {
  if (params.indexOf('NONE') >= 0) {
    return cb && cb(new Error('Invalid params ' + params));
  }

  var cmd = 'irsend SEND_ONCE LGE_6711A20015N ' + params;

  mutex.lock(function () {
    exec(cmd, function (err, stdout, stderr) {
      mutex.unlock();
      if (err) {
        return cb && cb(err);
      }

      console.log(targetTemperature);
      console.log(targetFanSpeed);
      return cb && cb(null);
    });
  });
}

function fanSpeedString() {
  switch (targetFanSpeed) {
    case -1:
      return 'NONE';
    case 0:
      return 'LOW';
    case 1:
      return 'MID';
    case 2:
      return 'HIGH';
    default:
      logger.error('Invalid targetFanSpeed %d', targetFanSpeed);
      return 'unknown';
  }
}

function getTargetTemperature(cb) {
  cb && cb(null, targetTemperature);
}

function getTargetFanSpeed(cb) {
  cb && cb(null, fanSpeedString(targetFanSpeed));
}

function setTemperature(temperature, cb) {
  if (temperature < 18 || temperature > 30) {
    return cb && cb(new Error('Setting value is out of range'));
  }

  on(function (err) {
    if (err) {
      return cb && cb (new Error('on failed'));
    }

    targetTemperature = temperature;
    var params = fanSpeedString(targetFanSpeed) + '_' + targetTemperature;

    console.log(params);
    irSend(params, cb);
  });
}

function temperatureUp(cb) {
  if (airconditionStatus === 'OFF' || targetTemperature >= 30) {
    return cb && cb(null);
  }

  return setTemperature(targetTemperature + 1, cb);
}

function temperatureDown(cb) {
  if (airconditionStatus === 'OFF' || targetTemperature <= 18) {
    return cb && cb(null);
  }

  return setTemperature(targetTemperature - 1, cb);
}

function fanSpeedUp(cb) {
  if (airconditionStatus === 'OFF' || targetFanSpeed >= 2) {
    targetFanSpeed = 2;
    return cb && cb(null);
  }

  on(function (err) {
    if (err) {
      return cb && cb (new Error('on failed'));
    }

    var params = fanSpeedString(++targetFanSpeed) + '_' + targetTemperature;

    console.log(params);
    irSend(params, cb);
  });
}

function fanSpeedDown(cb) {
  if (airconditionStatus === 'OFF' || targetFanSpeed <= 0) {
    return cb && cb(null);
  }

  on(function (err) {
    if (err) {
      return cb && cb (new Error('on failed'));
    }

    var params = fanSpeedString(--targetFanSpeed) + '_' + targetTemperature;

    console.log(params);
    irSend(params, cb);
  });
}

function on(cb) {
  airconditionStatus = 'ON';

  targetTemperature = 18;
  targetFanSpeed = 2;

  var params = 'UN-JEON/JEONG-JI_' + 18;
  irSend(params, cb);
}

function off(cb) {
  airconditionStatus = 'OFF';

  var param = 'UN-JEON/JEONG-JI_OFF';
  targetTemperature = -1;
  targetFanSpeed = -1;
  irSend(param, cb);
}

module.exports.on = on;
module.exports.off = off;
module.exports.fanSpeedUp = fanSpeedUp;
module.exports.fanSpeedDown = fanSpeedDown;
module.exports.getTargetFanSpeed = getTargetFanSpeed;
module.exports.temperatureUp = temperatureUp;
module.exports.temperatureDown = temperatureDown;
module.exports.setTemperature = setTemperature;
module.exports.getTargetTemperature = getTargetTemperature;
module.exports.getMaximumTemperature = 30;
module.exports.getMinimumTemperature = 18;
