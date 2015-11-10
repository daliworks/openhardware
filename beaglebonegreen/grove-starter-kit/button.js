'use strict'

var exec = require('child_process').exec,
    events = require('events'),
    log4js = require('log4js'),
    _ = require('lodash'),
    util = require('util');

var logger = log4js.getLogger('BUTTON');

var ON_THRESHOLD = 2000;

function Button(pySourceDir) {
  if (_.isNull(pySourceDir) || _.isUndefined(pySourceDir)) {
    pySourceDir = './3.Wooden_Lamp_BBG';
  }

  this.cmd = 'python ' + pySourceDir + '/grove_i2c_adc.py';
  this.triggerTimer = null;
}

util.inherits(Button, events.EventEmitter);

Button.prototype.status = function () {
  return 'on';
};

Button.prototype.sensing = function (cb) {
  var self = this;
  exec(this.cmd, function (err, stdout, stderr) {
    if (err) {
      logger.error('[Button] exec(%s) failed', self.cmd);
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

Button.prototype.trigger = function () {
  var self = this;

  if (!_.isNull(this.triggerTimer)) {
    return;
  }

  var flag;
  //TODO FIXME USE ASYNC
  this.triggerTimer = setInterval(function () {
    self.sensing(function (err, value) {
      if (err) {
        return;
      }

      if (self.lastValue !== value) {
        self.lastValue = value;
        self.emit('data', value);
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

  button.sensing();
}

module.exports = Button;
