'use strict';
var async = require('async');
var locks = require('locks'),
    exec = require('child_process').exec;

function Camera(pin) {
  this.mutex = locks.createMutex();
}

Camera.prototype.statusSync = function () {
  return 'on';
};

Camera.prototype.snapPicture = function (cb) {
  var self = this;
  var url = 'test';
  var filename = new Date().toISOString() + '.jpg';

  async.waterfall([
    function (done) {
      self.mutex.lock(function () {
        return done();
        });
    },
    function (done) {
      exec('raspistill -vf -hf -o ' + filename, function (err, stdout, stderr) {
        return done();
      });
    },
    function (done) {
      exec('dropbox_uploader.sh upload ' + filename + ' /', function (err, stdout, stderr) {
        return done();
      });
    },
    function (done) {
      exec('dropbox_uploader.sh share ' + filename, function (err, stdout, stderr) {
        var urlPattern = new RegExp('https:\\/\\/.*', 'g');
        url = stdout.match(urlPattern);
        return done(null, url);
      });
    }],
    function (err, url) {
      self.mutex.unlock();
      if (err) {
        cb && cb(err);
        return;
      }

      cb && cb(null, url);
    }
  );
};

module.exports = Camera;

if (require.main === module) {
  var c = new Camera();
  c.snapPicture(function (err, url) {console.log(url)});
}

