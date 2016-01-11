'use strict';

var five = require('johnny-five');

function Temperature(pin) {
  this.temperature = new five.Temperature({pin: pin, controller: 'GROVE'});
}

Temperature.prototype.getValue = function (cb) {
  var self = this;

  if (cb) {
    process.nextTick(function () {
      cb(null, self.temperature.celsius.toFixed(2));
    });
  }
};

Temperature.prototype.statusSync = function () {
  return 'on';
};

Temperature.prototype.trigger = function (cb) {
  this.temperature.on('change', function (err, data) {
    return cb && cb(null, data.celsius.toFixed(2));
  });
};

module.exports = Temperature;
