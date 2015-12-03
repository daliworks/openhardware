'use strict'

var five = require('johnny-five');

function Led(pin) {
  this.led = new five.Led({pin: pin});
  this.turnOffTimer = null;
}

Led.prototype.turnOn = function (duration_ms, cb) {
  var self = this;

  if (this.turnOffTimer) {
    clearInterval(this.turnOffTimer)
  }

  this.led.stop();
  this.led.on();

  if (duration_ms) {
    this.turnOffTimer = setTimeout(function () {
      self.led.stop();
      self.led.off();
    }, duration_ms);
  }

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

Led.prototype.blink = function (duration_ms, interval_ms, cb) {
  var self = this;

  if (this.turnOffTimer) {
    clearInterval(this.turnOffTimer)
  }

  if (!interval_ms) {
    interval_ms = 100;
  }

  this.led.blink(interval_ms);

  if (duration_ms) {
    this.turnOffTimer = setTimeout(function () {
      self.led.stop();
      self.led.off();
    }, duration_ms);
  }

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

Led.prototype.turnOff = function (cb) {
  this.led.stop();
  this.led.off();

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

Led.prototype.statusSync = function () {
  return 'on';
};

module.exports = Led;
