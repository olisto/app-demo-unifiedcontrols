<template>
	<div>
		<v-switch v-model="value" label="OnOff" :disabled="attributes.isSenseOnly"></v-switch>
	</div>
</template>

<script>
import axios from 'axios';
export default {
	name: 'OnOffControl',
	props: ['unit', 'attributes', 'socketReady'],
	data: () => ({
		value: false,
	}),
	watch: {
		value(value) {
			axios.post('/api/v1/actions', {
				action: 'setOnOff',
				endpoints: [this.unit.endpoint],
				args: {
					targetOnOffState: value ? 'on' : 'off',
				},
			})
		},
		socketReady: {
			// Socket may have already been ready before this element was initialized
			immediate: true,
			// Triggers when socketReady is changed
			handler(ready) {
				// Only subscribe if it doesn't have the isSetOnly attribute
				if (ready && !this.attributes.isSetOnly) {
					// Subscribe to all states that are relevant to us
					this.$socket.client.emit('subscribe', {states: [`${this.unit.endpoint}.CurrentOnOffState`]});
				}
			},
		},
	},
	sockets: {
		stateUpdate(payload) {
			const forThisUnit = payload[this.unit.endpoint];
			if (forThisUnit && forThisUnit.CurrentOnOffState) {
				if (forThisUnit.CurrentOnOffState === 'on') {
					this.value = true;
				} else if (forThisUnit.CurrentOnOffState === 'off') {
					this.value = false;
				}
			}
		},
	},
}
</script>
