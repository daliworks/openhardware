var _ = require('lodash'),
    spawn = require('child_process').spawn;

function normalizeArgs(file /*, args, options, cb*/) {
  var args;
  var options;
  var callback;

  function isCallback(testArgs) {
    return _.isFunction(testArgs);
  }

  function isOptions(testArgs) {
    return _.isPlainObject(testArgs);
  }

  function isArgs(testArgs) {
    return _.isArray(testArgs);
  }

  if (arguments[1] === undefined) {
    args = undefined;
    options = undefined;
    callback = undefined;
  }
  else if (isArgs(arguments[1])) {
    args = arguments[1].slice(0);

    if (isOptions(arguments[2])) {
      options = arguments[2];

      if (_.isFunction(arguments[3])) { 
        callback = arguments[3];
      }
    }
    else if (isCallback(arguments[2])) {
        callback = arguments[2];
    }
  }
  else if (isOptions(arguments[1])) {
      options = arguments[1];

      if (isCallback(arguments[2])) { 
        callback = arguments[2];
      }
  }
  else if(isCallback(arguments[1])) {
        callback = arguments[1];
  }

  return {
    file: file,
    args: args,
    options: options,
    cb: callback
  };
}

function callSpawn(file, args, options, cb) {
  var running = spawn(file, args, options);

  running.on('close', function(code) {
    if (code) {
      cb && cb (new Error('Exit with code(%d)', code));
      return;
    }

    cb && cb (null, file, args, options);
  });
}

function SpawnQueue(maxQueue) {
  this.maxEggs = maxQueue;
  this.eggs = [];
}

SpawnQueue.prototype.push = function(file /*, args, options, cb*/) {
  var self = this;

  function spawning() {
    var egg = _.first(self.eggs);

    callSpawn(egg.file, egg.args, egg.options, function (err, file, args, option) {
      if (err) {
        egg.cb && egg.cb(err);
      }
      else {
        egg.cb && egg.cb(null,
          {file: egg.file, args: egg.args, options: egg.options});
      }
      
      self.eggs.shift();

      if (!_.isEmpty(self.eggs)) {
        spawning();
      }
    });
  }

  var opts = normalizeArgs.apply(null, arguments);

  if (_.size(this.eggs) === this.maxEggs) {
    cb && cb(new Error('SpawnQueue is full'));
    return;
  }

  this.eggs.push(opts);

  if (_.size(this.eggs) === 1) {
    spawning();
  }
};

SpawnQueue.prototype.drain = function() {
  this.eggs.splice(0, _.size(this.eggs));
};

module.exports = SpawnQueue;
