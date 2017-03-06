'use strict';

var request = require('request');

function dropboxImageDirectUrlParser(url, cb) {
  request({
    method: 'GET',
    uri: url,
    followRedirect: false
  }, function (error, response, body) {
    if (error) {
      return cb && cb(error);
    }

    var imageUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');

    return cb && cb(null, imageUrl);
  });
}

module.exports = dropboxImageDirectUrlParser;

if (require.main === module) {
  var url = 'https://db.tt/cmDO24Ju';
  dropboxImageDirectUrlParser(url, function (err, url) {console.log(url);});
}
