var util = require('util');

var BLEFirmata = require('ble-firmata');

BlendMicroIO = function(opts) {
  // call super constructor
  BLEFirmata.call(this);

  this.opts = opts || {};
  this.name = this.opts.name || "BlendMicro";
  this.port = "BLE";

  this.START_SYSEX = 0xF0;
  this.END_SYSEX = 0xF7;
  this.I2C_REQUEST = 0x76;
  this.I2C_REPLY = 0x77;
  this.I2C_CONFIG = 0x78;
  this.I2C_MODES = {
    WRITE: 0x00,
    READ: 1,
    CONTINUOUS_READ: 2,
    STOP_READING: 3
  };

  this.pins = [
    { id: "D0", supportedModes: [-2] }, //always reserved
    { id: "D1", supportedModes: [-2] }, //always reserved
    { id: "D2", supportedModes: [0, 1] },
    { id: "D3", supportedModes: [0, 1, 3, 4] },
    { id: "D4", supportedModes: [0, 1] }, // reserved
    { id: "D5", supportedModes: [0, 1, 3, 4] }, 
    { id: "D6", supportedModes: [0, 1] }, // reserved 
    { id: "D7", supportedModes: [0, 1] }, // reserved 
    { id: "D8", supportedModes: [0, 1, 2] }, 
    { id: "D9", supportedModes: [0, 1, 2, 3] }, 
    { id: "D10", supportedModes: [0, 1, 2, 3] }, 
    { id: "D11", supportedModes: [0, 1, 3] }, 
    { id: "D12", supportedModes: [0, 1, 2] }, 
    { id: "D13", supportedModes: [0, 1, 3] }, 
    { id: "A0", supportedModes: [0, 1, 2] },
    { id: "A1", supportedModes: [0, 1, 2] },
    { id: "A2", supportedModes: [0, 1, 2] },
    { id: "A3", supportedModes: [0, 1, 2] },
    { id: "A4", supportedModes: [0, 1, 2] },
    { id: "A5", supportedModes: [0, 1, 2] },
    { id: "A6", supportedModes: [0, 1, 2] },
    { id: "A7", supportedModes: [0, 1, 2] }
  ];

  // connect to blendmicro
  this.connect(this.name);

  var board = this;

  this.once("connect", function() {
    console.log('ble connect');

    board.emit("connected");

    board.emit("ready");

  });

}

util.inherits(BlendMicroIO, BLEFirmata);


BlendMicroIO.prototype.sendI2CConfig = function(delay, callback) {
  delay = delay || 0;
  return this.write(new Buffer([this.START_SYSEX, this.I2C_CONFIG, (delay & 0xFF), ((delay >> 8) & 0xFF), this.END_SYSEX]));
};

BlendMicroIO.prototype.sendI2CWriteRequest = function(slaveAddress, bytes, callback) {
  var data = [];
  var bytes = bytes || [];
  data.push(this.START_SYSEX);
  data.push(this.I2C_REQUEST);
  data.push(slaveAddress);
  data.push(this.I2C_MODES.WRITE << 3);
  for (var i = 0, length = bytes.length; i < length; i++) {
   data.push(bytes[i] & 0x7F);
   data.push((bytes[i] >> 7) & 0x7F);
  }
  data.push(this.END_SYSEX);

  return this.write(new Buffer(data));
};

module.exports = BlendMicroIO;