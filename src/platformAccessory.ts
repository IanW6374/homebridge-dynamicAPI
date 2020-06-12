import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
import { ExampleHomebridgePlatform } from './platform';
import fetch from 'node-fetch';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExamplePlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private exampleStates = {
    On: false,
    Brightness: 100,
  }

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.uuid);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory

    if (accessory.context.device.type === 'light') {
    
      // eslint-disable-next-line max-len
      this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
      // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
      // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
      // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

      // set the service name, this is what is displayed as the default name on the Home app
      // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.name);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Lightbulb

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
        .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

      // register handlers for the Brightness Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.Brightness)
        .on('set', this.setBrightness.bind(this));       // SET - bind to the 'setBrightness` method below

    } else {
      // eslint-disable-next-line max-len
      this.service = this.accessory.getService(this.platform.Service.GarageDoorOpener) || this.accessory.addService(this.platform.Service.GarageDoorOpener);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;

    this.platform.log.debug(this.accessory.context.device.name, ' Set Characteristic On ->', value);


    const url = 'http://192.168.1.201:5000/pins/' + this.accessory.context.device.id;

    // post body data 
    const user = {
      id: this.accessory.context.device.id,
      on: this.exampleStates.On,
    };

    // request options
    const options = {
      method: 'PATCH',
      body: JSON.stringify(user),
      headers: {'Content-Type': 'application/json'},
    };

    // send POST request
    fetch(url, options)
      .then(res => res.json())
      // eslint-disable-next-line no-console
      .then(res => console.log(res));

    // you must call the callback function
    callback(null);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(callback: CharacteristicGetCallback) {

    // implement your own code to check if the device is on


    const url = 'http://192.168.1.201:5000/pins/' + this.accessory.context.device.id;

    interface Platform_Device {
          id: number
          name: string
          uuid: string
          pin_num: number
          type: string
          on: boolean
          brightness: number
    }
    
    async function getDevice(): Promise<Platform_Device[]> {
    
      const res = await fetch(url);
      const res_1 = await res.json();
      // The response has an `any` type, so we need to cast
      // it to the `User` type, and return it from the promise
      return res_1 as Platform_Device[];
    }

    const device = getDevice();

    
    for (const isOn of await device) {
      this.platform.log.debug('Get Characteristic On ->', isOn.on);

      // you must call the callback function
      // the first argument should be null if there were no errors
      // the second argument should be the value to return
      callback(null, isOn.on);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to set the brightness

    this.platform.log.debug('Set Characteristic Brightness -> ', value);

    const url = 'http://192.168.1.201:5000/pins/' + this.accessory.context.device.id;

    // post body data 
    const user = {
      id: this.accessory.context.device.id,
      brightness: this.exampleStates.Brightness,
    };

    // request options
    const options = {
      method: 'PATCH',
      body: JSON.stringify(user),
      headers: {'Content-Type': 'application/json'},
    };

    // send POST request
    fetch(url, options)
      .then(res => res.json())
      // eslint-disable-next-line no-console
      .then(res => console.log(res));

    // you must call the callback function
    callback(null);
  }

}
