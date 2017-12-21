'use strict';

var request = require('request'),
    config = require('config');

module.exports = (function () {
  var enertalkURL = 'https://api.encoredtech.com/1.2/devices/';

  function getDataFromEnertalk(accessToken, url, cb) {
    function _errorHandling(err) {
      console.log('[ERR] GET failed');
      console.log('[ERR] URL :' + url);
      console.log('[ERR] ' + err);
      console.log(err.stack);
      return cb && cb (err);
    }

    request.get(
      {
        url:  url,
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
      },
      function parsingResponse(err, res) {
        if (err) {
          return _errorHandling(new Error('request result is error'));
        }

        var body;
        try {
          body = JSON.parse(res.body);
        } 
        catch (e) {
          return _errorHandling(new Error('JSON.parse failed. body:' + body));
        }

        if (res.statusCode !== 200) {
          return _errorHandling(new Error('Invalid statusCode ' + res.statusCode +  ' ' + body.error));
        }

        return cb && cb(null, body);
      }
    );
  }

  function getDeviceId(accessToken, cb) {
    var url = enertalkURL + 'list';

    getDataFromEnertalk(accessToken, url, function parseDeviceId(err, body) {
      if (err) {
        console.log('[ERR] getDataFromEnertalk failed');
        return cb && cb(err);
      }

      config.deviceId = body[0].uuid;
      return cb && cb(null, config.deviceId);
    });
  }

  function getPower(accessToken, cb) {
    var url;

    function _getPower() {
      getDataFromEnertalk(accessToken, url, function parseActivePower(err, body) {
        if (err) {
          console.log('[ERR] getDataFromEnertalk failed');
          return cb && cb(err);
        }

        return cb && cb(null, parseFloat(body.activePower/1000).toFixed(2));
      });
    }

    if (!config.deviceId) {
      getDeviceId(accessToken, function (err/*, deviceId*/) {
        if (err) {
          console.log('[ERR] getDeviceId failed');
          return cb && cb(new Error('getDeviceId failed'));
        }

        url = enertalkURL + config.deviceId + '/realtimeUsage';
        return _getPower();
      });
    } else {
      url = enertalkURL + config.deviceId + '/realtimeUsage';
      return _getPower();
    }
  }

  return {
    getPower: getPower,
  };
})();

if (require.main === module) {
  var oauth = require('./oauth');
  module.exports.getPower(oauth.getAccessToken(), function (err, power) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(power);
  });
}
