'use strict';

var five = require('johnny-five');

function Light(pin) {
  this.light = new five.Light({pin: pin});
}

Light.prototype.getValue = function (cb) {
  var self = this;

  if (cb) {
    process.nextTick(function () {
      cb(null, self.light.value);
    });
  }
};

Light.prototype.statusSync = function () {
  return 'on';
};

Light.prototype.trigger = function (cb) {
  this.light.on('change', function (err, data) {
    return cb && cb(null, data);
  });
};

module.exports = Light;
