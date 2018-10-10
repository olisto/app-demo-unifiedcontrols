# Getting started
Note: Fields with type 'text' can contain either a plain text String, which will then be a human readable text, or a map of locales to Strings, where the strings will then be the human readable text in the specified locale. Currently supported locales are:
- en
- nl
- de
- fr
- es

Not all fields will have all languages available, but 'en' will always be available.

Implementing the unified controls API entails entails 2 major parts:
- A REST API to perform functions like account linking, unit discovery and initiating unit actions
- Webhooks or a websocket to receive asynchronous updates, such as state updates or units themselves being updated (ie, users adding devices to their system)

# REST API calls
## 1. Create (or retrieve) token for user context using partner-id
```
POST /api/v1/user/account
```
### Request:
#### body:
```
partnerKey: String. The supplied API key
userId: String. External (your) reference for the user context
```

### Response:
#### 200:
##### body:
```
token: String. Token to be used for further interaction with this user context
userId: String. External (your) reference for the user context
```

## 2. Retrieve available channel information.
Information about channels that offer the wanted functionality. Also includes any units (devices) already connected.
```
GET /api/v1/channels/descriptions?includeConnections=1&includeUnits=1&classes=RoomThermostat&traits=ControlTemperature,SenseTemperature
```
### Request:
#### Querystring:
```
includeConnections: set to 1 to include details related to channels being connected
includeUnits: set to 1 to include details related to units available for channels that are already connected
classes: list of classes that at least one unit in the channel must have for a channel to be included
traits: list of traits that at least one unit in the channel must have for a channel to be included
```
#### Headers:
```
x-access-token: the token for the user context, as retrieved in (1)
```
### Response:
#### 200:
##### body:
Map of channel ID's to channel descriptions. Each description has the fillowing fields:
```
id: String. Id of the channel
channelInfo: Map. Contains descriptive info about the channel
  title: Text. Human readable title
  description: Text. Extensive description for the channel.
  images: Map. Contains:
    logo: name of the logo image. Images are provided as colorless SVG's. Name should be inserted in: /api/v1/files/{name} to obtain the full URI.
  color: String. HTML color code to be used for materials related to this channel.
unitTypes: Array of Objects. Descriptions for each type of unit offered by the channel. Will only include types that fullfill the requested classes & traits
  id: String.
  title: Text.
  classes: Array of String. TODO. All classes this unit belongs to
  traits:  Array of String. TODO. All traits this unit has.
channelAccounts: Array of Objects. Information related to current connections to the channel. Only present of `includeConnections` was set to 1.
  health: String. Indicates wether the connection to the API is experiencing any problems. Should be 'ok'. When value is other than 'ok' a problem indicator should be displayed and an option to re-link should be offered.
  units: Array of Objects. Actual units available through the current connection. Only present if `includeUnits` was set to 1.
    name: String. User-given (or tech-provided) human readable name for the unit.
    type: String. Reference to the unit type Id.
    internalId: String. Used when referencing this unit in further calls.
    endpoint: String. Used when referencing this unit in further calls.
```
3. Initiate channel linking sequence
```
Browse (GET): /channels/${channelId}/ops/signin?token={token}
```
Takes the user trough the authentication flow appropriate to the given channel. Once the user completes the flow a 'channelaccount created' event as wel as any number of 'unit created' events will be emitted.

4. Update the list of available units. Easiest way would be to re-perform the request in (2). Alternatively:
```
GET /api/v1/units
```
### Request:
#### Querystring:
```
channel: Channel identifier. Only returns units for the specified channel, as retrieved in (2)
classes: list of classes that units must have to be included
traits: list of traits that units must have to be included
```
#### Headers:
```
x-access-token: the token for the user context, as retrieved in (1)
```
### Response:
#### 200:
##### body:
Array of Objects identical to the channelAccounts.#.units field in (2)

5. Perform supported actions on available units
Actions that are supported are defined by the traits that a unit has.
```
/api/v1/actions
```
### Request:
#### Headers:
```
x-access-token: the token for the user context, as retrieved in (1)
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

# Using websockets
The unified controls API utilizes socket.io. Perform the following steps to set up a working connection. How this is done exactly depends on your client library of choice. All payloads are JSON.  

1. Connect to `https://connect[-dev].triggi.com/`
2. emit an 'authenticate' event with the following body:
```
token: String. the user context token as obtained in (1) 
client: String. A connection identifier that usually relates to the application. When omitted the identifier 'default' is assumed, implying that subscription state is shared between all connections.
```
From this point on system events (channel connected, units updated) will be emitted.
3. When discovering new units, subscribe to state updates of interest by emitting a 'subscribe' event with the following body:
```
states: Array of String. Subscriptions to request. Each string being composed of:
  {unit endpoint} + '.' + {state name}
  
```
Unit enpoints are found in the results of API calls in (2) and (4). State names are found in (#Available traits)

4. Receive state update events. 
Event name: 'stateUpdate'
Payload:
```

```

# Classes and traits
Classes are used to indicate that units (devices) belong to a specific category. They should be used for categorization purposes but do not have strict implications as to what a device can do. They are organized hierarchically. Ie, a unit could be a RoomThermostat, which is a specific kind of Thermostat and is distinctive from thermostats in ovens and fridges. 
Traits are used to indicate what units can do exactly. Each trait implies the ability to perform some actions and reports some states and events. Attributes are used to provide device-specific details about a trait, such as range, available values, etc.

## Available classes
- Device
- Thermostat
- RoomThermostat
- Alarm
- Camera
- Light
- Oven
- Fridge
- Washer
- Dishwasher

## Available traits
- ControlOnOff
- ControlTemperature
  - Actions: 
    - setSetpoint: Sets the target temperature
      Arguments:
      - setpoint: Target setpoint in Celcius.
      
      States:
      - setpoint: Current setpoint in Celcius
      - temperature: Current temperature in Celcius
- DetectMotion
- DetectPersons
- DetectSmoke
- SenseElectricityFlow
- SenseHumidity
- SenseLightLevel
- SenseOnOff
- SenseTemperature
- SenseBatteryLevel
- StartStop