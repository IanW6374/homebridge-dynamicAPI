/* eslint-disable max-len */
import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { dynamicAPIPlatform } from './platform';

/**
 * Light Accessory
 */
export class LightAccessory {
  private service: Service

  constructor(
    private readonly platform: dynamicAPIPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

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
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setCharacteristic.bind(this, 'on'))                // SET - bind to the `setOn` method below
      .on('get', this.getCharacteristic.bind(this, 'on'));               // GET - bind to the `getOn` method below

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
   * Handle "SET" requests from Platform API
   * These are sent when the user changes the state of an accessory locally on the device.
   */
  async updateCharacteristic (on, brightness, colour, hue, saturation) {
    
    this.service.updateCharacteristic(this.platform.Characteristic.On, on);
    this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | On) is (${on})`);
    
    if (this.accessory.context.device.brightness !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Brightness) is (${brightness})`);
    }
    if (this.accessory.context.device.colour !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, colour);
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Colour) is (${colour})`);
    }
    if (this.accessory.context.device.hue !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.Hue, hue);
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Hue) is (${hue})`);
    }
    if (this.accessory.context.device.saturation !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.Saturation, saturation);
      this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | Saturation) is (${saturation})`);
    }
    
  }


  /**
   * Handle "SET" characteristics requests from HomeKit
   */
  setCharacteristic (characteristic, value: CharacteristicValue, callback: CharacteristicSetCallback) {
    
    //const charcteristicInfo = `{"${characteristic}": ${value}}`;
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

    //const charcteristicInfo = `{"${characteristic}"}`;
    const device = await this.platform.remoteAPI('GET', `${this.accessory.context.device.id}/characteristics/${characteristic}`, '');
    if (!device['errno']) {
      this.platform.log.info(`[HomeKit] [Device Info]: (${this.accessory.context.device.name} | ${characteristic}) is (${device[characteristic]})`);
      callback(null, device[characteristic]);
    } else {
      callback(null);
    }
  }
}
