'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    log4js = require('log4js'),
    _ = require('lodash');

var Boiler = require('./boiler');

var logger = log4js.getLogger('T+EMBEDDED');

var JSONRPC_PORT = 50800;
var STATUS_INTERVAL = 60000;  // status report interval; less than gateway one.

function boilerActuating(sensor, cmd, options, result) {
  if (cmd === 'on') {
    sensor.driver.turnOn(result);
  }
  else if (cmd === 'off') {
    sensor.driver.turnOff(result);
  }
  else {
    result(new Error('unknown cmd'));
  }  
}

function Device(id) {
  this.sensors = [{
    name: 'B0',
    type: 'powerSwitch',
    gpio: 20,
    constructor: Boiler,
    actuating: boilerActuating
  }];

  this.id = id;
  this.pushStatus = [];
  this.pushStatusTimer = null;

  this._init();
  this._serverInit();
}

function getSensorById(sensors, id) {
  var name = id.substring(id.indexOf('-')+1);
  return _.find(sensors, {'name': name} );
}

Device.prototype.sensing = function () {
  var self = this;

  return {
    get: function (id, result) {
      var sensor = getSensorById(self.sensors, id); //TODO change delete hardcodded
      if (_.isNull(sensor) || _.isUndefined(sensor)) {
        logger.error('getsensorbyid failed. id:' + id);
        return result('err'); 
      }

      sensor.driver.getValue(function (err, value) {
        if (err) {
          return result(err);
        }
        logger.info('%s value:%s', sensor.name, value);
        return result(null, {value: value, status: 'on'});
      });
    },

    setNotification: function (id, result) {
      var sensor = getSensorById(self.sensors, id);

      if (_.isNull(sensor) || _.isUndefined(sensor)) {
        logger.error('getsensorbyid failed. id:' + id);
        return result('err'); 
      }

      if (!sensor.notification) {
        logger.error('%s can`t setNotification', sensor.name);
        return result('err');
      }

      if (_.find(self.pushStatus, {'name': sensor.name})) {
        logger.warn('%s is already notified', sensor.name);
        return result(null);
      }

      self.pushStatus.push(sensor);

      sensor.driver.trigger(function (err, value) {
        if (_.isNull(self.client)) {
          return;
        }

        self.client.send({method: 'sensor.notification',
          params: [id, {value: value}] });
      });

      if (self.pushStatusTimer) {
        return result(null);
      }

      self.pushStatusTimer = setInterval(function () {
        if ( _.isNull(self.client) || _.isUndefined(self.client)) {
          return;
        }

       self.pushStatus.forEach(function (sensor) {
         self.client.send({method: 'sensor.notification',
           params: [sensor.id, {status: sensor.driver.statusSync()}] 
         });
       });
      }, STATUS_INTERVAL);

      return result(null);
    },

    set: function(id, cmd, options, result) {
      var sensor = getSensorById(self.sensors, id);

      if (_.isNull(sensor) || _.isUndefined(sensor)) {
        logger.error('getsensorbyid failed. id:' + id);
        result('err');
      }

      sensor.actuating(sensor, cmd, options, result);
    }
  };
};

Device.prototype.discovering = function (result) {
  var devices = [];
  var self = this;

  devices[this.id] = {deviceAddess: this.id};
  devices[this.id]['sensors'] = [];

  _.forEach(this.sensors, function (sensor) {
    sensor.id = [self.id, sensor.name].join('-'); //FIXME make function 
    devices[self.id]['sensors'].push(
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

Device.prototype._init = function () {
  _.forEach(this.sensors, function (sensor) {
    sensor.driver = new sensor.constructor(sensor.gpio);
  });
};

Device.prototype._serverInit = function () {
  var self = this;
  var server = jsonrpc.createServer(function (client/*, remote*/) {
    logger.info('New client connected');
    self.client = client;
  });

  server.on('clientError', function (err, conn) {
    self.client = null;

    if (self.pushStatusTimer) {
      clearInterval(self.pushStatusTimer);
    }

    self.pushStatus.splice(0, self.pushStatus.length);

    _.forEach(self.sensors, function (sensor) {
      if (sensor.driver.cleanup) {
        sensor.driver.cleanup();
      }
    });

    logger.info('client disconnected');
  });

  server.expose('discover', this.discovering.bind(this));
  server.expose('sensor', this.sensing.bind(this)());

  server.listen(JSONRPC_PORT, function () {
    logger.info('listening port=%d', JSONRPC_PORT);
  });
};

var device = new Device('0');
