var five = require('johnny-five');
var blendMicroIO = require('./'),
    Oled = require('oled-js'),
    font = require('oled-font-5x7'),
    pngtolcd = require('png-to-lcd');

var board = new five.Board({
  io: new blendMicroIO()
});

board.on('ready', function() {
  console.log('j5 found the micro!');

  // new oled
  var oled = new Oled(board, five, 128, 64, 0x3D, 'I2C');

  this.repl.inject({
    oled: oled
  });

  // dim display
  oled.dimDisplay(true);
  oled.turnOnDisplay();
  oled.invertDisplay(false);

  // bitmap display example
  // pngtolcd(__dirname + '/node_modules/oled-js/tests/images/cat-128x64.png', true, function(err, bitmapbuf) {
  //   oled.buffer = bitmapbuf;
  //   oled.update();
  // });

  // display text
  // oled.setCursor(0, 0);
  // oled.writeString(font, 1, 'Cats and dogs are really cool animals, you know.', 1, true);

  // clear display
  // oled.clearDisplay();

  // invert display
  // oled.invertDisplay(true);

  // draw one pixel
  // oled.drawPixel([1, 0, 1]);

  // draw many pixels
  // oled.drawPixel([
  //   [1, 0, 1], [30, 16, 1]
  // ]);

});