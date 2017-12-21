'use strict';

var exec = require('child_process').exec,
    locks = require('locks');

var mutex = locks.createMutex();

//  irsend SEND_ONCE LGE_6711A20015N UN-JEON/JEONG-JI_26
exports.on = function (cb) {
  var cmd = 'irsend SEND_ONCE LGE_6711A20015N UN-JEON/JEONG-JI_22';
  mutex.lock(function () {
    exec(cmd, function (err/*, stdout, stderr*/) {
      mutex.unlock();
      if (err) {
        return cb && cb(err);
      }

      return cb && cb(null);
    });
  });
};

//irsend SEND_ONCE LGE_6711A20015N UN-JEON/JEONG-JI_OFF
exports.off = function (cb) {
  var cmd = 'irsend SEND_ONCE LGE_6711A20015N UN-JEON/JEONG-JI_OFF';
  mutex.lock(function () {
    exec(cmd, function (err/*, stdout, stderr*/) {
      mutex.unlock();
      if (err) {
        return cb && cb(err);
      }

      return cb && cb(null);
    });
  });
};

if (require.main === module) {
  exports.on();
}
