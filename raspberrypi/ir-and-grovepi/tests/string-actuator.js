var chai = require('chai'),
    sinon = require('sinon');

var assert = chai.assert;

describe('NEW INSTANCE', function () {
  it('new StringActuator return object', function () {
    var StringActuator = require('../string-actuator');
    var s = new StringActuator();
    assert.equal('object', typeof s);
  });
})

describe('Do Commands', function () {
  var StringActuator = require('../string-actuator');
  var s = new StringActuator();

  var name = 'stringActuator';
  var cmd = 'print';
  var options = {test: 'Your Text'};

  it('pass cmd and options return success', function () {
    s.doCommand(name, cmd, options);
  });

});


