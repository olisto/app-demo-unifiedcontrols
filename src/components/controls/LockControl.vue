<template>
	<div>
		<div v-if="!attributes.isSetOnly">
			<v-label>Lock current state</v-label>
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
		<div v-if="!attributes.isSenseOnly">
			<v-label>Set lock to:</v-label>
			<div>
				<v-btn
						v-for="state in possibleTargetStates"
						:key="state"
						@click="setState(state)"
						:loading="loading"
						:disabled="loading"
						class="mr-4"
				>{{ state }}</v-btn>
			</div>
		</div>
	</div>
</template>

<script>
import axios from 'axios';

export default {
	name: 'LockControl',
	props: ['unit', 'attributes', 'socketReady', 'requestAction'],
	data: () => ({
		currentState: 'unknown',
		targetState: null,
		possibleCurrentStates: [
			'unknown',
			'locked',
		],
		possibleTargetStates: [
			'locked'
		],
		loading: false,
	}),
	watch: {
		socketReady: {
			// Socket may have already been ready before this element was initialized
			immediate: true,
			// Triggers when socketReady is changed
			handler(ready) {
				console.log('have lock', this.unit, this.attributes);
				// Only subscribe if it doesn't have the isSetOnly attribute
				if (ready && !this.attributes.isSetOnly) {
					// Subscribe to all states that are relevant to us
					this.$socket.client.emit('subscribe', {states: [`${this.unit.endpoint}.CurrentLockState`]});
				}
			},
		},
	},
	sockets: {
		stateUpdate(payload) {
			if (payload[this.unit.endpoint]?.CurrentLockState) {
				this.currentState = payload[this.unit.endpoint]?.CurrentLockState;
			}
		},
	},
	async created() {
		if (!this.attributes.isSetOnly) {
			this.currentState = (await axios.get(`/api/v1/state/${this.unit.endpoint}/CurrentLockState`)).data || 'unknown';
		}
		// if (this.attributes.hasUnlocked !== false) {
		this.possibleCurrentStates.push('unlocked');
		this.possibleTargetStates.push('unlocked');
		// }
		if (this.attributes.hasOpen) {
			this.possibleCurrentStates.push('open');
			this.possibleTargetStates.push('open');
		}
		if (this.attributes.hasTimedOpen) {
			this.possibleTargetStates.push('timedOpen');
		}
		if (this.attributes.hasTimedUnlock) {
			this.possibleTargetStates.push('timedUnlock');
		}
		if (this.attributes.hasJammed) {
			this.possibleCurrentStates.push('jammed');
		}
	},
	methods: {
		setState(targetState) {
			this.loading = true;
			this.requestAction({
				action: 'setLockState',
				endpoints: [this.unit.endpoint],
				args: {
					targetLockState: targetState,
				},
			}).finally(() => {
				this.loading = false;
			});
		},
	}
}
</script>
