<template>
	<div>
		<h1>Brightness</h1>
		<v-slider 
			min="0"
			max="100"
			unit="%"
			v-model="value"
		></v-slider>
	</div>
</template>

<script>
import axios from 'axios';
import _ from 'lodash';

export default {
	name: 'BrightnessControl',
	props: ['unit'],
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
			this.debouncedChangeHandler(value);
		},
	},
}
</script>
