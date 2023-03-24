<template>
	<div>
		<v-slider
			min="0"
			max="100"
			unit="%"
			label="Brightness"
			:value="value"
			@change="changeValue"
			:disabled="attributes.isSenseOnly"
		></v-slider>
	</div>
</template>

<script>
import axios from 'axios';

export default {
	name: 'BrightnessControl',
	props: ['unit', 'attributes', 'socketReady', 'requestAction'],
	data: () => ({
		value: 50,
	}),
	watch: {
		socketReady: {
			// Socket may have already been ready before this element was initialized
			immediate: true,
			// Triggers when socketReady is changed
			handler(ready) {
				// Only subscribe if it doesn't have the isSetOnly attribute
				if (ready && !this.attributes.isSetOnly) {
					// Subscribe to all states that are relevant to us
					this.$socket.client.emit('subscribe', {states: [`${this.unit.endpoint}.CurrentBrightness`]});
				}
			},
		},
	},
	sockets: {
		stateUpdate(payload) {
			const forThisUnit = payload[this.unit.endpoint];
			if (forThisUnit && forThisUnit.CurrentBrightness && forThisUnit.CurrentBrightness != null && !isNaN(Number(forThisUnit.CurrentBrightness))) {
				this.value = Number(forThisUnit.CurrentBrightness);
			}
		},
	},
	async created() {
		const value = (await axios.get(`/api/v1/state/${this.unit.endpoint}/CurrentBrightness`)).data;
		if (!isNaN(Number(value))) {
			this.value = Number(value);
		}
	},
	methods: {
		changeValue(value) {
			this.requestAction({
				action: 'setBrightness',
				endpoints: [this.unit.endpoint],
				args: {
					targetBrightness: Math.round(value),
				},
			});
		}
	}
}
</script>
