'use strict';

var log4js = require('log4js'),
    GPIO = require('onoff').Gpio;
    
var logger;

log4js.configure(__dirname + '/logger_cfg.json', { reloadSecs: 30, cwd: 'log' });
logger = log4js.getLogger('PIR');

function Pir(gpio) {
  this.gpio = new GPIO(gpio, 'in', 'both');
}

Pir.prototype.watch = function (cb) {
  this.gpio.watch(function (err, value) {
    if (err) {
      logger.error(err);
      return cb(err);
    }

    if (value) {
      logger.info('Detected');
    }
    else {
      logger.info('Undetected');
    }
    return cb(null, value);
  });
};

Pir.prototype.readSync = function () {
  return this.gpio.readSync();
};

module.exports = Pir;

/*

if (require.main === module) {
  var pir = new Pir(27);
  pir.watch(function (err, value) {
    if (err) {
      logger.errror(err);
      return
    }
    console.log(value);
  });
}
*/
