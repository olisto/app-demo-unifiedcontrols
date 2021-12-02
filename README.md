# Unified controls sample app
This sample application showcases the basic interaction involved in using Olisto Unified controls: 
- Getting/retrieving an Olisto user context or account
- Discovering available channels and their unit types with their capabilities
- Discovering connected channels and available units
- Connecting channels
- Invoking actions on a connected unit
- Handling state updates from a connected unit

It is build as a single-page web-app, based on the Vue framework, using Vuetify as a UI component library.
It can be seen in action on <https://olisto.github.io/app-demo-unifiedcontrols/#/>

Also see demo-webooks.js for a sort example of working with Webhook subscriptions.

## Running the app
### Compile and hot-reloads for development
```
npm install
npm run serve
```

### Compile and minify for production
```
npm install
npm run build
npm start
```

### Lint and fix files
```
npm install
npm run lint
```

# Getting started using Olisto Unified Controls
Note: Fields with type 'text' can contain either a plain text String, which will then be a human readable text, or a map of locales to Strings, where the strings will then be the human readable text in the specified locale. Currently supported locales are:
- en
- nl
- de
- fr
- es

Not all fields will have all languages available, but 'en' will always be available.

Implementing the unified controls API entails 2 major parts:
- A REST API to perform functions like account linking, unit discovery and initiating unit actions
- Webhooks or a websocket to receive asynchronous updates, such as state updates or units themselves being updated (ie, users adding devices to their system)

# REST API calls
## 1. Create (or retrieve) token for user context using partner-id
```
POST /api/v1/users/account
```
### Request:
#### body:
```
partnerKey: String. The supplied API key
partnerUserId: String. Your reference for the user context
```

### Response:
#### 200:
##### body:
```
token: String. Token to be used for further interaction with this user context
userId: String. External (your) reference for the user context
```

