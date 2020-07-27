import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { GaragePlatform } from './platform';

/**
 * Garage Door Accessory
 */
export class GarageDoorAccessory {
  private service: Service

  constructor(
    private readonly platform: GaragePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Home')
      .setCharacteristic(this.platform.Characteristic.Model, 'Garage Door')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.uuid);

    // eslint-disable-next-line max-len
    this.service = this.accessory.getService(this.platform.Service.GarageDoorOpener) || this.accessory.addService(this.platform.Service.GarageDoorOpener);

    // set the service name - this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

    // create handlers for required characteristics
    this.service.getCharacteristic(this.platform.Characteristic.TargetDoorState)
      .on('get', this.getCharacteristic.bind(this, 'stateTarget'))
      .on('set', this.setCharacteristic.bind(this, 'stateTarget'));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentDoorState)
      .on('get', this.getCharacteristic.bind(this, 'stateActual'));

    this.service.getCharacteristic(this.platform.Characteristic.ObstructionDetected)
      .on('get', this.getCharacteristic.bind(this, 'obstruction'));
   
      
    /*
     * Polling of Garage Door Status - Not required due to dynamic updates are implemented
     *
     
      setInterval(async () => {
        // your own logic to get current status of switch
        const AccessoryUrl = this.platform.config.url + '/' + this.accessory.context.device.id;
  
        const AccessoryInfo = await fetch(AccessoryUrl)
        // the JSON body is taken from the response
          .then(res => res.json())
          .then(res => {
          // The response has an `any` type, so we need to cast
          // it to the `Platform_Device` type, and return it from the promise
            return res;
          });
  
        this.platform.log.debug(this.accessory.context.device.name, ' Get Characteristic Current Door State ->', AccessoryInfo.stateActual);
          
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, AccessoryInfo.stateActual);
      }, 30000);

     */

  }

  
  /**
   * Handle "SET" requests from Platform API
   * These are sent when the user changes the state of an accessory locally on the device.
   */
  async updateCharacteristic (actualDoorState, targetDoorState, obstructionDetected) {

    if (obstructionDetected !== undefined){
      this.service.updateCharacteristic(this.platform.Characteristic.ObstructionDetected, obstructionDetected);
      this.platform.log.info(`${this.accessory.context.device.name} API Set Obstruction Detected <- ${obstructionDetected}`);
    }
    if (actualDoorState !== undefined){
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentDoorState, actualDoorState);
      this.platform.log.info(`${this.accessory.context.device.name} API Set Current Door State <- ${actualDoorState}`);
    }
    if (targetDoorState !== undefined){
      this.service.updateCharacteristic(this.platform.Characteristic.TargetDoorState, targetDoorState);
      this.platform.log.info(`${this.accessory.context.device.name} API Set Target Door State <- ${targetDoorState}`);
    }
  }

  /**
   * Handle "SET" characteristics requests from HomeKit
   */
  setCharacteristic (characteristic, value: CharacteristicValue, callback: CharacteristicSetCallback) {
    
    const accessoryInfo = `{"id": ${this.accessory.context.device.id}, "${characteristic}": ${value}}`;
    const device = this.platform.remoteAPI('PATCH', this.accessory.context.device.id, accessoryInfo);

    if (!device['errno']) {
      this.platform.log.info(`${this.accessory.context.device.name} Set ${characteristic} -> ${value}`);
    }

    callback(null);
  }

  /**
   * Handle "GET" characteristics requests from HomeKit
   */
  async getCharacteristic(characteristic, callback: CharacteristicGetCallback) {

    const device = await this.platform.remoteAPI('GET', this.accessory.context.device.id, '');
    if (!device['errno']) {
      this.platform.log.info(`${this.accessory.context.device.name} Get ${characteristic} -> ${device[characteristic]}`);
      callback(null, device[characteristic]);
    } else {
      callback(null);
    }
  }
}
