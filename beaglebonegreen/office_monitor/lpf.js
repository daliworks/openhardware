/*
 * 0 <= alpha <= 1
 */
 
function Lpf(alpha) {
  if (!alpha) {
    alpha = 0.15;
  }

  this.alpha = alpha;
  this.prev_output = undefined;
}

Lpf.prototype.filtering = function(input) {
  if (!this.prev_output) {
    this.prev_output = input;
    return input;
  }

  var output = this.prev_output + this.alpha * (input - this.prev_output);
  this.prev_output = output;

  return output;
}

module.exports = Lpf;
