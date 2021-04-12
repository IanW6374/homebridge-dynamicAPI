/* eslint-disable max-len */
import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback, Characteristic} from 'homebridge';
import { dynamicAPIPlatform } from './platform';

/**
 * Light Accessory
 */
export class LightAccessory {
  private service: Service
  private validCharacteristic

  constructor(
    private readonly platform: dynamicAPIPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Valid accessory values
    this.validCharacteristic = {

      on: {'type': 'boolean'},
      brightness: {'type': 'range', 'low': 0, 'high': 100},
      colour: {'type': 'range', 'low': 140, 'high': 500},
      hue: {'type': 'range', 'low': 0, 'high': 360},
      saturation: {'type': 'range', 'low': 0, 'high': 100},
    };

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Home')
      .setCharacteristic(this.platform.Characteristic.Model, 'Light')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.uuid);


    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
    
    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // register handlers for the On/Off Characteristic
    if (accessory.context.device.characteristics.on !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setCharacteristic.bind(this, 'on'))                // SET - bind to the `setOn` method below
        .on('get', this.getCharacteristic.bind(this, 'on'));               // GET - bind to the `getOn` method below
    } else {
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: ${this.accessory.context.device.name} missing mandatory (on) characteristic`);
    }

    // register handlers for the Brightness Characteristic
    if (accessory.context.device.characteristics.brightness !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .on('set', this.setCharacteristic.bind(this, 'brightness'))       // SET - bind to the 'setBrightness` method below
        .on('get', this.getCharacteristic.bind(this, 'brightness'));      // GET - bind to the 'getBrightness` method below
    }

    // register handlers for the Colour Characteristic
    if (accessory.context.device.characteristics.colour !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .on('set', this.setCharacteristic.bind(this, 'colour'))       // SET - bind to the 'setColour` method below
        .on('get', this.getCharacteristic.bind(this, 'colour'));      // GET - bind to the 'getColour` method below
    }

    // register handlers for the Hue Characteristic
    if (accessory.context.device.characteristics.hue !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.Hue)
        .on('set', this.setCharacteristic.bind(this, 'hue'))       // SET - bind to the 'setHue` method below
        .on('get', this.getCharacteristic.bind(this, 'hue'));      // GET - bind to the 'getHue` method below
    }

    // register handlers for the Saturation Characteristic
    if (accessory.context.device.characteristics.saturation !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        .on('set', this.setCharacteristic.bind(this, 'saturation'))       // SET - bind to the 'setSaturation` method below
        .on('get', this.getCharacteristic.bind(this, 'saturation'));      // GET - bind to the 'getSaturation` method below
    }
  
  }
  
  /**
   * Handle "SET" requests from Direct Connect API
   * These are sent when the user changes the state of an accessory locally on the device.
   */
  async updateCharacteristic (on, brightness, colour, hue, saturation) {

    if (on === true || on === false) {
      this.service.updateCharacteristic(this.platform.Characteristic.On, on);
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | On) set to (${on})`);
    } else {
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | On) invalid value (${on})`);
    }
    if (brightness !== undefined) {
      if (brightness >= 0 && brightness <= 100) {
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Brightness) set to (${brightness})`);
      } else {
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | Brightness) invalid value (${brightness})`);
      }
    }
    if (colour !== undefined) {
      if (colour >= 140 && colour <= 500) {
        this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, colour);
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Colour) set to (${colour})`);
      } else {
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | Colour) invalid value (${colour})`);
      }
    }
    if (hue !== undefined) {
      if (hue >= 0 && hue <= 360) {
        this.service.updateCharacteristic(this.platform.Characteristic.Hue, hue);
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Hue) set to (${hue})`);
      } else {
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | Hue) invalid value (${hue})`);
      }
    } 
    if (saturation !== undefined) {
      if (saturation >= 0 && saturation <= 100) {
        this.service.updateCharacteristic(this.platform.Characteristic.Saturation, saturation);
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Saturation) set to (${saturation})`);
      } else {
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | Saturation) invalid value (${saturation})`);
      }
    }
  }

  async updateCharacteristic1 (req) {

    // eslint-disable-next-line prefer-const
    for (let char in req) {
      this.platform.log.info(`Test - ${char} - ${req[char]}`);
      if ((this.validCharacteristic[char]['type'] === 'boolean' && typeof req[char] === 'boolean') || (this.validCharacteristic[char]['type'] === 'range' && req[char] >= this.validCharacteristic[char]['low'] && req[char] <= this.validCharacteristic[char]['high'])) {
        this.service.updateCharacteristic(this.platform.Characteristic[req[char]], req.body[char]);
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | ${char}) set to (${req[char]})`);
      } else {
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | ${char}) invalid value (${req[char]})`);
      }
    }
  }

    
  /**
   * Handle "SET" characteristics requests from HomeKit
   */
  setCharacteristic (characteristic, value: CharacteristicValue, callback: CharacteristicSetCallback) {
    
    const device = this.platform.remoteAPI('PATCH', this.accessory.context.device.id, `{"${characteristic}": ${value}}`);

    if (!device['errno']) {
      this.platform.log.info(`[HomeKit] [Device Event]: (${this.accessory.context.device.name} | ${characteristic}) set to (${value})`);
    }
    callback(null);
  }

  
  /**
   * Handle "GET" characteristics requests from HomeKit
   */
  async getCharacteristic(characteristic, callback: CharacteristicGetCallback) {

    const device = await this.platform.remoteAPI('GET', `${this.accessory.context.device.id}/characteristics/${characteristic}`, '');
    if (!device['errno'] && ((this.validCharacteristic[characteristic]['type'] === 'boolean' && typeof device[characteristic] === 'boolean') || (this.validCharacteristic[characteristic]['type'] === 'range' && device[characteristic] >= this.validCharacteristic[characteristic]['low'] && device[characteristic] <= this.validCharacteristic[characteristic]['high']))) {
      this.platform.log.info(`[HomeKit] [Device Info]: (${this.accessory.context.device.name} | ${characteristic}) is (${device[characteristic]})`);
      callback(null, device[characteristic]);
    } else {
      if (!device['errno']) {
        this.platform.log.info(`[HomeKit] [Device Error]: (${this.accessory.context.device.name} | ${characteristic}) invalid value (${device[characteristic]})`);
      }
      callback(new Error ('Invalid Remote API Response'));
      //callback(null, this.accessory.context.device.CharacteristicValue[characteristic]);
    }
  }
}
