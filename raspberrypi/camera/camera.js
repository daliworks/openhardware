'use strict';

var async = require('async'),
    locks = require('locks'),
    exec = require('child_process').exec;

var dropboxUrlParser = require('./dropbox-driect-url');

function Camera(pin) {
  this.mutex = locks.createMutex();
}

Camera.prototype.statusSync = function () {
  return 'on';
};

Camera.prototype.snapPicture = function (cb) {
  var self = this;
  var url;
  var filename = new Date().toISOString() + '.jpg';
  var filenameLocaldir = __dirname + '/' + filename;

  async.waterfall([
    function (done) {
      self.mutex.lock(function () {
        return done();
        });
    }, function (done) {
      exec('raspistill -vf -hf -o ' + filenameLocaldir, function (err, stdout, stderr) {
        return done();
      });
    }, function (done) {
      exec('dropbox_uploader.sh upload ' + filenameLocaldir + ' /', function (err, stdout, stderr) {
        return done();
      });
    }, 
    function (done) {
      exec('dropbox_uploader.sh share ' + filename, function (err, stdout, stderr) {
        var urlPattern = new RegExp('https:\\/\\/.*', 'g');
        url = stdout.match(urlPattern);

        exec('rm -f ' + filenameLocaldir);

        return done(null, url[0]);
      });
    },
    function (url, done) {
      dropboxUrlParser(url, function (err, directUrl) {
        return done(null, directUrl);
      });
    }],
    function (err, url) {
      self.mutex.unlock();
      if (err) {
        return cb && cb(err);
      }

      return cb && cb(null, url);
    }
  );
};

module.exports = Camera;

if (require.main === module) {
  var c = new Camera();
  c.snapPicture(function (err, url) {console.log(url);});
}