## 2. Retrieve available channel information.
Information about available channels. This will list all available channels, for each available channel the available unit types and for each available unit types the traits it supports. Traits indicate the functionality of the unit type; each trait prescribes actions, conditions and events that must be supported by units with that trait. The specifics for every trait can be found at <https://connect.olisto.com/documentation/traits>.
Also see the [API call specification](https://connect.olisto.com/documentation/api/#tag/Channels/paths/~1api~1v1~1channels~1descriptions/get).
```
GET /api/v1/channels/descriptions
```
### Request:
#### Headers:
```
authorization: Bearer + the token for the user context, as retrieved in (1)
```
### Response:
#### 200:
##### body:
Map of channel ID's to channel descriptions. Each description has the following fields:
```
id: String. Id of the channel
channelInfo: Map. Contains descriptive info about the channel
  title: Text. Human readable title
  description: Text. Extensive description for the channel.
  images: Map. Contains:
    logo: String. Name of the logo image. Most logo's are provided as colorless SVG's. Name should be inserted in: /api/v1/files/{name} to obtain the full URI.
    header: String. Name of the image suitable as a page header. Provided as jpeg or png. Name should be inserted in: /api/v1/files/{name} to obtain the full URI.    
  color: String. HTML color code to be used for materials related to this channel.
unitTypes: Array of Objects. Descriptions for each type of unit offered by the channel. Will only include types that fullfill the requested classes & traits
  id: String.
  title: Text.
  traits:  Array of String. All traits this unit has.
  attributes: Map of attributes related to the traits the unit type has
```

## 3. Retrieve list of channel accounts (currently connected channels)
A channel account represents the connections between a user context and a channel; it is created when the user context is linked to the channel. Channel accounts can be listed to discover the available channel connections for a given user context, and find out what their state is.
```
GET /api/v1/channelaccounts
```
### Request:
#### Querystring:
```
status: Current status of the connection progress. Specify 'connected' to retrieve accounts only for fully connected channels.
```
#### Headers:
```
authorization: Bearer + the token for the user context, as retrieved in (1)
```
### Response:
#### 200:
##### body:
List of connections to channels (channel accounts). Each channel account has the following fields:
```
_id: String. Id for the connection
channel: String. Id of the channel connected to 
status: String. Current status of the connection progress. 'connected' for fully connected channels, any other value can be considered as 'not connected' for most purposes. 
health: String. Current state of the account. 'ok' for a normally functional connection; 'authFailed' for connections with authentication problems (need user to re-connect); any other for specific problems.
```

## 4. Retrieve list of available units
```
GET /api/v1/units
```
### Request:
#### Headers:
```
authorization: Bearer + the token for the user context, as retrieved in (1)
```
### Response:
#### 200:
##### body:
List of available units. Each unit has the following fields:
```
_id: String. Id for the unit
name: String. The human-readable name for the unit
channel: String. Id of the channel the unit is connected to
type: String. Id of the type of the unit
channelAccount: String. Id of the channel account the unit is connected to
endpoint: String. Internal identifier to be used when invoking an action on the unit
```

## 5. Initiate channel linking sequence
```
Browse (GET): /api/v1/accessControl/proxy/channel/{channelId}/ops/signin?bearerToken={token}
```
Takes the user trough the authentication flow for the given channel.
Once the user completes the flow a 'channel account created' event as wel as any number of 'unit created' events will be emitted.
The list of connected channels and available units should be updated after this, either by processing the 'channel account created' and 'unit created' events or by re-loading the channel accounts and units from the server.

## 6. Perform supported actions on available units
Actions that are supported are defined by the traits that a unit has. All traits and their supported interactions are documented on <https://connect.olisto.com/documentation/traits>.
```
/api/v1/actions
```
### Request:
#### Headers:
```
authorization: Bearer + the token for the user context, as retrieved in (1)
```
#### body:
```
endpoints: Array of String. Endpoints of units that the requested action should be execute on. Currently only 1 endpoint at a time is supported.
action: String. Name of the action to execute.
args: Map. Key/value pairs of arguments that accompany the action.
```
### Response:
#### 200:
##### body:
Note: This will change to accomodate for having multiple endpoints in 1 request!
```
String: status code. 'triggi/ok' if executed correctly. 
```
### Example
For example, the OnOff trait defines a `setOnOff` action, which turns a device on or off. It defines one argument for this action: `targetOnOffState` which should have a value of `'on'` or `'off'`. To use this action for turning on a previously discovered unit with endpoint `demo.1234`, make a POST call to the `/api/v1/actions/` API with the following body:
```json
{
  "endpoints": ["demo.1234"],
  "action": "setOnOff",
  "args": {
    "targetOnOffState": "on"
  }
}
```
If all went well, the endpoint should return the following `text/plain` response:
```
olisto/ok
```
The trait describes several other possible response codes and their meaning. 

# Using websockets
The unified controls API utilizes socket.io. Perform the following steps to set up a working connection. How this is done exactly depends on your client library of choice. All payloads are JSON.  

1. Connect to `https://connect[-dev].olisto.com/`. Include the following header:
- `Authorization`: String. `Bearer ` + the user context token as obtained in (1) 
  
And include the following query parameter:
- `x-client-id`: String. A connection identifier that usually relates to the application. Susbcriptions are shared among connections that use the same client id. When omitted the identifier 'default' is assumed, implying that subscription state is shared between all connections. 

Alternatively, instead of including the mentioned headers, an 'authenticate' message can be emitted with the following body:
```
token: String. Same as the token in the authorization header. 
client: String. Same as the 'x-client-id' header.
```
From this point on system events (channel connected, units updated) will be emitted.

2. When discovering new units, subscribe to state updates of interest by emitting a 'subscribe' event with the following body:
```
states: Array of String. Subscriptions to request. Each string being composed of:
  {unit endpoint} + '.' + {state name}
  
```
Unit enpoints are found in the results of API calls in (2) and (4). State names are found in (#Available traits)

3. Receive state update events. 

* Event name: 'stateUpdate'
* Payload: Map of updated endpoints to map of updated states to new values.
```
{
	{endpoint}: {
		{state}: value
	}
}
```
value can be of any type, depending on the type associated to the specific state.

# Traits
Traits are used to indicate what units can do exactly. Each trait implies the ability to perform some actions and reports some states and events. Attributes are used to provide device-specific details about a trait, such as range, available values, etc.

## Available traits
- OnOff
- Brightness
- TemperatureSensor
- TemperatureController
- ColorTemperature
- Color
- Alarm
- ArmDisarm
- MotionSensor
- ContactSensor
