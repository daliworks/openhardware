'use strict';

var five = require('johnny-five');

function Led(pin) {
  this.led = new five.Led({pin: pin});
  this.turnOffTimer = null;
}

Led.prototype.turnOn = function (durationMs, cb) {
  var self = this;

  if (this.turnOffTimer) {
    clearInterval(this.turnOffTimer);
  }

  this.led.stop();
  this.led.on();

  if (durationMs) {
    this.turnOffTimer = setTimeout(function () {
      self.led.stop();
      self.led.off();
    }, durationMs);
  }

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

Led.prototype.blink = function (durationMs, intervalMs, cb) {
  var self = this;

  if (this.turnOffTimer) {
    clearInterval(this.turnOffTimer);
  }

  if (!intervalMs) {
    intervalMs = 100;
  }

  this.led.blink(intervalMs);

  if (durationMs) {
    this.turnOffTimer = setTimeout(function () {
      self.led.stop();
      self.led.off();
    }, durationMs);
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
