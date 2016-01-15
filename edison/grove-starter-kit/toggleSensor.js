'use strict';

var five = require('johnny-five');

function Toggle(pin) {
  this.toggle = new five.Button(pin);
}

Toggle.prototype.statusSync = function () {
  return 'on';
};

Toggle.prototype.trigger = function (cb) {
  var self = this;

  this.toggle.on('down', function () {
    cb(null, 1);
  });

  this.toggle.on('up', function () {
    cb(null, 0);
  });
};

module.exports = Toggle;
