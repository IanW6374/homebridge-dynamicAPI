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
      On: {'type': 'boolean', 'required': true, 'get': true, 'set': true},
      Brightness: {'type': 'range', 'required': false, 'get': true, 'set': true, 'low': 0, 'high': 100},
      ColorTemperature: {'type': 'range', 'required': false, 'get': true, 'set': true, 'low': 140, 'high': 500},
      Hue: {'type': 'range', 'required': false, 'get': true, 'set': true, 'low': 0, 'high': 360},
      Saturation: {'type': 'range', 'required': false, 'get': true, 'set': true, 'low': 0, 'high': 100},
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

    // register handlers for the Characteristics

    for (const char in this.validCharacteristic) {
      if (accessory.context.device.characteristics[char] !== undefined) {
        // SET - bind to the `setOn` method below
        if (this.validCharacteristic.set === true) {
          this.service.getCharacteristic(this.platform.Characteristic[char]).on('set', this.setCharacteristic.bind(this, [char]));
        }
        // GET - bind to the `getOn` method below  
        if (this.validCharacteristic.get === true) {
          this.service.getCharacteristic(this.platform.Characteristic[char]).on('get', this.getCharacteristic.bind(this, [char]));
        }    
      } else {

        if (this.validCharacteristic.required === true) {
          this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: ${this.accessory.context.device.name} missing required (${char}) characteristic`);
        }
      }
    }
    









    /*
    

    // register handlers for the Brightness Characteristic
    if (accessory.context.device.characteristics.Brightness !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .on('set', this.setCharacteristic.bind(this, 'Brightness'))       // SET - bind to the 'setBrightness` method below
        .on('get', this.getCharacteristic.bind(this, 'Brightness'));      // GET - bind to the 'getBrightness` method below
    }

    // register handlers for the ColorTemperature Characteristic
    if (accessory.context.device.characteristics.ColorTemperature !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
        .on('set', this.setCharacteristic.bind(this, 'ColorTemperature'))       // SET - bind to the 'setColour` method below
        .on('get', this.getCharacteristic.bind(this, 'ColorTemperature'));      // GET - bind to the 'getColour` method below
    }

    // register handlers for the Hue Characteristic
    if (accessory.context.device.characteristics.Hue !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.Hue)
        .on('set', this.setCharacteristic.bind(this, 'Hue'))       // SET - bind to the 'setHue` method below
        .on('get', this.getCharacteristic.bind(this, 'Hue'));      // GET - bind to the 'getHue` method below
    }

    // register handlers for the Saturation Characteristic
    if (accessory.context.device.characteristics.Saturation !== undefined) {
      this.service.getCharacteristic(this.platform.Characteristic.Saturation)
        .on('set', this.setCharacteristic.bind(this, 'Saturation'))       // SET - bind to the 'setSaturation` method below
        .on('get', this.getCharacteristic.bind(this, 'Saturation'));      // GET - bind to the 'getSaturation` method below
    }

    */
  
  }
  

  /**
   * Handle "SET" requests from Direct Connect API
   * These are sent when the user changes the state of an accessory locally on the device.
   */
  async updateCharacteristic1 (req) {

    for (const char in req) {
      //this.platform.log.info(`Test - ${char} - ${req[char]}`);
      if ((this.validCharacteristic[char]['type'] === 'boolean' && typeof req[char] === 'boolean') || (this.validCharacteristic[char]['type'] === 'range' && req[char] >= this.validCharacteristic[char]['low'] && req[char] <= this.validCharacteristic[char]['high'])) {
        this.service.updateCharacteristic(this.platform.Characteristic[char], req[char]);
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
