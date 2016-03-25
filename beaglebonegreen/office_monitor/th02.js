var async = require('async');
var I2c = require('i2c');
var locks = require('locks');

var Lpf = require('./lpf');

var DEVICE = '/dev/i2c-1';
var ADDRESS = 0x40;
var TH02_REG_STATUS = 0x00;
var TH02_REG_DATA_H = 0x01;
var TH02_REG_DATA_L = 0x02;
var TH02_REG_CONFIG = 0x03;
var TH02_REG_ID = 0x11;
var TH02_STATUS_RDY_MASK = 0x01;

var TH02_CMD_MEASURE_HUMI = 0x01;
var TH02_CMD_MEASURE_TEMP = 0x11;


function Th02() {
  this.i2c = new I2c(ADDRESS, {device: DEVICE});
  this.lpfTemperature = new Lpf(0.2);
  this.mutex = locks.createMutex();
  this.lpfHumidity = new Lpf(0.2);
};

Th02.prototype.statusSync = function () {
  return 'on';
};

Th02.prototype.getTemperature = function (cb) {
  var self = this;

  async.waterfall([
    function (done) {
      self.mutex.lock(function () {
        return done();
        });
    },
    function (done) {
      self.i2c.writeBytes(TH02_REG_CONFIG, [TH02_CMD_MEASURE_TEMP], function (err) {
        if (err) {
          console.log('i2c write failed. reg:%x cmd:%x', TH02_REG_CONFIG, TH02_CMD_MEASURE_TEMP);
        }

        return done (err);
      });
    },
    function (done) {
      var timer = setInterval(function () {
        self.i2c.readBytes(TH02_REG_STATUS, 1, function (err, res) {
          if (err) {
            clearInterval(timer);
            console.log('readBytes failed. reg:%x', TH02_REG_STATUS);
            return done(err);
          }
          if (!(res & TH02_STATUS_RDY_MASK)) {
            clearInterval(timer);
            return done(err);
          }
        });
      }, 1000);
    },
    function (done) {
      self.i2c.readBytes(TH02_REG_DATA_H, 2, function (err, res) {
        if (err) {
            console.log('readBytes failed. reg:%x', TH02_REG_DATA_H);
            return done(err);
        }

        var rawTemperature = (res[0] << 8) | (res[1]);
        rawTemperature >>= 2;
        rawTemperature = (parseFloat(rawTemperature) / 32.0) - 50.0;
        rawTemperature = self.lpfTemperature.filtering(rawTemperature);
        console.log(rawTemperature);
        return done(null, rawTemperature.toFixed(1));
      });
    }],
    function (err, temperature) {
      self.mutex.unlock();
      if (err) {
        console.log('getTemperature err');
        cb && cb(err);
        return;
      }

      cb && cb(null, temperature);
    }
  );
};

Th02.prototype.getHumidity = function (cb) {
  var self = this;

  async.waterfall([
    function (done) {
      self.mutex.lock(function () {
        return done();
        });
    },
    function (done) {
      self.i2c.writeBytes(TH02_REG_CONFIG, [TH02_CMD_MEASURE_HUMI], function (err) {
        if (err) {
          console.log('i2c write failed. reg:%x cmd:%x', TH02_REG_CONFIG, TH02_CMD_MEASURE_HUMI);
        }

        return done (err);
      });
    },
    function (done) {
      var timer = setInterval(function () {
        self.i2c.readBytes(TH02_REG_STATUS, 1, function (err, res) {
          if (err) {
            clearInterval(timer);
            console.log('readBytes failed. reg:%x', TH02_REG_STATUS);
            return done(err);
          }
          if (!(res & TH02_STATUS_RDY_MASK)) {
            clearInterval(timer);
            return done(err);
          }
        });
      }, 1000);
    },
    function (done) {
      self.i2c.readBytes(TH02_REG_DATA_H, 2, function (err, res) {
        if (err) {
            console.log('readBytes failed. reg:%x', TH02_REG_DATA_H);
            return done(err);
        }

        var rawHumidity = (res[0] << 8) | (res[1]);
        rawHumidity >>= 4;
        rawHumidity = (parseFloat(rawHumidity) / 16.0) - 24.0;
        rawHumidity = self.lpfHumidity.filtering(rawHumidity);
        console.log(rawHumidity);
        return done(null, rawHumidity.toFixed(1));
      });
    }],
    function (err, humidity) {
      self.mutex.unlock();
      if (err) {
        console.log('getHumidity err');
        cb && cb(err);
        return;
      }

      cb && cb(null, humidity);
    }
  );
};

module.exports = Th02;

/*
if (require.main === module) {
  var th02 = new Th02();
  var th03 = new Th02();
  th02.getTemperature(function (err, t) {console.log(t)});
  th02.getHumidity(function (err, t) {console.log(t)});
  th03.getTemperature(function (err, t) {console.log(t)});
  th03.getHumidity(function (err, t) {console.log(t)});
}

*/
