/* eslint-disable max-len */
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
import os from 'os';

/**
 * Homebridge Platform
 */

export class dynamicAPIPlatform implements DynamicPlatformPlugin {

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
    this.log.info(`[Platform Event]:  ${PLATFORM_NAME} platform Initialized`);

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

      // Discover & register your devices as accessories
      await this.discoverDevices();

      // Start Platform API Server
      this.webServer();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(`[Platform Event]:  Restored Device (${accessory.displayName}) from Homebridge Cache`);

    // add the restored accessory to the accessories cache so we can track if it has already been registered

    this.accessories.push(accessory);
  }

  // Discover devices via remote API.
  async discoverDevices() {

    const discoveredDevices = await this.remoteAPI('GET', '', '');

    if (!discoveredDevices['errno']) {

      // loop over the discovered devices and register each one if it has not already been registered
      try {
        for (const device of discoveredDevices) {

          // generate a unique id for the accessory
          const uuid = this.api.hap.uuid.generate(device.uuid);

          // see if an accessory with the same uuid has already been registered and restored from
          // the cached devices we stored in the `configureAccessory` method above
          const accessory = this.accessories.find(accessory => accessory.UUID === uuid);

          if (accessory) {
          // the accessory already exists
            this.log.info(`[Platform Event]:  Restored Device (${device.name}) from ${this.config.remoteApiDisplayName}`);
          
            // Update accessory context
            accessory.context.device = device;

            // create the accessory handler for the restored accessory
            if(device.type === 'Garage Door Opener') {
              this.deviceObjects.push(new GarageDoorAccessory(this, accessory));
            } else if (device.type === 'Lightbulb') {
              this.deviceObjects.push(new LightAccessory(this, accessory));
            } else {
              this.log.warn(`[Platform Warning]:  Device Type Not Supported (${device.name} | ${device.type})`);
            }

          } else {
          // the accessory does not yet exist, so we need to create it
            this.log.info(`[Platfrom Event]:  Added New Device (${device.name} | ${device.type}) from ${this.config.remoteApiDisplayName}`);

            // create a new accessory
            const accessory = new this.api.platformAccessory(device.name, uuid);

            // store a copy of the device object in the `accessory.context`
            accessory.context.device = device;

            // create the accessory handler for the restored accessory
            if(device.type === 'Garage Door Opener') {
              this.deviceObjects.push(new GarageDoorAccessory(this, accessory));
            } else if (device.type === 'Lightbulb') {
              this.deviceObjects.push(new LightAccessory(this, accessory));
            } else {
              this.log.warn(`[Platform Warning]:  Device Type Not Supported (${device.displayName} | ${device.type})`);
            }
          
            // Add the new accessory to the accessories cache
            this.accessories.push(accessory);

            // link the accessory to your platform
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        } 
    
        // Delete an old accessory
        if (this.accessories.length > discoveredDevices.length) {

          for (let accessoryIndex = this.accessories.length - 1; accessoryIndex > 0; accessoryIndex --) {
            if (discoveredDevices.findIndex(devices => devices.uuid === this.accessories[accessoryIndex].context.device.uuid) === -1) { 
              const accessory = this.accessories[accessoryIndex];
              this.api.unregisterPlatformAccessories('PLUGIN_NAME', 'PLATFORM_NAME', [accessory]);
              this.log.info(`[Platform Event]:  Deleted Device (${this.accessories[accessoryIndex].context.device.name})`);
              this.accessories.splice(accessoryIndex, 1);
            }
          }
        }
      } catch {
        this.log.error('[Platform Error]:  Invalid respone from remote API');
      }
    } 
  }


  updateDevice(req, res) {

    if (this.deviceObjects.length === 0) {
      this.log.warn(`[Platform Warning]: No devices synchronised from ${this.config.remoteApiDisplayName}`);
      res.status(404).send(`WARNING: No devices synchronised from ${this.config.remoteApiDisplayName}`);
    } else {
     
      const accessoryIndex = this.accessories.findIndex(accessory => accessory.context.device.uuid === req.body.uuid);

      if (accessoryIndex === -1){
        this.log.warn(`[Platform Warning]: Device with uuid: ${req.body.uuid} not found`);
        res.status(404).send(`WARNING: Device with uuid: ${req.body.uuid} not found`);

      } else {

        const deviceIndex = this.accessories[accessoryIndex].context.device.id;

        if (this.accessories[accessoryIndex].context.device.type === 'Garage Door Opener') {
          this.deviceObjects[deviceIndex].updateCharacteristic(req.body.stateActual, req.body.stateTarget, req.body.obstruction);
          res.send(JSON.stringify(this.accessories[accessoryIndex].context.device));

        } else if (this.accessories[accessoryIndex].context.device.type === 'Lightbulb') {
          this.deviceObjects[deviceIndex].updateCharacteristic(req.body.on, req.body.brightness, req.body.colour);
          res.send(JSON.stringify(this.accessories[accessoryIndex].context.device));
      
        } else {
          this.log.info(`[Platform Warning]: Device with type: (${req.body.name} | ${req.body.type}) not found`);
          res.status(404).send(`WARNING: Device with type: (${req.body.name} | ${req.body.type}) not found`);
        }
      }
    }
  }


  async getAuthToken() {
    
    const url = `${this.config.jwtIssuer}oauth/token`;
    
    // send POST request
    await fetch(url, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: `{"client_id":"${this.config.jwtClientID}","client_secret":"${this.config.jwtClientSecret}","audience":"${this.config.jwtAudience}","grant_type":"client_credentials"}`,
    })
      .then(res => {
        if (res.ok) { // res.status >= 200 && res.status < 300
          this.log.info(`[Platform Info]:  ${this.config.remoteApiDisplayName} JWT Fetch Success: ${res.status}`);
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
      .catch(error => this.log.error(`[Platform Error]:  ${this.config.remoteApiDisplayName} JWT Fetch Failure: ${error}`));
  }

  
  async webServer() {

    const WebApp = express();
    WebApp.use(express.json());
    const options = {};
    let error = false;
    const apiIP = this.config.directConnectApiIP || this.getIPAddress();

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
    

    // Initialise Direct Connect API
    if (this.config.directConnectApiHttps === true){

      try {
        fs.accessSync (`${this.config.directConnectApiHttpsCertPath}`, fs.constants.R_OK);
        const cert = fs.readFileSync(`${this.config.directConnectApiHttpsCertPath}`);
        options['cert'] = cert;
      } catch (err) {
        this.log.error(`[Platform Error]:  Direct Connect HTTPS Certificate file does not exist or unreadable: ${err}`);
        error = true;
      }

      try {
        fs.accessSync (`${this.config.directConnectApiHttpsKeyPath}`, fs.constants.R_OK);
        const key = fs.readFileSync(`${this.config.directConnectApiHttpsKeyPath}`);
        options['key'] = key;
      } catch (err) {
        this.log.error(`[Platform Error]:  Direct Connect HTTPS Private Key file does not exist or unreadable: ${err}`);
        error = true;
      }

      if (!error) {
        https.createServer(options, WebApp).listen(this.config.directConnectApiPort, apiIP, () => {
          this.log.info(`[Platform Info]:  Direct Connect service started at https://${apiIP}:${this.config.directConnectApiPort}`);
        });
      } 
    } else {
      WebApp.listen(this.config.directConnectApiPort, apiIP, () => {
        this.log.info(`[Platform Info]:  Direct Connect service started at http://${apiIP}:${this.config.directConnectApiPort}`);
      });
    }

    if (!error) {   
      // Create Direct Connect API GET Route Response
      let getAPI = '';

      if (this.deviceObjects.length === 0) {
        getAPI = `[${this.config.remoteApiDisplayName}] [Platform Info]:  No devices synchronised`;
      } else {
        this.accessories.forEach(item => {
          getAPI += `id: ${item.context.device.id} name: ${item.context.device.name} uuid: ${item.context.device.uuid} type: ${item.context.device.type}<br>`;
        });
      }

      // Create Direct Connect API GET API Route
      WebApp.get( '/', ( req, res ) => {
        res.send(`[${this.config.remoteApiDisplayName}] [Platform Info]:  Homebridge Direct Connect API Running <br><br>${getAPI}`);
      });
    
      // Create Direct Connect API PATCH API Route
      if (this.config.jwt === true){
        WebApp.patch('/api/', checkJwt, checkScopes, async (req, res) => this.updateDevice(req, res));
      } else {
        WebApp.patch('/api/', async (req, res) => this.updateDevice(req, res));
      }

      // Create Direct Connect API Error Handler
      WebApp.use((err, req, res, next) => {
        if (!err) {
          return next();
        } else {
          this.log.debug(`[Platform Error]:  Direct Connect API Service: ${err}`);
          res.status(err.status).send(`[${this.config.remoteApiDisplayName}]  ERROR:  Direct Connect API Service: ${err}`);
        }
      });
      return;
    }
  }


  async remoteAPI (method, endpoint, body) {

    if (this.validURL(this.config.remoteApiURL)) {

      if (this.config.jwt && (this.apiJWT.valid === false || this.apiJWT.expires <= Date.now() + 60000)) {
        await this.getAuthToken(); 
      }
      if (this.apiJWT.status === false && this.config.jwt === true) {
        this.log.error(`[Platform Error]:  No valid ${this.config.remoteApiDisplayName} JWT to discover devices`);

        const error = {'errno': `No valid ${this.config.remoteApiDisplayName} JWT to discover devices`};
        return error;

      } else {

        const url = (this.config.remoteApiURL.endsWith('/')) ? this.config.remoteApiURL + endpoint : this.config.remoteApiURL + '/' + endpoint;
        const jwtHeader = {'content-type': 'application/json', 'authorization': `${this.apiJWT.token_type} ${this.apiJWT.access_token}`};
        const headers = (this.config.jwt) ? jwtHeader : {'content-type': 'application/json'};

        let options = {};

        if (this.config.remoteApiRejectInvalidCert === false && this.config.remoteApiURL.indexOf('https') === 0) {
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
            this.log.error(`[Platform Error]:  ${this.config.remoteApiDisplayName} ${method} Failure: ${error}`);
            return error;
          });
        return response;
      }
    } else {
      this.log.error(`[Platform Error]:  Invalid Remote API URL - ${this.config.remoteApiURL}`);
      const error = {'errno': `Invalid Remote API URL - ${this.config.remoteApiURL}`}; 
      return error;
    }
  }
  
  getIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface!.length; i++) {
        const alias = iface![i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
    return '0.0.0.0';
  }

  validURL(str: string) {
    const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
  }
}
  

