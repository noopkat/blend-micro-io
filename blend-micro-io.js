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

// all methods below patch missing I2C methods that are not in ble-firmata 
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
  replyBuffer = [];
  slaveAddress = data[0];
  register = data[2];
  length = data.length;
  for (i = 4; i < length; i += 2) {
    replyBuffer.push(data[i]);
  }
  return this.emit('I2C-reply-' + slaveAddress + '-' + register, replyBuffer);
}

BlendMicroIO.prototype.process_input = function(input_data) {
  var analog_value, command, diff, i, old_analog_value, stat, sysex_command, sysex_data, _i, _results;
  if (this.parsing_sysex) {
    if (input_data === BLEFirmata.END_SYSEX) {
      this.parsing_sysex = false;
      sysex_command = this.stored_input_data[0];
      sysex_data = this.stored_input_data.slice(1, this.sysex_bytes_read);
      // this point is the only place where we can screen for an I2C reply, before that distinguishing byte gets stripped off.
      if (sysex_command === this.I2C_REPLY) {
        this.notifyReadI2C(sysex_data);
      }
      return this.emit('sysex', {
        command: sysex_command,
        data: sysex_data
      });
    } else {
      this.stored_input_data[this.sysex_bytes_read] = input_data;
      return this.sysex_bytes_read += 1;
    }
  } else if (this.wait_for_data > 0 && input_data < 128) {
    this.wait_for_data -= 1;
    this.stored_input_data[this.wait_for_data] = input_data;
    if (this.execute_multi_byte_command !== 0 && this.wait_for_data === 0) {
      switch (this.execute_multi_byte_command) {
        case BLEFirmata.DIGITAL_MESSAGE:
          input_data = (this.stored_input_data[0] << 7) + this.stored_input_data[1];
          diff = this.digital_input_data[this.multi_byte_channel] ^ input_data;
          this.digital_input_data[this.multi_byte_channel] = input_data;
          if (this.listeners('digitalChange').length > 0) {
            _results = [];
            for (i = _i = 0; _i <= 13; i = ++_i) {
              if (((0x01 << i) & diff) > 0) {
                stat = (input_data & diff) > 0;
                _results.push(this.emit('digitalChange', {
                  pin: i + this.multi_byte_channel * 8,
                  value: stat,
                  old_value: !stat
                }));
              } else {
                _results.push(void 0);
              }
            }
            return _results;
          }
          break;
        case BLEFirmata.ANALOG_MESSAGE:
          analog_value = (this.stored_input_data[0] << 7) + this.stored_input_data[1];
          old_analog_value = this.analogRead(this.multi_byte_channel);
          this.analog_input_data[this.multi_byte_channel] = analog_value;
          if (old_analog_value !== analog_value) {
            return this.emit('analogChange', {
              pin: this.multi_byte_channel,
              value: analog_value,
              old_value: old_analog_value
            });
          }
          break;
        case BLEFirmata.REPORT_VERSION:
          this.boardVersion = "" + this.stored_input_data[1] + "." + this.stored_input_data[0];
          return this.emit('boardVersion', this.boardVersion);
      }
    }
  } else {
    if (input_data < 0xF0) {
      command = input_data & 0xF0;
      this.multi_byte_channel = input_data & 0x0F;
    } else {
      command = input_data;
    }
    if (command === BLEFirmata.START_SYSEX) {
      this.parsing_sysex = true;
      return this.sysex_bytes_read = 0;
    } else if (command === BLEFirmata.DIGITAL_MESSAGE || command === BLEFirmata.ANALOG_MESSAGE || command === BLEFirmata.REPORT_VERSION) {    
      this.wait_for_data = 2;
      return this.execute_multi_byte_command = command;
    }
  }
};

module.exports = BlendMicroIO;