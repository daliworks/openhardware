var jsonrpc = require('jsonrpc-tcp'),
    util = require('util'),
    events = require('events'),
    log4js = require('log4js'),
    _ = require('lodash');

var logger = log4js.getLogger('DA');

var TUBE_PORT = 50800;
var DEVICE_ID = 0;

var tubeServer = exports;

function discover (tubeCallback) {
  logger.debug('discover');

  var devices = [];
  devices[DEVICE_ID] = {deviceAddress: DEVICE_ID};
  devices[DEVICE_ID]['sensors'] = [];

  _.forEach(tubeServer.sensors, function (sensor) {
    sensor.id = [DEVICE_ID, sensor.name].join('-');
    devices[DEVICE_ID]['sensors'].push({ 
      id: sensor.id, 
      type: sensor.type,
      name: sensor.name, 
      notification: false,
    });

    logger.debug('discovered. name:%s type:%s', sensor.name, sensor.type);
    });

    return tubeCallback(null, devices);
}

var sensor = {
  get: function (sensorId, tubeCallback) {
    logger.debug('request sensor value', sensorId);

    if (!tubeServer.cbSensing) {
      logger.error('cbSensing is null');
      return tubeCallback && tubeCallback(new Error('can`t sensing'));
    }

    var sensor = _.find(tubeServer.sensors, {'id': sensorId});
    if (!sensor) {
      logger.error('invalid sensor id', sensorId);
      return tubeCallback && tubeCallback(new Error('invalied sensor id'));
    }

    tubeServer.cbSensing(sensor.name, function (err, value) {
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

    var sensor = _.find(tubeServer.sensors, {'id': sensorId});
    if (!sensor) {
      logger.error('invalid sensor id', sensorId);
      return tubeCallback && tubeCallback(new Error('invalied sensor id'));
    }

    tubeServer.cbActuating(sensor.name, cmd, options, function (err, result) {
      if (err) {
        logger.error(err);
        return tubeCallback(new Error('can`t get actuating'));
      }

      return tubeCallback(null, result);
    });
  },

  setNotification: function (sensorId, tubeCallback) {
    logger.info('setNotification ' + sensorId);

    if (tubeServer.eventSensorStatusMonitor)
      return tubeCallback(null);

    tubeServer.eventSensorStatusMonitor = setInterval(function () {
      if (!tubeServer.client) {
        return;
      }

      _.forEach(tubeServer.sensors, function (sensor) {
        if (!sensor.eventSensor) {
          return;
        }

        tubeServer.cbStatus(sensor.name, function (status) {
          tubeServer.client.send({method: 'sensor.notification',
            params: [sensor.id, {status: status}] 
          });
        });
      });
    }, 6000);

    return tubeCallback(null);
  },
}

tubeServer.init = function (sensorList, cbDiscover, cbSensing, cbActuating, cbStatus) {
  function _sensorIdInit(sensors) {
    _.forEach(sensors, function (sensor) {
      sensor.id = [DEVICE_ID, sensor.name].join('-');
    });
  }

  if (!sensorList || !cbDiscover || !cbSensing) {
    logger.error('sensorList or cbSensing is NULL');
    return;
  }

  this.sensors = sensorList;
  this.cbSensing = cbSensing;
  this.cbDiscover = cbDiscover;
  this.cbStatus = cbStatus;
  this.cbActuating = cbActuating;

  _sensorIdInit(this.sensors);

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

tubeServer.sendValue = function (name, value) {
  if (!tubeServer.client) {
    logger.error('client is not connected');
    return -1;
  }

  var sensor = _.find(tubeServer.sensors, {'name': name});
  if (!sensor) {
    logger.error('unknown name(%s)', name);
    return -1;
  }

  this.client.send({method: 'sensor.notification',
    params: [sensor.id, {value: value}] 
  });
}

/////////////////////

function sensorList() {
  return [{
    name: 'CO2',
    type: 'co2',
    eventSensor: false,
    getValue: function (cb) {cb(null, 1)},
    getStatus: function () {return 'on'},
  }, {
    name: 'OnOff',
    type: 'onoff',
    eventSensor: true,
    getValue: function (cb) {cb(null, 1)},
    getStatus: function () {return 'on'},
  }, {
    name: 'SOIL_MOISTURE',
    type: 'soilMoisture',
    eventSensor: false,
    getValue: function (cb) {cb(null, 1)},
    getStatus: function () {return 'on'},
  }];
}

if (require.main === module) {
  tubeServer.init(sensorList);
  sensor.get('0-CO2',function (err, value) {
  console.log(err)
  console.log(value)
  });
}
