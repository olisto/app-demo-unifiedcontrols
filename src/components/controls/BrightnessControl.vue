<template>
	<div>
		<v-slider
			min="0"
			max="100"
			unit="%"
			v-model="value"
			label="Brightness"
			:disabled="attributes.isSenseOnly"
		></v-slider>
	</div>
</template>

<script>
import axios from 'axios';
import _ from 'lodash';

export default {
	name: 'BrightnessControl',
	props: ['unit', 'attributes', 'socketReady'],
	data: () => ({
		value: 50,
	}),
	created() {
		this.debouncedChangeHandler = _.debounce((value) => {
			axios.post('/api/v1/actions', {
				action: 'setBrightness',
				endpoints: [this.unit.endpoint],
				args: {
					targetBrightness: Math.round(value),
				},
			});
		}, 250, { 'maxWait': 1000 });
	},
	watch: {
		value(value) {
			// Debounce: Prevent activating for every intermediate value while sliding
			this.debouncedChangeHandler(value);
		},
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
	}
}
</script>
