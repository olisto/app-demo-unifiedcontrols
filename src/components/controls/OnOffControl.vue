<template>
	<div>
		<h1>OnOff</h1>
		<v-switch v-model="value"></v-switch>
	</div>
</template>

<script>
import axios from 'axios';
export default {
	name: 'OnOffControl',
	props: ['unit'],
	data: () => ({
		value: false,
	}),
	watch: {
		value(value) {
			console.log('value changed', value);
			axios.post('/api/v1/actions', {
				action: 'setOnOff',
				endpoints: [this.unit.endpoint],
				args: {
					targetOnOffState: value ? 'on' : 'off',
				},
			})
		},
	},
}
</script>
