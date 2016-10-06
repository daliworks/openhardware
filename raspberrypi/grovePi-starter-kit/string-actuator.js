'use strict';

function StringActuator() {
}

StringActuator.prototype.doCommand = function(name, cmd, options) {
  if (options.text) {
    console.log('YOUR TEXT IS');
    console.log(options.text);
  }
};

StringActuator.prototype.getValue = function (name) {
  return {status: 'on'};
};

module.exports = StringActuator;
