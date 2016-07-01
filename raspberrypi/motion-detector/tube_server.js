var jsonrpc = require('jsonrpc-tcp'),
    _ = require('lodash'),
    log4js = require('log4js'),
    logger = log4js.getLogger('TUBE_SERVER');

var TUBE_PORT = 50800;
var tubeServer = exports;

function sensorObjectGet(deviceAddress, sensorName) {
  var sensorObject;
  _.forEach(tubeServer.devices[deviceAddress].sensors, function (sensor) {
    if (sensor.name == sensorName) {
      sensorObject = sensor;
      return false;
    }
  });
  return sensorObject;
}

function discover (tubeCallback) {
  logger.info('discover');
  return tubeCallback(null, tubeServer.devices);
}

var sensor = {
  get: function (sensorId, tubeCallback) {
    logger.debug('request sensor value', sensorId);

    if (!tubeServer.cbSensing) {
      logger.error('cbSensing is null');
      return tubeCallback && tubeCallback(new Error('can`t sensing'));
    }

    var deviceAddress = sensorId.split('-')[0];
    var sensorName = sensorId.split('-')[1];

    tubeServer.cbSensing(deviceAddress, sensorName, function (err, value) {
      if (err) {
        logger.error(err);
        return tubeCallback(new Error('can`t get sensor value'));
      }

      logger.debug('value:%d %s', value, sensorId);
      return tubeCallback(null, {value: value, status: 'on'});
    });
  },

  set: function (sensorId, cmd, options, tubeCallback) {
    logger.debug('request actuating', sensorId);

    if (!tubeServer.cbActuating) {
      logger.error('cbActuating is null');
      return tubeCallback && tubeCallback(new Error('can`t cbActuating'));
    }

    var deviceAddress = sensorId.split('-')[0];
    var sensorName = sensorId.split('-')[1];
    tubeServer.cbActuating(deviceAddress, sensorName, cmd, options, function (err, result) {
      if (err) {
        logger.error(err);
        return tubeCallback(new Error('can`t get actuating'));
      }

      return tubeCallback(null, result);
    });
  },

  setNotification: function (sensorId, tubeCallback) {
    logger.info('setNotification %s', sensorId);

    if (tubeServer.eventSensorStatusMonitor) {
      var deviceAddress = sensorId.split('-')[0];
      var sensorName = sensorId.split('-')[1];
      var sensor = sensorObjectGet(deviceAddress, sensorName);
      if (!sensor.notification) {
        logger.error('%s is not event sensor', sensorId);
        return tubeCallback(new Error('Not Event Sensor'));
      }

      tubeServer.eventSensorStatusMonitorList.push(sensor);
      return tubeCallback(null);
    }

    var deviceAddress = sensorId.split('-')[0];
    var sensorName = sensorId.split('-')[1];
    var sensor = sensorObjectGet(deviceAddress, sensorName);
    if (!sensor.notification) {
      logger.error('%s is not event sensor', sensorId);
      return tubeCallback(new Error('Not Event Sensor'));
    }
    tubeServer.eventSensorStatusMonitorList = [];
    tubeServer.eventSensorStatusMonitorList.push(sensor);

    tubeServer.eventSensorStatusMonitor = setInterval(function () {
      if (!tubeServer.client) {
        return;
      }

      _.forEach(tubeServer.eventSensorStatusMonitorList, function (sensor) {
        if (!sensor.notification) {
          return;
        }

        tubeServer.cbStatus(deviceAddress, sensor.name, function (status) {
          tubeServer.client.send({method: 'sensor.notification',
            params: [sensor.id, {status: status}] 
          });
        });
      });
    }, 60000);

    return tubeCallback(null);
  },
}

tubeServer.init = function (deviceList, cbSensing, cbActuating, cbStatus) {
  function _sensorIdInit(devices) {
    _.forEach(devices, function (device) {
      _.forEach(device.sensors, function (sensor) {
        sensor.id = [device.deviceAddress, sensor.name].join('-');
      });
    });
  }
  logger.info('tubeServer.init');
  //logger.info(deviceList);

  if (!deviceList || !cbSensing) {
    logger.error('deviceList or cbSensing is NULL');
    return;
  }

  this.devices = deviceList;
  this.cbSensing = cbSensing;
  this.cbStatus = cbStatus;
  this.cbActuating = cbActuating;

  _sensorIdInit(this.devices);

  var server = jsonrpc.createServer(function (client/*, remote*/) {
    logger.info('client connected');

    tubeServer.client = client;
  }.bind(this));

  server.on('clientError', function (err, conn) {
    logger.error('clinetError');

    clearInterval(tubeServer.eventSensorStatusMonitor);
    tubeServer.eventSensorStatusMonitor = null;
  }.bind(this));

  server.expose('discover', discover);
  server.expose('sensor', sensor);

  server.listen(TUBE_PORT, function () {
    logger.info('listening port %d', TUBE_PORT);
  });
}

tubeServer.sendValue = function (deviceAddress, name, value) {
  if (!tubeServer.client) {
    logger.error('client is not connected');
    return -1;
  }

  var sensor = sensorObjectGet(deviceAddress, name);
  if (!sensor) {
    logger.error('unknown name(%s)', name);
    return -1;
  }

  this.client.send({method: 'sensor.notification',
    params: [sensor.id, {value: value}] 
  });
}

////////////////////////////////////////////////////////////////////////////
function deviceList() {
  return [
  {
    deviceAddress: 0,
    deviceModelId: 'PowerOutlet',
    sensors:[{
      name: 'POWER',
      type: 'power',
      notification: false,
    }, {
      name: 'WATTAGE',
      type: 'wattage',
      notification: false,
    }, {
      name: 'CURRENT',
      type: 'current',
      notification: false,
    }]
  },
  {
    deviceAddress: 1,
    deviceModelId: 'ctSubmeter',
    sensors: [{
      name: 'VOLTAGE',
      type: 'voltage',
      notification: false,
    }, {
      name: 'WATTAGE',
      type: 'wattage',
      notification: false,
    }]
  }, 
  {
    deviceAddress: 2,
    deviceModelId: 'lightSwitch',
    sensors: [{
      name: 'ONOFF',
      type: 'onoff',
      notification: true,
    }, {
      name: 'WATTAGE',
      type: 'wattage',
      notification: false,
    }]
  }, 
  {
    deviceAddress: 3,
    deviceModelId: 'motionDetector',
    sensors: [{
      name: 'ONOFF',
      type: 'onoff',
      notification: true,
    }]
  }, 
  {
    deviceAddress: 4,
    deviceModelId: 'tempHumiMonitor',
    sensors: [{
      name: 'HUMIDITY',
      type: 'humidity',
      notification: true,
    }, {
      name: 'TEMPERATURE',
      type: 'temperature',
      notification: true,
    }]
  }, 
  {
    deviceAddress: 5,
    deviceModelId: 'doorLock',
    sensors: [{
      name: 'ONOFF',
      type: 'onoff',
      notification: true,
    }]
  }
  ]
}

if (require.main === module) {
  function cbSensing () {
  }

  function cbActuating () {
  }

  function cbStatus () {
  }

  tubeServer.init(deviceList(), cbSensing, cbActuating, cbStatus);
  /*
  sensor.get('0-CO2',function (err, value) {
  console.log(err)
  console.log(value)
  });
  */
}
