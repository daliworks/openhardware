var async = require('async'),
    I2c = require('i2c'),
    locks = require('locks');

var Lpf = require('./lpf');

var I2C_DEVICE_NODE = '/dev/i2c-1';

var TH02_REG_STATUS = 0x00;
var TH02_REG_DATA_H = 0x01;
var TH02_REG_DATA_L = 0x02;
var TH02_REG_CONFIG = 0x03;
var TH02_REG_ID = 0x11;
var TH02_STATUS_RDY_MASK = 0x01;
var TH02_CMD_MEASURE_HUMI = 0x01;
var TH02_CMD_MEASURE_TEMP = 0x11;

var th02 = {
  i2c: new I2c(0x40, {device: I2C_DEVICE_NODE}),
  lpfTemperature: new Lpf(0.2),
  lpfHumidity: new Lpf(0.2),
  mutex: locks.createMutex(),
};

function getStatusSync() {
  return 'on';
};

function getTemperature(cb) {

  async.waterfall([
    function mutexLock(done) {
      th02.mutex.lock(function () {
        return done();
        });
    },
    function measureTemperature(done) {
      th02.i2c.writeBytes(TH02_REG_CONFIG, [TH02_CMD_MEASURE_TEMP], function (err) {
        if (err) {
          console.log('i2c write failed. reg:%x cmd:%x', TH02_REG_CONFIG, TH02_CMD_MEASURE_TEMP);
        }

        return done (err);
      });
    },
    function measureWait(done) {
      var timer = setInterval(function () {
        th02.i2c.readBytes(TH02_REG_STATUS, 1, function (err, res) {
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
    function readValue(done) {
      th02.i2c.readBytes(TH02_REG_DATA_H, 3, function (err, res) {
        if (err) {
            console.log('readBytes failed. reg:%x', TH02_REG_DATA_H);
            return done(err);
        }

        var rawTemperature = (res[1] << 8) | (res[2]);
        rawTemperature >>= 2;
        rawTemperature = (parseFloat(rawTemperature) / 32.0) - 50.0;
        rawTemperature = th02.lpfTemperature.filtering(rawTemperature);
        console.log(rawTemperature);
        return done(null, rawTemperature.toFixed(1));
      });
    }],
    function mutexUnlockAndReturn(err, temperature) {
      th02.mutex.unlock();
      if (err) {
        console.log('getTemperature err');
        cb && cb(err);
        return;
      }

      cb && cb(null, temperature);
    }
  );
};

function getHumidity(cb) {
  async.waterfall([
    function mutexLock(done) {
      th02.mutex.lock(function () {
        return done();
        });
    },
    function measureHumidity(done) {
      th02.i2c.writeBytes(TH02_REG_CONFIG, [TH02_CMD_MEASURE_HUMI], function (err) {
        if (err) {
          console.log('i2c write failed. reg:%x cmd:%x', TH02_REG_CONFIG, TH02_CMD_MEASURE_HUMI);
        }

        return done (err);
      });
    },
    function measureWait(done) {
      var timer = setInterval(function () {
        th02.i2c.readBytes(TH02_REG_STATUS, 1, function (err, res) {
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
      }, 100);
    },
    function readValue(done) {
      th02.i2c.readBytes(TH02_REG_DATA_H, 3, function (err, res) {
        if (err) {
            console.log('readBytes failed. reg:%x', TH02_REG_DATA_H);
            return done(err);
        }

        var rawHumidity = (res[1] << 8) | (res[2]);
        rawHumidity >>= 4;
        rawHumidity = (parseFloat(rawHumidity) / 16.0) - 24.0;
        rawHumidity = th02.lpfHumidity.filtering(rawHumidity);
        console.log(rawHumidity);
        return done(null, rawHumidity.toFixed(1));
      });
    }],
    function mutexUnlockAndReturn(err, humidity) {
      th02.mutex.unlock();
      if (err) {
        console.log('getHumidity err');
        cb && cb(err);
        return;
      }

      cb && cb(null, humidity);
    }
  );
};

module.exports.getTemperature = getTemperature;
module.exports.getHumidity = getHumidity;
module.exports.getStatusSync = getStatusSync;
