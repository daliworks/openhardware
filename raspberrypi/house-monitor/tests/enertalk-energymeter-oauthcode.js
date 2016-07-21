var chai = require('chai'),
    sinon = require('sinon'),
    request = require('request'),
    _ = require('lodash');

var assert = chai.assert;

describe('[desc] oauth-code actuator', function () {
  var deviceAgent = require('../app');
  var name;
  var deviceAddress;
  var cmd;
  var options;

  beforeEach(function () {
    name = 'EnergyMeter-OauthCode';
    deviceAddress = '0';
    cmd = 'send';
    options = {text: 'asdfasdfadsfasasdfasd'};
  });

  afterEach(function () {
  });

  it('Pass null code -> return false', function () {
    options = {};

    assert.equal(false, deviceAgent.enertalkEnergyMeterOuathCodeUpdate(deviceAddress, name, cmd, options, null));
  });

  it('Pass null code -> callback call with error', function (done) {
    options = {};
    deviceAgent.enertalkEnergyMeterOuathCodeUpdate(deviceAddress, name, cmd, options, function (err) {
      assert.equal('Error: No oauth code', err);
      done();
    });
  });

  it('Pass invalid code -> callback call with error', function (done) {
    deviceAgent.enertalkEnergyMeterOuathCodeUpdate(deviceAddress, name, cmd, options, function (err) {
      assert.equal('Error: actuating failed', err);
      done();
    });
  });


  describe('Pass valid code -> callback call with options', function() {
    var fakeAccessToken = 'a';
    var fakeRefreshToken = 'a';
    var fakeExpires_in = 60 * 60 * 60;

    beforeEach(function () {
      sinon
        .stub(request, 'post')
        .yields(null, {
          statusCode: 200,
          body: JSON.stringify({
            access_token: fakeAccessToken,
            refresh_token: fakeRefreshToken,
            expires_in: fakeExpires_in
          })
        });
    });

    afterEach(function () {
      request.post.restore();
    });

    it('', function (done) {
      deviceAgent.enertalkEnergyMeterOuathCodeUpdate(deviceAddress, name, cmd, options, function (err, result) {
        if (err) {
          console.log(err);
        }
        assert.equal(options, result);
        done();
      });
    });


  });
});
  
