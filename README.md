
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# homebridge-plugin-garage

This is a Homebridge dynamic platform plugin which exposes a garage door accessory and light accessories through a remote API.  

Features:

Accessories are dynamically created through remote API when Homebridge is started
Control remote accessories through API
Support of dynamic updates from accessories to support garage door state monitoring and local garage door / light activation.


Optional Features:

HTTPS
JSON Web Token Security (Auth0 Tested)
Support of Self-Signed Certificate


## Install

The plugin can be installed by running the command:  sudo npm -g homebridge-plugin-garage


### Configuration

The configuration of the plugin can be done via the Homebrige GUI or through the Homebridge configuration file.

{
            "url": "http://<host>:<port>/<endpoint>/",
            "rejectInvalidCert": false,
            "apiPort": 8001,
            "https": false,
            "httpsCertPath": "/<certificate path>/<certificate>",
            "httpsKeyPath": "/<private key path>/<private key>",
            "jwt": false,
            "jwtAudience": "https://<JWT API Application>/",
            "jwtIssuer": "https://<JWT Issuer>/",
            "jwtClientID": "<JWT Client ID>",
            "jwtClientSecret": "<JWT Client Secret>",
            "platform": "Garage"
        }


#### PLATFORM API

GET / - Shows all devices registered to Homebridge from this platform

PATCH /API/ - Updates characteristic of accessory using the UUID field as the index


##### REMOTE API

GET /API/ - Shows device summary
GET /API/DEVICES/ - Shows all devices and their current status and characteristics
GET /API/DEVICES/{id:} - Shows current status and characteristics of device with id = {id:}

PATCH /API/DEVICES/{id:} - Updates status and characteristics of device with id = {id:}



