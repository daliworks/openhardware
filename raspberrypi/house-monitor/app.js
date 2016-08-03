'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    logger = require('log4js').getLogger('deviceAgent'),
    EventEmitter = require('events').EventEmitter,
    _ = require('lodash');

var tubeServer = require('./tube_server'),
    th02 = require('./th02'),
    airconditioner = require('./airconditioner'),
    enertalkOauth = require('./energymeter-oauth'),
    enertalkEnergyMeter = require('./energymeter');

var deviceAgent = [{
  deviceAddress: 0,
  deviceModelId: "jsonrpcFullV1.0",
  sensors:[
    /* Enertalk Dependent
    {
      name: 'Power',
      type: 'electricPower',
      getValue: enertalkGetPower
    },
    {
      name: 'EnergyMeter-OauthCode',
      type: 'stringActuator'
    },
    */
    {
      name: 'Indoor-Temperature',
      type: 'temperature',
      getValue: th02.getTemperature
    }, 
    {
      name: 'Indoor-Humidity',
      type: 'humidity',
      getValue: th02.getHumidity
    },
    {
      name: 'AIR_CONDITIONER',
      type: 'airConditioner'
    },
    {
      name: 'Airconditioner-Target-Temperature',
      type: 'temperature',
      getValue: airconditioner.getTargetTemperature
    }, 
    {
      name: 'Airconditioner-Target-FanSpeed',
      type: 'string',
      getValue: airconditioner.getTargetFanSpeed
    }]
}];

function enertalkGetPower(cb) {

  function _enertalkGerPower(accessToken) {
    enertalkEnergyMeter.getPower(accessToken, function (err, power) {
      if (err) {
        if (cb) {
          cb(err);
        }
        return false;
      }

      if (cb) {
        cb(null, power);
      }
      return true;
    });
  }

  if (enertalkOauth.accessTokenExpired()) {
    if (EventEmitter.listenerCount(enertalkOauth, 'receiveAccessToken') > 0 && cb) {
      return process.nextTick(function () {
        cb(new Error('Enertalk AcessToken Invalid'));
      });
    }

    enertalkOauth.once('receiveAccessToken', function (accessToken) {
      _enertalkGerPower(accessToken);
    });
  }
  else {
    _enertalkGerPower(enertalkOauth.getAccessToken());
  }
}

function sensing(deviceAddress, name, cb) {
  logger.debug('request sensing(%s)', name);

  var sensor = _.find(deviceAgent[deviceAddress].sensors, {'name': name});
  if (!sensor) {
    logger.error('invalid sensor name');
    return cb && cb(new Error('invalid sensor name'));
  }

  sensor.getValue(cb);
}

function airControllerActuator(deviceAddress, name, cmd, options, cb) {
  function _callback(err) {
    if (err) {
      logger.error(name + ' ' + cmd + ' actuating failed');
      logger.error(err);
      return cb && cb(new Error('actuating failed'));
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
    case 'tempUp':
      airconditioner.temperatureUp(_callback);
      break;
    case 'tempDown':
      airconditioner.temperatureDown(_callback);
      break;
    case 'fanSpeedUp':
      airconditioner.fanSpeedUp(_callback);
      break;
    case 'fanSpeedDown':
      airconditioner.fanSpeedDown(_callback);
      break;
    default:
      return cb && cb(new Error('This command is not support'));
  }
}

function enertalkEnergyMeterOuathCodeUpdate(deviceAddress, name, cmd, options, cb) {
  function _callback(err) {
    if (err) {
      logger.error(name + ' ' + cmd + ' actuating failed');
      logger.error(err);
      return cb && cb(new Error('actuating failed'));
    }

    return cb && cb(null, options || 'ok');
  }

  console.log(name, cmd, options);

  var oauthCode = options.text;
  if (!oauthCode) {
    if (cb)
      process.nextTick(function () {
        cb(new Error('No oauth code'));
      });

    return false;
  }

  enertalkOauth.requestAccessToken(oauthCode, _callback);
}

function actuating(deviceAddress, name, cmd, options, cb) {
  if (name === 'AIR_CONDITIONER') {
    return airControllerActuator(deviceAddress, name, cmd, options, cb);
  }

  else if (name === 'EnergyMeter-OauthCode') {
    return enertalkEnergyMeterOuathCodeUpdate(deviceAddress, name, cmd, options, cb);
  }
}

function sensorStatus(deviceAddress, name, cb) {
  logger.debug('request %s status', deviceAddress, name);
  return cb && cb('on');
}

function deviceAgentInit() {
  logger.info('deviceAgentInit');
  tubeServer.init(deviceAgent, sensing, actuating, sensorStatus);
}

deviceAgentInit();

//TODO FIXME
module.exports.enertalkEnergyMeterOuathCodeUpdate = enertalkEnergyMeterOuathCodeUpdate;

