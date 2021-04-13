/* eslint-disable max-len */
import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback} from 'homebridge';
import { dynamicAPIPlatform } from './platform';

/**
 * Light Accessory
 */
export class LightAccessory {
  private service: Service
  private characteristicSet

  constructor(
    private readonly platform: dynamicAPIPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // Valid accessory values
    this.characteristicSet = {
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
    for (const characteristic in this.characteristicSet) {

      if (accessory.context.device.characteristics[characteristic] !== undefined) {
        // SET - bind to the `setOn` method below
        if (this.characteristicSet[characteristic].set === true) {
          this.service.getCharacteristic(this.platform.Characteristic[characteristic])
            .on('set', this.setCharacteristic.bind(this, [characteristic]));
        }
        // GET - bind to the `getOn` method below  
        if (this.characteristicSet[characteristic].get === true) {
          this.service.getCharacteristic(this.platform.Characteristic[characteristic])
            .on('get', this.getCharacteristic.bind(this, [characteristic]));
        }    
      } else {
        if (this.characteristicSet[characteristic].required === true) {
          this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: ${this.accessory.context.device.name} missing required (${characteristic}) characteristic`);
        }
      }
    }
  }
  

  /**
   * Handle "SET" requests from Direct Connect API
   * These are sent when the user changes the state of an accessory locally on the device.
   */
  async updateCharacteristic (characteristics) {

    for (const characteristic in characteristics) {
      if (this.checkCharacterisic(characteristic, characteristics[characteristic])) {
        this.service.updateCharacteristic(this.platform.Characteristic[characteristic], characteristics[characteristic]);
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Event]: (${this.accessory.context.device.name} | ${characteristic}) set to (${characteristics[characteristic]})`);
      } else {
        this.platform.log.info(`[${this.platform.config.remoteApiDisplayName}] [Device Error]: (${this.accessory.context.device.name} | ${characteristic}) invalid value (${characteristics[characteristic]})`);
      }
    }
  }

    
  /**
   * Handle "SET" characteristics requests from HomeKit
   */
  setCharacteristic (characteristic, characteristicValue: CharacteristicValue, callback: CharacteristicSetCallback) {
    
    const device = this.platform.remoteAPI('PATCH', this.accessory.context.device.id, `{"${characteristic}": ${characteristicValue}}`);
    if (!device['errno']) {
      this.platform.log.info(`[HomeKit] [Device Event]: (${this.accessory.context.device.name} | ${characteristic}) set to (${characteristicValue})`);
    }
    callback(null);
  }

  
  /**
   * Handle "GET" characteristics requests from HomeKit
   */
  async getCharacteristic(characteristic, callback: CharacteristicGetCallback) {

    const device = await this.platform.remoteAPI('GET', `${this.accessory.context.device.id}/characteristics/${characteristic}`, '');
    if (!device['errno'] && this.checkCharacterisic(characteristic, device[characteristic])) {
      this.platform.log.info(`[HomeKit] [Device Info]: (${this.accessory.context.device.name} | ${characteristic}) is (${device[characteristic]})`);
      callback(null, device[characteristic]);
    } else {
      if (!device['errno']) {
        this.platform.log.info(`[HomeKit] [Device Error]: (${this.accessory.context.device.name} | ${characteristic}) invalid value (${device[characteristic]})`);
      }
      callback(new Error ('Invalid Remote API Response'));
    }
  }

  /**
   * Check characteristic value is valid
   */
  checkCharacterisic(characteristic, characteristicValue) {
    if (this.characteristicSet[characteristic]['type'] === 'boolean' && typeof characteristicValue === 'boolean') {
      return true;
    } else if (this.characteristicSet[characteristic]['type'] === 'range' && characteristicValue >= this.characteristicSet[characteristic]['low'] && characteristicValue <= this.characteristicSet[characteristic]['high']){
      return true;
    } else {
      return false;
    }
  }
}
