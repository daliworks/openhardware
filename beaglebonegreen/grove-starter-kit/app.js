'use strict'

var jsonrpc = require('jsonrpc-tcp'),
    log4js = require('log4js'),
    _ = require('lodash');

var Button = require('./button');
    //ChainableRGBLed = require('./chainableRGBLed');

var logger = log4js.getLogger('T+Embedded');

var JSONRPC_PORT = 50800;
var STATUS_INTERVAL = 60000;  // status report interval; less than gateway one.

function Device(id) {
  this.sensors = [ {
    name: 'button',
    type: 'onoff',
    constructor: Button,
    notification: true
  }/*, {
    name: 'rgbLed',
    type: 'rgbLed',
    constructor: ChainableRGBLed,
  }*/];

  this.id = id;
  this.pushStatus = [];
  this.pushStatusTimer = null;

  this._init();
  this._serverInit();
}

Device.prototype.discovering = function (result) {
  var devices = [];
  var self = this;

  devices[this.id] = {deviceAddess: this.id};
  devices[this.id]["sensors"] = [];

  _.forEach(this.sensors, function (sensor) {
    sensor.id = [self.id, sensor.name].join('-'); //FIXME make function 
    devices[self.id]["sensors"].push(
      { 
        id:sensor.id, 
        type:sensor.type,
        name: sensor.name, 
        notification: sensor.notification
      });
    logger.info('discovered. name:%s type:%s', sensor.name, sensor.type);
  });

  return result(null, devices);
};

function getSensorById(sensors, id) {
  var name = id.substring(id.indexOf('-')+1);
  return _.find(sensors, {'name': name} );
}

var sensing = {
  get: function (id, result) {
    var sensor = getSensorByID(device.sensors, id); //TODO change delete hardcodded
    if (_.isNull(sensor) || _.isUndefined(sensor)) {
      logger.error('getsensorbyid failed. id:' + id);
      return result(null, 'err'); 
    }

    sensor.driver.sensing(function (err, vaule) {
      logger.info('%s value:%s', sensor.name, value);
      return result(null, {value: value, status: 'on'});
    });
  },

  setNotification: function (id, result) {
    var sensor = getSensorById(device.sensors, id);

    if (_.isNull(sensor) || _.isUndefined(sensor)) {
      logger.error("getsensorbyid failed. id:" + id);
      return result(null, 'err'); 
    }

    if (!sensor.notification) {
      logger.error('%s can`t setNotification', sensor.name);
      return result(null, 'err');
    }

    if (_.find(device.pushStatus, {'name': sensor.name})) {
      logger.warn('%s is already notified', sensor.name);
      return result(null);
    }
    device.pushStatus.push(sensor);

    if (!_.isNull(device.pushStatusTimer)) {
      return result(null);
    }

    device.pushStatusTimer = setInterval(function () {
      if (_.isNull(device.client) || _.isUndefined(device.client)) {
        return;
      }

      _.forEach(device.pushStatus, function (sensor) {
        device.client.send({method: 'sensor.notification',
          params: [sensor.id, {status: sensor.driver.status()}] 
        });
      });
    }, STATUS_INTERVAL);

    sensor.driver.trigger();
    sensor.driver.on('data' , function (value) {
      device.client.send({method: 'sensor.notification',
        params: [id, {value: value}] });
    });

    return result(null);
  },

  set: function(id, cmd, options, result) {
    var sensor = getSensorById(device.sensors, id);

    if (!sensor) {
      console.log('unknown sensor');
      result(null, 'err');
    }
    //TODO
  }
}

Device.prototype._init = function () {
  _.forEach(this.sensors, function (sensor) {
    sensor.driver = new sensor.constructor();
  });
}

Device.prototype._serverInit = function () {
  var self = this;
  var server = jsonrpc.createServer(function (client/*, remote*/) {
    logger.info('New client connected');
    self.client = client;
  });

  server.on('clientError', function (err, conn) {
    logger.info('client disconnected');
  });

  server.expose('discover', this.discovering.bind(this));
  server.expose('sensor', sensing);

  server.listen(JSONRPC_PORT, function () {
    logger.info('listening port=%d', JSONRPC_PORT);
  });
}

var device = new Device('0');
