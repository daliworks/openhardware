'use strict';

var jsonrpc = require('jsonrpc-tcp'),
    log4js = require('log4js'),
    _ = require('lodash'),
    Edison = require('edison-io'),
    five = require('johnny-five');

var ToggleSensor = require('./toggleSensor'),
    Light = require('./light'),
    Analog = require('./analog'),
    Relay = require('./relay'),
    Led = require('./led'),
    ToggleActuator = require('./toggleActuator'),
    Lcd = require('./lcd'),
    Temperature = require('./temperature');

var JSONRPC_PORT = 50800;
var STATUS_INTERVAL = 60000;  // status report interval; less than gateway one.

var logger;

log4js.configure(__dirname + '/logger_cfg.json', { reloadSecs: 30, cwd: 'log' });
logger = log4js.getLogger('T+EMBEDDED');

function _lcdActuating(sensor, cmd, options, cb) {
  function _callback(err, value) {
    if (err) {
      logger.error('lcd actuating failed');
      return cb && cb(new Error('lcd actuating failed'));
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

function _buzzerActuating(sensor, cmd, options, cb) {
  function callback(err, value) {
    if (err) {
      logger.error('buzzer actuating failed');
      return cb && cb(new Error('buzzer actuating failed'));
    }

    return cb && cb(null, 'success');
  }

  switch (cmd) {
  case 'on':
    sensor.driver.turnOn(callback);
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


function _ledActuating(sensor, cmd, options, cb) {
  function callback(err, value) {
    if (err) {
      logger.error('led actuating failed');
      return cb && cb(new Error('led actuating failed'));
    }

    return cb && cb(null, 'success');
  }

  switch (cmd) {
  case 'on':
    sensor.driver.turnOn(options.duration, callback);
    break;
  case 'off':
    sensor.driver.turnOff(callback);
    break;
  case 'blink':
    sensor.driver.blink(options.duration, options.interval, callback);
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

function _relayActuating(sensor, cmd, options, cb) {
  function callback(err, value) {
    if (err) {
      logger.error('relay actuating failed');
      return cb && cb(new Error('relay actuating failed'));
    }

    return cb && cb(null, options || 'ok');
  }

  switch (cmd) {
  case 'on':
    sensor.driver.turnOn(options.duration, callback);
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

function _analogConstructor(sensor) {
  return new Analog(sensor.pin, sensor.min, sensor.max);
}

function Device(id) {
  this.sensors = [{
    name: 'relay',
    type: 'powerSwitch',
    notification: false,
    constructor: Relay,
    actuating: _relayActuating,
    pin: '4'
  }, {
    name: 'Button',
    type: 'onoff',
    notification: true,
    constructor: ToggleSensor,
    pin: 5
  }, {
    name: 'touch',
    type: 'onoff',
    notification: true,
    constructor: ToggleSensor,
    pin: '6'
  }, {
    name: 'light',
    type: 'light',
    notification: false,
    constructor: Light,
    pin: 'A0'
  }, {
    name: 'temperature',
    type: 'temperature',
    notification: false,
    constructor: Temperature,
    pin: 'A1'
  }, {
    name: 'rotaryAngle',
    type: 'rotaryAngle',
    notification: false,
    constructorFunction: _analogConstructor,
    min: 0,
    max: 270,
    pin: 'A2'
  }, {
    name: 'sound',
    type: 'noise',
    notification: false,
    constructorFunction: _analogConstructor,
    min: -100,
    max: 200,
    pin: 'A3'
  }, {
    name: 'led',
    type: 'led',
    constructor: Led,
    actuating: _ledActuating,
    pin: '3'
  }, {
    name: 'buzzer',
    type: 'buzzer',
    notification: false,
    constructor: ToggleActuator,
    actuating: _buzzerActuating,
    pin: '7'
  }, {
    name: 'lcd(16x2)',
    type: 'lcd',
    constructor: Lcd,
    actuating: _lcdActuating,
    pin: 'I2C'
  }
  ];

  this.id = id;
  this.pushStatus = [];
  this.pushStatusTimer = null;

  this._init();
}

function getSensorById(sensors, id) {
  var name = id.substring(id.indexOf('-')+1);
  return _.find(sensors, {'name': name} );
}

Device.prototype.sensing = function () {
  var self = this;

  return {
    get: function (id, result) {
      var sensor = getSensorById(self.sensors, id);
      if (_.isNull(sensor) || _.isUndefined(sensor)) {
        logger.error('getsensorbyid failed. id:' + id);
        return result('err'); 
      }

      sensor.driver.getValue(function (err, value) {
        logger.info('%s value:%s', sensor.name, value); //FIXME
        return result(null, {value: value, status: 'on'});
      });
    },

    setNotification: function (id, result) {
      var sensor = getSensorById(self.sensors, id);
      logger.info('%s setNotification', sensor.name);

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

        logger.info('%s sensor`s event value:%d', sensor.name, value);

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

      logger.info('%s set cmd:%s', sensor.name, cmd);

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
  var self = this;

  this.board = new five.Board({io : new Edison(), repl: false});

  this.board.on('ready', function () {
    _.forEach(self.sensors, function (sensor) {
      if (sensor.constructorFunction) {
        sensor.driver = sensor.constructorFunction(sensor);
      }
      else {
        sensor.driver = new sensor.constructor(sensor.pin);
      }
    });
    self._serverInit();
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
      return sensor.driver.cleanup && sensor.driver.cleanup();
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
