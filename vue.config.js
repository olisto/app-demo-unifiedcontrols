module.exports = {
	publicPath: process.env.RUN_ENV === 'gh-pages' ? '/app-demo-unifiedcontrols/' : '/',
	pages: {
		index: {
			entry: 'src/main.js',
			title: 'Unified Controls Demo',
		},
	},
	transpileDependencies: [
		'vuetify'
	]
};
