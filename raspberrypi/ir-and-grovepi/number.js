'use strict'

function Number() {
};

String.prototype.getValueSync = function () {
  var numberValue = new Date().getTime();//TODO FIXME YOUR NUMBER VALUE

  return {
   value: numberValue, 
   status: 'on'
  };
}

String.prototype.statusSync = function () {
  return 'on';
}

module.exports = String;



