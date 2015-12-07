'use strict'

var log4js = require('log4js'),
    _ = require('lodash');

var spawnQueue = require('./spawnQueue');

var logger = log4js.getLogger('ACCELEROMETER');
var NR_ROW = 11,
    NR_COLUMN = 11;

function Oled(pySourceDir) {
  if (_.isNull(pySourceDir) || _.isUndefined(pySourceDir)) {
    pySourceDir = process.env.PWD + '/GrovePi/Software/Python/';
  }
  this.pyArgv1 = pySourceDir + '/grove_oled.py';

  var MAX_SPAWNING = 10;
  this.spawnQueue = new spawnQueue(MAX_SPAWNING);

  var initialized = (function init() {
    this.spawnQueue.push('python', [this.pyArgv1, 'init'], function (err, result) {
      if (err) {
        logger.error('initialize failed');
        return;
      }

      logger.info('oled initialized');
    });
  }.bind(this))();
}

Oled.prototype.statusSync = function () {
  return 'on';
};

Oled.prototype.print = function (str, x, y, cb) {
  if (_.isNull(str) || _.isUndefined(str)) {
    if (cb) {
      process.nextTick(function () {
        cb(new Error('string is %s', str));
      });
    }
    return;
  }

  if (x > NR_ROW || x < 0 || _.isNull(x) || _.isUndefined(x))
    x = 0;
  if (y > NR_COLUMN || y < 0 || _.isNull(y) || _.isUndefined(y))
    y = 0;

  this.spawnQueue.push('python', [this.pyArgv1, 'print', str, x, y],
    function (err, result) {
      if (err) {
        cb && cb(new Error('print failed. str:%s x:%d y:%d', str, x, y));
        return;
      }

      logger.info('atuating success.str:%s x:%d y:%d', str, x, y);
      cb && cb(null, {str: str, x: x, y: y});
    });
};

Oled.prototype.clear = function (y, cb) {
  var result;

  var spawnArgs = [this.pyArgv1, 'clear'];

  if (y === -1 || _.isNull(y) || _.isUndefined(y)) {
  }
  else {
    if (y > NR_COLUMN)
      y =0;
    spawnArgs.push(y);
  }

  console.log('clear args');
  console.log(spawnArgs);

  this.spawnQueue.push('python', spawnArgs, function (err, result) {
    if (err) {
        cb && cb(new Error('clear failed'));
        return;
    }

    logger.info('atuating success.clear');
    cb && cb(null);
  });
};

Oled.prototype.cleanup = function () {
  this.spawnQueue.drain();
}

module.exports = Oled;

/* FOR TEST 
if (require.main === module) {
  var oled = new Oled();
  oled.print('1111111111', 0, 0);
  oled.print('2222222222', 0, 1);
  oled.print('3333333333', 0, 2);
  oled.print('4444444444', 0, 3);
  oled.print('5555555555', 0, 4);
  oled.clear(null, 0);
}
*/

