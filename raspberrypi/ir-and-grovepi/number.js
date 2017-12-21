'use strict';

function Number() {
}

Number.prototype.getValueSync = function () {
  var numberValue = new Date().getTime();//TODO FIXME YOUR NUMBER VALUE

  return {
   value: numberValue, 
   status: 'on'
  };
};

Number.prototype.statusSync = function () {
  return 'on';
};

module.exports = Number;
