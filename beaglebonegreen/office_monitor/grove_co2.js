var _ = require('lodash'),
    SerialPort = require('serialport').SerialPort;

var CO2_GET_CMD = new Buffer([0xff, 0x1, 0x86, 0x00, 0x0, 0x0, 0x0, 0x0, 0x79]);

function Co2(serialPort, cbReady) {
  var dataBuffer = new Buffer(0);

  if (!serialPort) {
    serialPort = '/dev/ttyO2';
  }

  this.serial = new SerialPort(serialPort, {
    baudrate: 9600
  });

  var self = this;
  this.serial.on('open', function () {
    console.log('%s serial opened', serialPort);
    var Z = new Buffer([0xff, 0x1, 0x87, 0x00, 0x0, 0x0, 0x0, 0x0, 0x78]);
    self.serial.write(Z);

    cbReady && cbReady();
  });

  this.serial.on('data', function (data) {
    console.log(data);
    dataBuffer = Buffer.concat([dataBuffer, data]);
    if (dataBuffer.length === 9) {
      console.log(dataBuffer);
      var co2 = dataBuffer[2] * 256 + dataBuffer[3];
      this.cbGetCo2 && this.cbGetCo2(null, co2);
      console.log(dataBuffer[4] - 40);
      dataBuffer = dataBuffer.slice(0, 0);
    }
  }.bind(this));
}

Co2.prototype.getCo2 = function (cb) {
  this.serial.write(CO2_GET_CMD, function (err, results) {
    if (err || results != CO2_GET_CMD.length) {
      console.log('getCo2 failed');

      return cb && cb (new Error('write co2 cmd failed'));
    }
  });

  this.cbGetCo2 = cb;

  return;
}

module.exports = Co2;

// TEST
if (require.main === module) {
  var c = new Co2('/dev/ttyO2', function () {
    c.getCo2(function (data) {
      console.log('+cb');
      console.log(data);
      //c.getCo2();
      console.log('-cb');
    });
  });
}
