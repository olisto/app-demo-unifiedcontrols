/**
 * Simple demo script that sets up a wehbook connection with the server and listens for all
 * state updates related to the OnOff trait.
 * Some defaults can be configured in `demo-webooks-config.json`
 */
'use strict';
const process = require('process');
const http = require('http');
const readline = require('readline');
const {promisify} = require('util');

const axios = require('axios');
const express = require('express');
const localtunnel = require('localtunnel');

const config = require('./demo-webhooks-config.json');

const log = {d: console.log, w: console.warn, e: console.error, i: console.info};

// Set up a simple webserver that listens for POST calls on /webhooks/someSecret/
const app = express();
app.use(express.json());

// A simple way to check if incomming messages are not spoofed
const secret = 'AENcWvY4Xjjf3nqd';
app.post(`/webhooks/${secret}/`, (req, res) => {
	log.d('got request with payload', req.body)
	res.send();
	// Check that it is a state update webhook message
	if (req.body.type === 'stateUpdate' && req.body.message) {
		// req.body.message is a map of all updated unit endpoints to maps of all updated states to their new value, ie:
		// { 'sonoff.123456789': { CurrentOnOffState: 'off' } }
		for (const endpoint of Object.keys(req.body.message)) {
			for (const state of Object.keys(req.body.message[endpoint])) {
				log.i(`unit ${endpoint} ${state} is now ${req.body.message[endpoint][state]}`);
			}
		}
	} else {
		log.d('unknown webhook message', req.body);
	}
});

const server = http.createServer(app);
server.listen({port: config.demoServerPort});

async function run() {
	// Ask for token if it was not found in the config.json file.
	// A token can be snooped for example from an authenticated session of <https://olisto.github.io/app-demo-unifiedcontrols/>
	// Just inspect the Authorization header of any XHR call to connect.olisto.com, and strip off the 'Bearer ' prefix.
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	const token = config.olistoToken || await new Promise((res) => rl.question("Please enter a valid Bearer token\n", res));
	rl.close();
	axios.defaults.baseURL = config.olistoBaseUrl;
	axios.defaults.headers = {
		Authorization: `Bearer ${token}`,
	};

	// Use localtunnel to get a public url that is tunnelled to this locally running server port
	// see https://github.com/localtunnel/localtunnel#user-content-api
	// This is the URL we will register for the webhooks.
	const tunnel = await localtunnel({port: config.demoServerPort});
	log.d('have tunnel url: ' + tunnel.url);
	// Get all units in the user's account, and all channel descriptions so we can tell which ones support our traits
	const [units, channelDescriptions] = await Promise.all([
		axios.get('/api/v1/units').then(r => r.data),
		axios.get('/api/v1/channels/descriptions?lang=en').then(r => r.data),
	]);

	// Find endpoints for all units that have the OnOff trait
	const endpointsWithOnOff = [];
	for (const unit of units) {
		// Find description for the unit's channel, then from that the description for the units' type
		const type = (channelDescriptions[unit.channel] || {unitTypes: []}).unitTypes.find(t => t.id === unit.type);
		// This simple demo only listens for OnOff related updates;
		// If a unit does not have the OnOff trait, it's not interesting for us
		if (!(type && type.traits && (
			type.traits.includes('OnOff') ||
			type.traits.includes('Lock') ||
			type.traits.includes('ContactSensor') ||
			false
		))) {
			continue;
		}
		endpointsWithOnOff.push({endpoint: unit.endpoint, traits: type.traits});
	}
	log.d('endpoints with supported traits', endpointsWithOnOff);

	if (endpointsWithOnOff.length === 0) {
		log.i('no endpoints with supported traits; exitting');
		return;
	}
	// Subscribing is done in two parts: first we need to register ourselves as a webhook listener
	const createWebhookResult = (await axios.post('/api/v1/stateWebhooks?client=demo-webhook', {
		url: `${tunnel.url}/webhooks/${secret}/`,
	})).data;

	// Then we need to create a subscription for that listener for each unit that we want updates for
	const subscribeResults = await Promise.all(endpointsWithOnOff.map(({endpoint, traits}) => {
		const states = traits.map(trait => ({
				OnOff: 'CurrentOnOffState',
				Lock: 'CurrentLockState',
				ContactSensor: 'ContactSensorState',
			}[trait])).filter(x => x);
		log.d(`subscribing to endpoint ${endpoint} states ${states.join(',')}`);
		return axios.post(`/api/v1/stateWebhooks/${createWebhookResult._id}/stateSubscriptions?client=demo-webhook`, {
			// Each subscription is for one endpoint
			endpoint,
			// Each subscription can cover several states
			states,
		}).then(r => r.data);
	}));
	log.d('Running, press CTRL+c to exit');
	// Run for some time
	process.on('SIGINT', async () => {
		log.d('Terminating');
		// Clean up the webhook when done
		const r = await axios.delete(`/api/v1/stateWebhooks/${createWebhookResult._id}?client=demo-webhook`);
		tunnel.close();
		server.close();
	});
}

run().catch(log.w);
