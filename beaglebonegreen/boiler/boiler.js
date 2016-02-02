'use strinct'

var fs = require('fs');

var BOILER_ON = 0;
var BOILER_OFF = 1;

function Boiler(gpio) {
  this.gpioDriver = '/sys/class/gpio/gpio' + gpio +'/';

  try {
    fs.statSync(this.gpioDriver);
  }
  catch (err) {
    fs.writeFileSync('/sys/class/gpio/export', gpio.toString());
    fs.writeFileSync(this.gpioDriver + 'direction', 'out');
    fs.writeFileSync(this.gpioDriver + 'value', '1');
  }
}

Boiler.prototype.status = function () {
  return 'on';
};

Boiler.prototype.getValue = function (cb) {
  fs.readFile(this.gpioDriver + 'value', function (err, data) {
    if (err) {
      return cb && cb(err);
    }
    console.log(data);
    
    if (data[0] === 0x30) {
      return cb && cb(null, 0); /* off */
    }

    return cb && cb(null, 1); /* on */
  });
};

Boiler.prototype.turnOn = function (cb) {
  fs.writeFile(this.gpioDriver + 'value', BOILER_ON, function (err) {
    if (err) {
      return cb && cb(err);
    }

    return cb && cb(null, 'success');
  });
};

Boiler.prototype.turnOff = function (cb) {
  fs.writeFile(this.gpioDriver + 'value', BOILER_OFF, function (err) {
    if (err) {
      return cb && cb(err);
    }

    return cb && cb(null, 'success');
  });
};

module.exports = Boiler;

if (require.main === module) {
  var b = new Boiler(20);
  b.turnOn(function (err) { 
    b.getValue(function (err, data){
      console.log(data)
    })
  });
}
