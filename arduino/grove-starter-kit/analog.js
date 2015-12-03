'use strict'

var five = require('johnny-five');

function Analog(pin, min, max) {
  this.analog = new five.Sensor({pin: pin});
  this.analog.scale(min, max);
}

Analog.prototype.getValue = function (cb) {
  var self = this;

  if (cb) {
    process.nextTick(function () {
      cb(null, self.analog.scaled);
    });
  }
}

Analog.prototype.statusSync = function () {
  return 'on';
};

Analog.prototype.trigger = function (cb) {
  this.analog.on('change', function (err, data) {
    cb && cb(null, data);
  });
};

module.exports = Analog;
