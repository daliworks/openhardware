'use strict'

var util = require('util'),
    events = require('events'),
    async = require('async'),
    logger = require('log4js').getLogger('Main');

var Lcd = require('./lcdI2c');

var LCD_NR_COLS = 16,
    LCD_NR_ROWS = 2;

function GrovePiLcd () {
  var self =  this;

  this.lcd = new Lcd('/dev/i2c-1', LCD_NR_COLS, LCD_NR_ROWS);
  this.text = [{}, {}];

  this.lcd.on('ready', function () {
    self._startPrinter();
    self.emit('ready');
  });

  process.on('SIGINT', function () {
    self.lcd.clear(function () {
      self.lcd.close();
      process.exit();
    });
  });
}

util.inherits(GrovePiLcd, events.EventEmitter);

GrovePiLcd.prototype.doCommand = function (name, command, options) {
  if (command === 'print') {
    var row = options.row || 0;
    var column = options.column || 0;

    this.print(options.text, {row: row, column: column});
  } else if (command === 'clear') {
    this.clear(null, options.row);
  }
};

GrovePiLcd.prototype.getData = function (name) {
  return {status: 'on'};
};

GrovePiLcd.prototype.print = function (str, position) {
  var row = position.row || 0,
      column = position.column || 0;

  if (str.length <= LCD_NR_COLS - column) {
    this.text[position.row].row = position.row;
    this.text[position.row].column = position.column;
    this.text[position.row].str = str;
    this.text[position.row].scroll = false;
  } else {
    this.text[position.row].index = 0;
    this.text[position.row].str = str + ' ';
    this.text[position.row].scroll = true;
  }
};

GrovePiLcd.prototype.clear = function (cb, row) {
  var self = this;

  for (var i=0; i<LCD_NR_ROWS; i++) {
    this.text[i].scroll = false;
    this.text[i].str = null;
  }

  if (row === 0 || row === 1) {
    this.print('                ', {row:row, column:0}, 0);
  } else {
    this.lcd.clear(function (err) {
      if (err) {
        console.log('this.lcd.clear failed\n');
      }
    });
  }
};

GrovePiLcd.prototype._startPrinter = function () {
  var self = this;
  async.eachSeries(this.text, function (text, done) {
    if (text.str) {
      if (text.scroll == true) {
        self.lcd.setCursor(0, text.row);
        self.lcd.print(text.str.substr(text.index++));
        self.lcd.once('printed', function () {done()});
        if (text.index === text.str.length) {
          text.index = 0;
        }
      } else {
        self.lcd.setCursor(text.column, text.row);
        self.lcd.print(text.str);
        self.lcd.once('printed', function () {done()});
      }
    } else {
      done();
    }
  }, function (err) {
    setTimeout(function () {
      self._startPrinter(); 
    }, 400);
  });
};

module.exports = GrovePiLcd;
