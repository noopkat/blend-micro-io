var util = require('util');
var BLEFirmata = require('ble-firmata');

var BlendMicroIO = function(opts) {
  // call super constructor
  BLEFirmata.call(this);

  this.opts = opts || {};
  // this is the advertising name, default in patched firmata is fallback
  this.name = this.opts.name || 'BlendMicro';
  // totally gratuitous port
  this.port = 'BLE';

  // these are needed for patched methods at bottom
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
    { id: 'D0', supportedModes: [-2] }, // always reserved
    { id: 'D1', supportedModes: [-2] }, // always reserved
    { id: 'D2', supportedModes: [0, 1] },
    { id: 'D3', supportedModes: [0, 1, 3, 4] },
    { id: 'D4', supportedModes: [0, 1] }, // reserved
    { id: 'D5', supportedModes: [0, 1, 3, 4] }, 
    { id: 'D6', supportedModes: [0, 1] }, // reserved 
    { id: 'D7', supportedModes: [0, 1] }, // reserved 
    { id: 'D8', supportedModes: [0, 1, 2] }, 
    { id: 'D9', supportedModes: [0, 1, 2, 3] }, 
    { id: 'D10', supportedModes: [0, 1, 2, 3] }, 
    { id: 'D11', supportedModes: [0, 1, 3] }, 
    { id: 'D12', supportedModes: [0, 1, 2] }, 
    { id: 'D13', supportedModes: [0, 1, 3] }, 
    { id: 'A0', supportedModes: [0, 1, 2] },
    { id: 'A1', supportedModes: [0, 1, 2] },
    { id: 'A2', supportedModes: [0, 1, 2] },
    { id: 'A3', supportedModes: [0, 1, 2] },
    { id: 'A4', supportedModes: [0, 1, 2] },
    { id: 'A5', supportedModes: [0, 1, 2] },
    { id: 'A6', supportedModes: [0, 1, 2] },
    { id: 'A7', supportedModes: [0, 1, 2] }
  ];

  // connect to blendmicro
  this.connect(this.name);

  var board = this;

  this.once('connect', function() {
    board.emit('connected');
    board.emit('ready');
  });

  process.on('SIGINT', function() {
    board.close();
  });

}

util.inherits(BlendMicroIO, BLEFirmata);

// two methods below patch missing I2C methods (except readI2CRequest)
BlendMicroIO.prototype.sendI2CConfig = function(delay, callback) {
  var data, write_data;
  if (delay == null) {
    delay = 0;
  }
  data = [delay, delay >> 8];
  data = data.map(function(i) {
    return i & 0xff;
  });
  write_data = [this.START_SYSEX, this.I2C_CONFIG].concat(data, [this.END_SYSEX]);
  return this.write(write_data, callback);
};

BlendMicroIO.prototype.sendI2CWriteRequest = function(slaveAddress, bytes, callback) {
  var data;
  data = [slaveAddress, this.I2C_MODES.WRITE << 3];
  bytes.map(function(i) {
    return data.push(i, i >> 7);
  });
  return this.sysex(this.I2C_REQUEST, data, callback);
};

module.exports = BlendMicroIO;