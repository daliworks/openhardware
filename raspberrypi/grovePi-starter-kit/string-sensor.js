'use strict';

function StringSensor() {
}

StringSensor.prototype.getValueSync = function () {
  var userDefinedString = new Date().toString(); //TODO FIXME YOUR STRING

  return {
   value: userDefinedString, 
   status: 'on'
  };
};

StringSensor.prototype.statusSync = function () {
  return 'on';
};

module.exports = StringSensor;
