'use strict';

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
  var self = this;

  if (command === 'print') {
    var row = options.row || 0;
    var column = options.column || 0;

    if (row >= LCD_NR_ROWS) {
      row = 0;
    }

    if (column >= LCD_NR_COLS) {
      column = 0;
    }

    process.nextTick(function () {
      self.print(options.text, {row: row, column: column});
    });
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

  this.lcd.setCursor(column, row);
  this.lcd.print(str);
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

module.exports = GrovePiLcd;
