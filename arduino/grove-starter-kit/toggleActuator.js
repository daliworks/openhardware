'use strict';

var five = require('johnny-five');

function ToggleActuator(pin) {
  this.toggleActuator = new five.Pin({pin: pin});
}

ToggleActuator.prototype.turnOn = function (cb) {
  this.toggleActuator.high();

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

ToggleActuator.prototype.turnOff = function (cb) {
  this.toggleActuator.low();

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

module.exports = ToggleActuator;
