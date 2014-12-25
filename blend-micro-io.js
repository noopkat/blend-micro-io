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
    // start filtering on sysex replies
    this.notifyReadI2C();
    
    board.emit('connected');
    board.emit('ready');

  });

  process.on('SIGINT', function() {
    board.close();
  });

}

util.inherits(BlendMicroIO, BLEFirmata);

// all methods below patch missing I2C methods that are not in ble-firmata 
BlendMicroIO.prototype.sendI2CReadRequest = function(slaveAddress, numBytes, callback) {
  var data;
  data = [this.START_SYSEX, this.I2C_REQUEST, slaveAddress, this.I2C_MODES.READ << 3, numBytes & 0x7F, (numBytes >> 7) & 0x7F, this.END_SYSEX];
  this.once('I2C-reply-' + slaveAddress + '-0', function(reply) {
    return callback(reply);
  });
  return this.write(data);
};

// parse I2C reply sysex response data and emit in correct fashion
BlendMicroIO.prototype.notifyReadI2C = function(data) {
  var replyBuffer, slaveAddress, register, length;
  this.on('sysex', function(reply) {
    if (reply.command === this.I2C_REPLY) {
      replyBuffer = [];
      slaveAddress = reply.data[0];
      register = reply.data[2];
      length = reply.data.length;

      for (i = 4; i < length; i += 2) {
        replyBuffer.push(reply.data[i]);
      }

      return this.emit('I2C-reply-' + slaveAddress + '-' + register, replyBuffer);
    }
  });
}

module.exports = BlendMicroIO;