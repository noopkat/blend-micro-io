# blend-micro-io

Takes [shokai](https://github.com/shokai)'s [node-ble-firmata](https://github.com/shokai/node-ble-firmata), adds a couple of missing features, and packages it up to use as an IO for johnny-five

Currently a WIP, and testing with a BlendMicro and an OLED display.

If you dare:

```
git clone https://github.com/noopkat/blend-micro-io.git
npm install
node test.js
```

---

example use within root dir of this repo:

```javascript
var five = require('johnny-five');
var blendMicroIO = require('./');

var board = new five.Board({
  io: new blendMicroIO()
});

board.on('ready', function() {
  // do johnny five stuff
});
```

Thank you to [Alex Potsides](https://github.com/achingbrain/node-ioboard) for the johnny-five IO template.