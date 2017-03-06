'use strict';

function StringSensor() {
}

StringSensor.prototype.getValue = function (cb) {
  var userDefinedString = new Date().toString(); //TODO FIXME YOUR STRING

  console.log(userDefinedString);
  return cb && cb(null, userDefinedString);
};

StringSensor.prototype.statusSync = function () {
  return 'on';
};

module.exports = StringSensor;
