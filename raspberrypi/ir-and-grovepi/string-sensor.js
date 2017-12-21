'use strict';

function String() {
}

String.prototype.getValueSync = function () {
  var userDefinedString = new Date().toString(); //TODO FIXME YOUR STRING

  return {
   value: userDefinedString, 
   status: 'on'
  };
};

String.prototype.statusSync = function () {
  return 'on';
};

module.exports = String;
