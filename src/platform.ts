import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { GarageDoorAccessory } from './GarageDoorAccessory';
import { LightAccessory } from './LightAccessory';
import fetch from 'node-fetch';
import express from 'express';
import https from 'https';
import fs from 'fs';
import jwt from 'express-jwt';
import jwtAuthz from 'express-jwt-authz';
import jwksRsa from 'jwks-rsa';


/**
 * Homebridge Platform
 */

export class GaragePlatform implements DynamicPlatformPlugin {

  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  // this is used to track platform accessories for dynamic updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceObjects: any[];

  // this is used to store the remote API JSON Web Token (JWT)
  apiJWT

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
    
  ) {
    this.log.debug(`Finished initializing ${PLATFORM_NAME} platform`);

    this.deviceObjects = [];
    this.apiJWT = {
      'access_token': '',
      'token_type': '',
      'expires': 0,
      'scope': '',
      'valid': false,
    };

    /** 
     * When this event is fired it means Homebridge has restored all cached accessories from disk.
     * Dynamic Platform plugins should only register new accessories after this event was fired,
     * in order to ensure they weren't added to homebridge already. This event can also be used
     *to start discovery of new accessories.
     */
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // Run the method to discover / register your devices as accessories
      //const devices: any[] = await this.discoverDevices();

      const devices = await this.discoverDevices();

      // Start Platform API Server
      this.webServer(devices);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`Loading accessory from cache:, ${accessory.displayName}`);

    // add the restored accessory to the accessories cache so we can track if it has already been registered

    this.accessories.push(accessory);
  }

  // Discover devices via remote API.
  async discoverDevices() {

    const discoveredDevices = await this.remoteAPI('GET', '', '');

    if (!discoveredDevices['errno']) {

      // loop over the discovered devices and register each one if it has not already been registered
      for (const device of discoveredDevices) {

        // generate a unique id for the accessory
        const uuid = this.api.hap.uuid.generate(device.uuid);

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingDevice = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingDevice) {
          // the accessory already exists
          this.log.info(`Restoring existing accessory from cache: ${existingDevice.displayName}`);

          if(device.type === 'Garage Door Opener') {
            // create the accessory handler for the restored accessory
            this.deviceObjects.push(new GarageDoorAccessory(this, existingDevice));
          } else if (device.type === 'Lightbulb') {
            // create the accessory handler for the restored accessory
            this.deviceObjects.push(new LightAccessory(this, existingDevice));
          } else {
            this.log.info(`Platform does not support device: ${existingDevice.displayName}: ${device.type}`);
          }

        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info(`Adding new accessory: ${device.name}`);

          // create a new accessory
          const accessory = new this.api.platformAccessory(device.name, uuid);

          // store a copy of the device object in the `accessory.context`
          accessory.context.device = device;

          if(device.type === 'Garage Door Opener') {
            // create the accessory handler for the restored accessory
            this.deviceObjects.push(new GarageDoorAccessory(this, accessory));
          } else if (device.type === 'Lightbulb') {
            // create the accessory handler for the restored accessory
            this.deviceObjects.push(new LightAccessory(this, accessory));
          } else {
            this.log.debug(`Platform does not support device: ${device.name}: ${device.type}`);
          }
        
          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      } 
      return discoveredDevices;
    }
    
  }


  updateDevice(devices, req, res) {
     
    const deviceIndex = devices.findIndex(devices => devices.uuid === req.body.uuid);

    if (deviceIndex === -1){
      this.log.debug(`Error: Device with uuid: ${req.body.uuid} not found`);
      res.send(`Error: Device with uuid: ${req.body.uuid} not found`);

    } else {
      if (devices[deviceIndex].type === 'Garage Door Opener') {
        this.deviceObjects[deviceIndex].updateCharacteristic(req.body.stateActual, req.body.stateTarget, req.body.obstruction);
        res.send(JSON.stringify(devices[deviceIndex]));

      } else if (devices[deviceIndex].type === 'Lightbulb') {
        this.deviceObjects[deviceIndex].updateCharacteristic(req.body.on, req.body.brightness, req.body.colour);
        res.send(JSON.stringify(devices[deviceIndex]));
      
      } else {
        this.log.debug(`Error: Device with type: ${req.body.type} not found`);
        res.status(404).send(`Error: Device with type: ${req.body.type} not found`);
      }
    }
  }


  async getAuthToken() {
    
    const url = `${this.config.jwtIssuer}oauth/token`;
    
    // send POST request
    await fetch(url, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      // eslint-disable-next-line max-len
      body: `{"client_id":"${this.config.jwtClientID}","client_secret":"${this.config.jwtClientSecret}","audience":"${this.config.jwtAudience}","grant_type":"client_credentials"}`,
    })
      .then(res => {
        if (res.ok) { // res.status >= 200 && res.status < 300
          this.log.info(`Remote API JWT Fetch Success: ${res.status}`);
          return res;
        } else {
          throw new Error(`${res.status}`);
        }
      })
      .then(res => res.json())
      .then(res => {
        if (res === undefined) {
          this.apiJWT.valid = false; 
        } else {
          this.apiJWT = {
            'access_token': res.access_token,
            'token_type': res.token_type,
            'expires': Date.now() + (res.expires_in * 1000),
            'scope': res.scope,
            'valid': true,
          };
        } 
      })
      .catch(error => this.log.debug(`Remote API JWT Fetch Failure: ${error}`));
  }

  
  async webServer(devices) {

    const WebApp = express();
    WebApp.use(express.json());
    const options = {};
    let error = false;

    // Secure API - jwt
    const checkJwt = jwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${this.config.jwtIssuer}.well-known/jwks.json`,
      }),

      audience: `${this.config.jwtAudience}`,
      issuer: `${this.config.jwtIssuer}`,
      algorithms: ['RS256'],
    });

    const checkScopes = jwtAuthz([ 'write:api' ]);
    

    // Initialise API
    if (this.config.https === true){

      try {
        fs.accessSync (`${this.config.httpsCertPath}`, fs.constants.R_OK);
        const cert = fs.readFileSync(`${this.config.httpsCertPath}`);
        options['cert'] = cert;
      } catch (err) {
        this.log.debug(`HTTPS Certificate file does not exist or unreadable: ${err}`);
        error = true;
      }

      try {
        fs.accessSync (`${this.config.httpsKeyPath}`, fs.constants.R_OK);
        const key = fs.readFileSync(`${this.config.httpsKeyPath}`);
        options['key'] = key;
      } catch (err) {
        this.log.debug(`HTTPS Private Key file does not exist or unreadable: ${err}`);
        error = true;
      }

      if (!error) {
        https.createServer(options, WebApp).listen(this.config.apiPort, () => {
          this.log.info(`Local API service started at https://localhost:${this.config.apiPort}`);
        });
      } 
    } else {
      WebApp.listen(this.config.apiPort, () => {
        this.log.info(`Local API service started at http://localhost:${this.config.apiPort}`);
      });
    }

    if (!error) {   
      // Create API GET route response
      let getAPI = '';
      if (devices === undefined) {
        getAPI = 'No devices synchronised from Remote API Endpoint';
      } else {
        devices.forEach(item => {
          getAPI += `id: ${item.id} name: ${item.name} uuid: ${item.uuid} type: ${item.type}<br>`;
        });
      }
      // Create API GET API Route
      WebApp.get( '/', ( req, res ) => {
        res.send(`${PLATFORM_NAME} Homebridge Platform API Running <br><br>${getAPI}`);
      });
    
      // Create API PATCH API Route
      if (this.config.jwt === true){
        WebApp.patch('/api/', checkJwt, checkScopes, async (req, res) => this.updateDevice(devices, req, res));
      } else {
        WebApp.patch('/api/', async (req, res) => this.updateDevice(devices, req, res));
      }

      // Create API Error Handler
      WebApp.use((err, req, res, next) => {
        if (!err) {
          return next();
        } else {
          this.log.debug(`Local API Service: ${err}`);
          res.status(err.status).send(`API Service: ${err}`);
        }
      });
      return;
    }
  }


  async remoteAPI (method, endpoint, body) {

    if (this.config.jwt && (this.apiJWT.valid === false || this.apiJWT.expires <= Date.now() + 60000)) {
      await this.getAuthToken(); 
    }
    if (this.apiJWT.status === false && this.config.jwt === true) {
      this.log.info('No valid Remote API JWT to discover devices');

      const error = {'errno': 'No valid Remote API JWT to discover devices'};
      return error;

    } else {

      const url = (this.config.url.endsWith('/')) ? this.config.url + endpoint : this.config.url + '/' + endpoint;
      const jwtHeader = {'content-type': 'application/json', 'authorization': `${this.apiJWT.token_type} ${this.apiJWT.access_token}`};
      const headers = (this.config.jwt) ? jwtHeader : {'content-type': 'application/json'};

      let options = {};

      if (this.config.rejectInvalidCert === false && url.toLowerCase().includes('https')) {
        const agent = new https.Agent({
          rejectUnauthorized: false,
        });
        options = {
          method: method,
          headers: headers,
          agent,
        };
      } else {
        options = {
          method: method,
          headers: headers,
        };
      }

      if (method === 'POST' || method === 'PATCH') {
        options['body'] = body;
      }
      
      // send Method request
      const response = await fetch(url, options)
        .then(res => {
          if (res.ok) { // res.status >= 200 && res.status < 300
            return res;
          } else {
            throw new Error(`${res.status}`);
          }
        })
        .then(res => res.json())
        .then(res => {
          return res;
        })
        .catch(error => {
          this.log.debug(`Remote API ${method} Failure: ${error}`);
          return error;
        });
      return response;
    }
  }
}
  

