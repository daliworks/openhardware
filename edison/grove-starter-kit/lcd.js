'use strict';

var five = require('johnny-five'),
    _ = require('lodash');

var NR_COLUMN = 16,
    NR_ROW = 2;

function Lcd() {
  this.lcd = new five.LCD({controller: 'JHD1313M1'});
}

Lcd.prototype.print = function (text, row, column, cb) {
  if (row < 0 || row > NR_ROW) {
    row = 0;
  }

  if (column < 0 || column > NR_COLUMN) {
    column = 0;
  }

  this.lcd.bgColor(0xff, 0xff, 0xff).cursor(row, column).print(text);

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

Lcd.prototype.clear = function (row, cb) {
  if (row === -1 || _.isNull(row) || _.isUndefined(row)) {
    this.lcd.clear();
  }
  else {
    if (row > NR_ROW) {
      row = 0;
    }

    var emptyText = '                ';
    this.lcd.bgColor(0xff, 0xff, 0xff).cursor(row, 0).print(emptyText);
  }

  if (cb) {
    process.nextTick(function () {
      cb(null);
    });
  }
};

module.exports = Lcd;

/*
if (require.main === module) {
  var board = new five.Board({repl: false});
  board.on('ready', function () {
    var lcd = new Lcd();
    lcd.print('hello', 1, 0);
    lcd.print('world', 1, 1);
    lcd.clear(0);
  });
}
*/
