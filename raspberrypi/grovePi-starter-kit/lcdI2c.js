'use strict';

var _ = require('lodash'),
    I2c = require('i2c'),
    util = require('util'),
    events = require('events'),
    tick = global.setImmediate || process.nextTick,
    async = require('async');

var BACKLIGHT_I2C_ADDR=0x62,
    LCD_I2C_ADDR=0x3e;

function Lcd (i2cDevice, column, row) {
  var i2c ;

  if (_.isUndefined(i2cDevice) || _.isNull(i2cDevice)) {
    console.log('Force to use /dev/i2c-1');
    i2c = '/dev/i2c-1';
  } else {
    i2c = i2cDevice;
  }

  this.blI2c = new I2c(BACKLIGHT_I2C_ADDR, {device: i2c, debug: false});
  this.lcdI2c = new I2c(LCD_I2C_ADDR, {device: i2c, debug: false});

  this.nrRow = row;
  this.nrColumn = column;

  this._init();
}

util.inherits(Lcd, events.EventEmitter);
module.exports = Lcd;

Lcd.prototype.setCursor = function (column, row) {
  if (column >= this.nrColumn) {
    console.log('comlumn(%d) is bigger than number of columns', column);
    console.log('force to use 0');
    column = 0;
  }

  if (row >= this.nrRow) {
    console.log('row(%d) is bigger than number of columns', row);
    console.log('force to use 0');
    row = 0;
  }

  /* jshint bitwise: false */
  this.lcdI2c.writeBytes(0x80, [0x80 | (column + 0x40 * row)], function (err) {});
  /* jshint bitwise: true */
};

Lcd.prototype.print = function (val, cb) {
  var index, displayFills;

  val += '';

  displayFills = Math.floor(val.length / 80);
  index = displayFills > 1 ? (displayFills - 1) * 80 : 0;

  this._printChar(val, index, cb);
};

Lcd.prototype.clear = function (cb) {
  this.clearing = 1;
  this.lcdI2c.writeBytes(0x80, [0x01], function (err) {
    this.emit('clear');
    this.clearing = 0;
    return cb && cb();
  }.bind(this));
};

Lcd.prototype.close = function () {
  this.clear();
};

Lcd.prototype.setBg = function (r, g, b) {
  var self = this;

  async.series([
    function (done) {
      self.blI2c.writeBytes(0x0, [0], function (err) {
        setTimeout(function () { done(); }, 5);
      });
    },
    function (done) {
      self.blI2c.writeBytes(0x1, [0], function (err) {
        setTimeout(function () { done(); }, 5);
      });
    },
    function (done) {
      self.blI2c.writeBytes(0x8, [0xaa], function (err) {
        setTimeout(function () { done(); }, 5);
      });
    },
    function (done) {
      self.blI2c.writeBytes(0x4, [r], function (err) {
        setTimeout(function () { done(); }, 5);
      });
    },
    function (done) {
      self.blI2c.writeBytes(0x3, [g], function (err) {
        setTimeout(function () { done(); }, 5);
      });
    },
    function (done) {
      self.blI2c.writeBytes(0x2, [b], function (err) {
        setTimeout(function () { done(); }, 5);
      });
    }],
    function (err, result) {});
};

Lcd.prototype._printChar = function (str, index, cb) {
  var self = this;

    if (index >= str.length || this.clearing) {
      if (cb) {
        cb(null, str);
      }

      return self.emit('printed', str);
    }

    try {
      self.lcdI2c.writeBytes(0x40, [str.charCodeAt(index)], function (err) {
        self._printChar(str, index + 1, cb);
      } );
    } catch(e) {
      if (cb) {
        cb(e);
      }

      return self.emit('error', e);
    }
};

Lcd.prototype._init = function () {
  var self = this;

  async.series([
    function (done) {
      self.lcdI2c.writeBytes(0x80, [0x3c], function (err) {
        setTimeout(function () {
          return done();
        }, 1);
      });
    },
    function (done) {
      self.lcdI2c.writeBytes(0x80, [0x0c], function (err) {
        setTimeout(function () {
          return done();
        }, 1);
      });
    },
    function (done) {
      self.lcdI2c.writeBytes(0x80, [0x01], function (err) {
        setTimeout(function () {
          return done();
        }, 2);
      });
    },
    function (done) {
      self.lcdI2c.writeBytes(0x80, [0x06], function (err) {
        return done();
      });
    }], function (err, result) {
      if (err) {
        console.log('lcd initialize failed err:', err);
      }
      self.emit('ready');
    });
};
