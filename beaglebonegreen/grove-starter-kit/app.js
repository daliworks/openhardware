'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    log4js = require('log4js'),
    _ = require('lodash');

var Button = require('./button'),
    ChainableRGBLed = require('./chainableRGBLed'),
    Accelerometer3Axis = require('./accelerometer3Axis'),
    StringSensor = require('./stringSensor'),
    Oled = require('./oled');

var logger = log4js.getLogger('T+EMBEDDED');

var JSONRPC_PORT = 50800;
var STATUS_INTERVAL = 60000;  // status report interval; less than gateway one.

function _actuatingOled(sensor, cmd, options, cb) {
  function _callback(err, value) {
    if (err) {
      logger.error('oled actuating failed');
      return cb && cb(new Error('oled actuating failed'));
    }

    return cb && cb(null, 'success');
  }

  switch (cmd) {
  case 'print':
    sensor.driver.print(options.text, options.row, options.column, _callback);
    break;
  case 'clear':
    sensor.driver.clear(options.row, _callback);
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

function _actuatingChainableRGBLed(sensor, cmd, options, cb) {
  function callback(err, value) {
    if (err) {
      logger.error('chainableRGBLed actuating failed');
      return cb && cb(new Error('chainableRGBLed actuating failed'));
    }

    return cb && cb(null, 'success');
  }

  switch (cmd) {
  case 'on':
    sensor.driver.turnOn(options.red, options.green, options.blue, callback);
    break;
  case 'off':
    sensor.driver.turnOff(callback);
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

function Device(id) {
  this.sensors = [{
    name: 'button',
    type: 'onoff',
    notification: true,
    constructor: Button
  }, {
    name: 'rgbLed',
    type: 'rgbLed',
    constructor: ChainableRGBLed,
    actuating: _actuatingChainableRGBLed
  }, {
    name: 'accelerometer',
    type: 'accelerometer',
    notification: true,
    constructor: Accelerometer3Axis
  }, {
    name: 'stringSensor',
    type: 'string',
    constructor: StringSensor,
  }, {
    name: 'oled(12x12)',
    type: 'lcd',
    constructor: Oled,
    actuating: _actuatingOled
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

    logger.info('setNoti pushStatus:', id, self.pushStatus);
      if (_.find(self.pushStatus, {'name': sensor.name})) {
        logger.warn('%s is already notified', sensor.name);
        return result(null);
      }

      self.pushStatus.push(sensor);

    logger.info('setNoti 1');
      sensor.driver.trigger(function (err, value) {
        if (_.isNull(self.client)) {
    logger.info('setNoti 1-1');
          return;
        }

        self.client.send({method: 'sensor.notification',
          params: [id, {value: value}] });
      });

    logger.info('setNoti 2');
      if (self.pushStatusTimer) {
    logger.info('setNoti 2-1');
        return result(null);
      }

    logger.info('setNoti 3');
      self.pushStatusTimer = setInterval(function () {
        if ( _.isNull(self.client) || _.isUndefined(self.client)) {
    logger.info('setNoti 3-1');
          return;
        }

       self.pushStatus.forEach(function (sensor) {
         self.client.send({method: 'sensor.notification',
           params: [sensor.id, {status: sensor.driver.statusSync()}] 
         });
       });
      }, STATUS_INTERVAL);
    logger.info('setNoti 4');

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

  devices[this.id] = {deviceAddress: this.id};
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
    sensor.driver = new sensor.constructor();
  });
};

Device.prototype._serverInit = function () {
  var self = this;
  var server = jsonrpc.createServer(function (client/*, remote*/) {
    logger.info('New client connected');
    self.client = client;
  });

  server.on('clientError', function (err, conn) {
    logger.error('client disconnected');
    self.client = null;

    if (self.pushStatusTimer) {
      clearInterval(self.pushStatusTimer);
      self.pushStatusTimer = null;
    }

    self.pushStatus.splice(0, self.pushStatus.length);
    logger.info('disconn pushStatus:', self.pushStatus);

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
