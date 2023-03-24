<template>
	<div>
		<v-label>Contact sensor state</v-label>
		<v-chip-group>
			<v-chip
					v-for="state in possibleCurrentStates"
					:key="state"
					outlined
			>
				<v-icon
						v-if="currentState === state"
						left
						color="green"
				>
					mdi-check
				</v-icon>
				{{ state }}
			</v-chip>
		</v-chip-group>
	</div>
</template>

<script>
import axios from 'axios';

export default {
	name: 'ContactSensorControl',
	props: ['unit', 'attributes', 'socketReady'],
	data: () => ({
		currentState: 'unknown',
		possibleCurrentStates: [
			'unknown',
			'open',
			'closed',
		],
	}),
	watch: {
		socketReady: {
			// Socket may have already been ready before this element was initialized
			immediate: true,
			// Triggers when socketReady is changed
			handler(ready) {
				console.log('have ContactSensor', this.unit, this.attributes);
				// Subscribe to all states that are relevant to us
				if (ready) {
					this.$socket.client.emit('subscribe', {states: [`${this.unit.endpoint}.ContactSensorState`]});
				}
			},
		},
	},
	sockets: {
		stateUpdate(payload) {
			if (payload[this.unit.endpoint]?.ContactSensorState) {
				this.currentState = payload[this.unit.endpoint]?.ContactSensorState;
			}
		},
	},
	async created() {
		this.currentState = (await axios.get(`/api/v1/state/${this.unit.endpoint}/ContactSensorState`)).data || 'unknown';
	},
}
</script>
