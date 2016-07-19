'use strict'

function String() {
};

String.prototype.getValue = function (cb) {
  var userDefinedString = new Date().toString(); //TODO FIXME YOUR STRING

  console.log(userDefinedString);
  cb && cb(null, userDefinedString);
}

String.prototype.statusSync = function () {
  return 'on';
}

module.exports = String;


