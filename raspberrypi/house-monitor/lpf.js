'use strict';

/*
 * 0 <= alpha <= 1
 */
 
function Lpf(alpha) {
  if (!alpha) {
    alpha = 0.15;
  }

  this.alpha = alpha;
  this.prevOutput = undefined;
}

Lpf.prototype.filtering = function(input) {
  if (!this.prevOutput) {
    this.prevOutput = input;
    return input;
  }

  var output = this.prevOutput + this.alpha * (input - this.prevOutput);
  this.prevOutput = output;

  return output;
};

module.exports = Lpf;
