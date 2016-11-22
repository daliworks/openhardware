'use strict';

var exec = require('child_process').exec,
    log4js = require('log4js'),
    _ = require('lodash');

var logger = log4js.getLogger('BUTTON');

function Button(pySourceDir) {
  if (_.isNull(pySourceDir) || _.isUndefined(pySourceDir)) {
    pySourceDir = process.env.PWD + '/3.Wooden_Lamp_BBG';
  }

  this.cmd = 'python ' + pySourceDir + '/grove_i2c_adc.py';
  this.triggerTimer = null;
}

Button.prototype.statusSync = function () {
  return 'on';
};

Button.prototype.getValue = function (cb) {
  var self = this;
  var ON_THRESHOLD = 2000;

  exec(this.cmd, function (err, stdout, stderr) {
    if (err) {
      logger.error('exec(%s) failed', self.cmd);
      logger.error(err);

      cb && cb(new Error('EXEC FAILED'));
      return;
    }

    var value = stdout;
    if (value > ON_THRESHOLD) {
      value = 1;
    } else {
      value = 0;
    }

    cb && cb(null, value);
    return;
  });
};

Button.prototype.trigger = function (cb) {
  var self = this;

  if (!_.isNull(this.triggerTimer)) {
    return;
  }

  this.triggerTimer = setInterval(function () {
    self.getValue(function (err, value) {
      if (err) {
        return;
      }

      if (self.lastValue !== value) {
        self.lastValue = value;

        cb && cb(null, value);
      }
    });
  }, 1000);
};

Button.prototype.cleanup = function () {
  if (_.isNull(this.triggerTimer)) {
    return;
  }

  clearInterval(this.triggerTimer);
};

if (require.main === module) {
  var button = new Button('./3.Wooden_Lamp_BBG');

  button.getValue();
}

module.exports = Button;
