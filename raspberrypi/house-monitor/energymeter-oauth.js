'use strict';

var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    _ = require('lodash'),
    config = require('config'),
    request = require('request');

var enertalkURL = 'https://enertalk-auth.encoredtech.com/token';
var enertalkClientId = 'eW91bmdoeXVuLmpvQGRhbGl3b3Jrcy5uZXRfVGhpbmdwbHVz';
var enertalkClientSecret = 'pg11145x6dt7og8ye7g14282vt3q503a6xb0515';

function postAccessToken(headers, form, cb) {
  function _errorHandling(err) {
    console.log('[ERR] postAccessToken failed');
    console.log('[ERR] URL:' + enertalkURL);
    console.log('[ERR] ' + err);
    console.log(err.stack);
    return cb && cb (err);
  }

  return request.post(
    {
      url: enertalkURL,
      headers: headers,
      form: form,
    },
    function parsingResponse(err, res) {
      if (err) {
        return _errorHandling(new Error('request result is error ' + err));
      }

      var body;
      try {
        body = JSON.parse(res.body);
      } 
      catch (e) {
        return _errorHandling(new Error('JSON.parse failed. body:' + res.body));
      }

      if (res.statusCode != 200) {
        return _errorHandling(new Error('Invalid statusCode ' + res.statusCode +  ' ' + body.error));
      }

      if (!body.access_token || !body.expires_in) {
        return _errorHandling(new Error('Invalid server response'));
      }

      config.accessToken = body.access_token ;
      config.expirationDate = new Date(_.now() + (body.expires_in * 1000));
      if (body.refresh_token) {
        config.refreshToken = body.refresh_token;
      }

      return cb && cb(null, config.accessToken);
    }
  );
}

function refreshAccessToken(cb) {
  if (!config.refreshToken) {
    console.log('[ERR] No refreshToken');
    cb && cb(new Error('No refreshToken'));
    return false;
  }

  var authorizationString = new Buffer(enertalkClientId + ':' + enertalkClientSecret).toString('base64');
  var headers = {
    'Content-Type':'application/json',
    'Authorization':'Basic ' + authorizationString
  };

  var form = {
    'grant_type': "refresh_token",
    'refresh_token': config.refreshToken,
  };

  postAccessToken(headers, form, function (err, accessToken) {
    if (err) {
      console.log('[ERR] postAccessToken failed');
      return cb && cb(err);
    }
    
    reserveRefreshAccessToken(cb);

    return cb && cb(null, accessToken);
  });
}

function reserveRefreshAccessToken(cb) {
    setTimeout(function () {
      refreshAccessToken(cb);
    },
    new Date(config.expirationDate) - new Date());
}

function oauth () {
  var self = this;

  function _refreshAccessTokenCallback(err, accessToken) {
    if (err) {
      console.log('[ERR] refreshAccessToken failed. err:' + err);
      return;
    }
    self.emit('receiveAccessToken', accessToken);
  }

  if (this.accessTokenExpired()) {
    console.log('[ERR] Access token is expired');

    config.accessToken = "";
    config.expirationDate = "";

    if (config.refreshToken) {
      process.nextTick(function () {
        refreshAccessToken(_refreshAccessTokenCallback)}
      );
    }
  }
  else {
        reserveRefreshAccessToken(_refreshAccessTokenCallback);
  }
}

inherits(oauth, EventEmitter);

oauth.prototype.requestAccessToken = function requestAccessToken(authorizationCode, cb) {
  if (!authorizationCode) {
    console.log('[ERR] Invalid authorizationCode');
    cb && cb(new Error('Invalid authorizationCode'));
    return false;
  }

  var headers = {
    'Content-Type': 'application/json'
  };

  var form = {
    client_id: enertalkClientId,
    client_secret: enertalkClientSecret,
    grant_type: 'authorization_code',
    code: authorizationCode,
  };

  return postAccessToken(headers, form, function (err, accessToken) {
    if (err) {
      console.log('[ERR] postAccessToken failed');
      return cb && cb(err);
    }

   this.emit('receiveAccessToken', accessToken);
    return cb && cb(null, accessToken);
  }.bind(this));
}

oauth.prototype.getAccessToken = function getAccessToken() {
  if (this.accessTokenExpired()) {
    return null;
  }

  return config.accessToken;
}

oauth.prototype.accessTokenExpired = function accessTokenExpired() {
  //console.log(config.expirationDate);
  if (!config.expirationDate || (new Date() > config.expirationDate)) {
    return true;
  }

  return false;
}

module.exports = new oauth();
