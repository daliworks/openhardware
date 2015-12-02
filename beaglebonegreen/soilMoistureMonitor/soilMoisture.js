'use strict'

var fs = require('fs');

function SoilMoisture(pin) {
  if (!pin) {
    pin = 'AIN0';
  }

  this.soilMoistureValueFile = '/sys/devices/ocp.3/helper.12/' + pin;
}

SoilMoisture.prototype.statusSync = function () {
  return 'on';
};

SoilMoisture.prototype.getValue = function (cb) {
  fs.readFile(this.soilMoistureValueFile, 'utf8', function (err, data) {
    if (err) {
      cb(new Error('SoilMoisture getValue failed. %s', err), null);
      return;
    }

    console.log(data);
    cb(null, data);
  });
}

module.exports = SoilMoisture;

if (require.main === module) {
  var s = new SoilMoisture('AIN0');

  s.getValue(function (err, data) {
    console.log(data);
  });
}
