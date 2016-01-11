'use strict';

var five = require('johnny-five');

function Relay(pin) {
  this.relay = new five.Relay({pin: pin});
  this.turnOffTimer = null;
}

Relay.prototype.turnOn = function (durationMs, cb) {
  var self = this;

  if (this.turnOffTimer) {
    clearInterval(this.turnOffTimer);
  }

  this.relay.on();

  if (durationMs) {
    this.turnOffTimer = setTimeout(function () {
      self.relay.off();
    }, durationMs);
  }

  if (cb) {
    process.nextTick(function () {
      cb(null, 'on');
    });
  }
};

Relay.prototype.turnOff = function (cb) {
  if (this.turnOffTimer) {
    clearInterval(this.turnOffTimer);
  }

  this.relay.off();

  if (cb) {
    process.nextTick(function () {
      cb(null, 'off');
    });
  }
};

Relay.prototype.statusSync = function () {
  return 'on';
};

module.exports = Relay;
