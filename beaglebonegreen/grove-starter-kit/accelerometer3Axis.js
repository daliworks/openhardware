'use strict';

var exec = require('child_process').exec,
    log4js = require('log4js'),
    _ = require('lodash');

var logger = log4js.getLogger('ACCELEROMETER');
var CHANGED_THRESHOLD = 0.08;

function Accelerometer3Axis(pySourceDir) {
  if (_.isNull(pySourceDir) || _.isUndefined(pySourceDir)) {
    pySourceDir = process.env.PWD + '/3.Wooden_Lamp_BBG';
  }

  this.cmd = 'python ' + pySourceDir + '/adxl345.py';
  this.triggerTimer = null;
  this.lastValue = {x:0, y:0, z:0};
}

Accelerometer3Axis.prototype.statusSync = function () {
  return 'on';
};

Accelerometer3Axis.prototype.getValue = function (cb) {
  var self = this;
  exec(this.cmd, function (err, stdout, stderr) {
    if (err) {
      logger.error('exec(%s) failed', self.cmd);

      cb && cb(new Error('EXEC FAILED'));
      return;
    }

    var value = JSON.parse(stdout);
    cb && cb(null, value);
  });
};

Accelerometer3Axis.prototype.trigger = function (cb) {
  var self = this;

  function IsChanged(newValue, oldValue) {
    function IsInRange(newValue, oldValue, threshold) {
      if (newValue >  oldValue + threshold || newValue < oldValue - threshold) {
        return false;
      } else {
        return true;
      }
    }

    if (!IsInRange(newValue.x, oldValue.x, CHANGED_THRESHOLD)) {
      return true;
    }
    else if (!IsInRange(newValue.y, oldValue.y, CHANGED_THRESHOLD)) {
      return true;
    }
    else if (!IsInRange(newValue.z, oldValue.z, CHANGED_THRESHOLD)) {
      return true;
    }

    return false;
  }

  if (!_.isNull(this.triggerTimer)) {
    return;
  }

  this.triggerTimer = setInterval(function () {
    self.getValue(function (err, value) {
      if (err) {
        return;
      }

      if (IsChanged(value, self.lastValue)) {
        self.lastValue = value;

        cb && cb(null, value);
      }
    });
  }, 1000);
};

Accelerometer3Axis.prototype.cleanup = function () {
  if (_.isNull(this.triggerTimer)) {
    return;
  }

  clearInterval(this.triggerTimer);
};

if (require.main === module) {
  var accelator = new Accelerometer3Axis('./3.Wooden_Lamp_BBG');
  accelator.getValue();
}

module.exports = Accelerometer3Axis;
