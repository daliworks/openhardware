'use strict';

var exec = require('child_process').exec,
    _ = require('lodash'),
    log4js = require('log4js');
var logger;

log4js.configure(__dirname + '/logger_cfg.json', { reloadSecs: 30, cwd: 'log' });
logger = log4js.getLogger('RGBLED');

function ChainableRGBLed(pySourceDir) {
  if (_.isNull(pySourceDir) || _.isUndefined(pySourceDir)) {
    pySourceDir = './3.Wooden_Lamp_BBG';
  }

  this.cmd = 'python ' + pySourceDir + '/grove_chainable_rgb_led.py';
  this.r = 0;
  this.g = 0;
  this.b = 0;
}

ChainableRGBLed.prototype.statusSync = function () {
  return 'on';
};

ChainableRGBLed.prototype.turnOn = function (r, g, b, cb) {
  var cmdWithParameter = this.cmd + ' ' + r + ' ' + g + ' ' + b;

  exec(cmdWithParameter, function (err, stdout, stderr) {
    if (err) {
      logger.error('exec(%s) failed', cmdWithParameter);
      cb && cb(new Error('EXEC FAILED'), r, g, b);
      return;
    }

    logger.info('atuating success');
    logger.info('r:%d g:%d b:%d', r, g, b);

    this.r = r;
    this.g = g;
    this.b = b;

    cb && cb(null, {r:r, g:g, b:b});
  }.bind(this));
};

ChainableRGBLed.prototype.turnOff = function (cb) {
  this.turnOn(0, 0, 0, cb);
};

ChainableRGBLed.prototype.getValue = function (cb) {
  if (cb) {
    process.nextTick(function () {
      cb(null, {r:this.r, g:thisg, b:this.b});
    });
  }

  return;
};

if (require.main === module) {
  var chainableRGBLed = new ChainableRGBLed('./3.Wooden_Lamp_BBG');

  var argv = process.argv.slice(2),
      r = argv[0] || 255;
      g = argv[1] || 255;
      b = argv[2] || 255;

  chainableRGBLed.turnOn(r, g, b);
}

module.exports = ChainableRGBLed;
