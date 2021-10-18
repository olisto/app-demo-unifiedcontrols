<template>
	<v-app>
		<v-app-bar
				app
				color="primary"
		>
			<v-spacer></v-spacer>
			<v-btn raised :disabled="htmlBool(token)" @click="showLoginPartnerDialog = true" class="ma-2">Sign in with partner key</v-btn>
			<v-btn raised :disabled="htmlBool(token)" @click="signInWithAccount" class="ma-2">Sign in with Olisto account</v-btn>
			<v-btn raised :disabled="!htmlBool(token)" @click="signout" class="ma-2">Sign out</v-btn>
			<v-btn raised :disabled="!htmlBool(token)" @click="showDeleteAccountDialog = true" class="ma-2">Delete user context</v-btn>
		</v-app-bar>

		<v-main>
			<!-- Controllable devices grid-->
			<v-container fluid v-if="units.length">
				<p>Control a device</p>
				<v-row dense>
					<v-col
							v-for="(unit, index) in units"
							:key="index"
					>
						<v-card
								class="mx-auto"
								width="400"
						>
							<v-card-title>{{unit.name}}</v-card-title>
							<v-card-text>
								<!-- For each trait supported by the unit -->
								<template
									v-for="(trait, index) in unitTypesMap[unit.typeKey].traits"
								>
									<!-- If we have a control component for the trait, render it -->
									<component
										v-if="$options.components[`${trait}Control`]"
										:is="`${trait}Control`"
										:key="index"
										:unit="unit"
									></component>
									<!-- Else just render the name of the trait -->
									<p
										v-else
										:key="index"
									>{{trait}}</p>
								</template>
							</v-card-text>
						</v-card>
					</v-col>
				</v-row>
			</v-container>

			<!-- Connectable channels grid -->
			<v-container fluid v-if="connectableChannels.length">
				<p>{{units.length ? 'Or, c' : 'C'}}onnect to a channel</p>
				<v-row dense>
					<v-col
						v-for="(channel, index) in connectableChannels"
						:key="index"
					>
						<v-card
							class="mx-auto"
							max-width="300"
						>
							<v-img
									height="200px"
									:src="`https://${server}/api/v1/files/${channel.channelInfo.images.header}`"
									class="white--text align-end"
									gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
							>
								<v-card-title>{{ts(channel.channelInfo.title)}}</v-card-title>
							</v-img>
							<v-card-text></v-card-text>
							<v-card-actions class="justify-end">
								<v-btn :href="`https://${server}/api/v1/accessControl/proxy/channel/${channel.id}/ops/signin?bearerToken=${token}`" target="_blank">Connect</v-btn>
							</v-card-actions>
						</v-card>
					</v-col>
				</v-row>
			</v-container>
		</v-main>

		<!-- Dialog: Login with partner key -->
		<v-dialog
				v-model="showLoginPartnerDialog"
		>
			<v-card>
				<v-card-title>Log in using partner key</v-card-title>
				<v-card-text>
					<v-text-field id="partnerId" label="Partner key" v-model="partnerKey" autofocus required></v-text-field>
					<v-text-field id="userId" label="User ID" v-model="userId" required></v-text-field>
				</v-card-text>
				<v-card-actions class="justify-end">
					<v-btn color="blue darken-1" text @click="signInWithPartnerKey(); showLoginPartnerDialog = false">Log in</v-btn>
					<v-btn color="blue darken-1" text @click="showLoginPartnerDialog = false">Nevermind</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<!-- Dialog: Delete account -->
		<v-dialog
				v-model="showDeleteAccountDialog"
		>
			<v-card>
				<v-card-title>Delete user context</v-card-title>
				<v-card-text>
					<h2>Beware!</h2>
					<p>This actually deletes the current user context (account), even if it's a regular Olisto account, and can not be undone! Are you sure?</p>
				</v-card-text>
				<v-card-actions class="justify-end">
					<v-btn color="red" text @click="deleteAccount(); showDeleteAccountDialog = false">Accept</v-btn>
					<v-btn color="blue darken-1" text @click="showDeleteAccountDialog = false">Cancel</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<!-- Toast: Errors -->
		<v-snackbar
				v-model="showingError"
				color="red"
		>{{errorText}}</v-snackbar>
	</v-app>
</template>

<script>
	import axios from "axios";
	import OnOffControl from "./components/controls/OnOffControl.vue";
	import BrightnessControl from "./components/controls/BrightnessControl.vue";

	export default {
		name: 'App',

		components: {
			OnOffControl,
			BrightnessControl,
		},

		data: () => ({
			connectableChannels: [],
			channels: [],
			channelsMap: {},
			units: [],
			unitTypesMap: {},

			// User session, logging in
			token: null,
			partnerKey: null,
			userId: null,

			// Controlling dialogs and toasts
			showLoginPartnerDialog: false,
			showDeleteAccountDialog: false,
			errorText: '',
			showingError: false,

			// Server connection
			server: window.server,
		}),

		watch: {
			token: async function(token) {
				if (token) {
					axios.defaults.headers.authorization = `Bearer ${token}`;
					window.localStorage.token = token;
				} else {
					window.localStorage.removeItem('token');
					delete axios.defaults.headers.authorization;
				}
				await this.loadUnitTypes();
				this.updateUnits();
			},
			partnerKey: function(value) {
				window.localStorage.partnerKey = value;
			},
			userId: function(value) {
				window.localStorage.userId = value;
			},
		},

		async created() {
			axios.defaults.baseURL = `https://${this.server}`;
			this.partnerKey = window.localStorage.partnerKey || '';
			this.userId = window.localStorage.userId || '';
			// Were we loaded with a token in the qs (usually after visiting the sign-in page)?
			if (this.$route.query.token) {
				this.token = this.$route.query.token;
				const newQuery = {...this.$route.query};
				delete newQuery.token;
				this.$router.replace({ query: newQuery });
			} else if (window.localStorage.token) {
				this.token = window.localStorage.token;
			}
		},

		methods: {
			showError(error) {
				this.errorText = error;
				this.showingError = true;
			},

			htmlBool(val) {
				return val ? true : null;
			},

			// Translation funcion. Should select localized string according to UI locale and fall-back to en. Hardcoded to 'en' now.
			ts: function(str) {
				return typeof(str) === 'string' ? str : str.en;
			},

			async loadUnitTypes() {
				if (!this.token) {
					this.unitTypesMap = {};
					this.channelsMap = {};
					this.channels = [];
					return;
				}
				const channelDescriptions = await axios.get(`/api/v1/channels/descriptions`);
				const allChannelsMap = channelDescriptions.data;
				const unitTypesKv = Object.values(allChannelsMap).map(c => c.unitTypes.map(ut => [`${c.id}.${ut.id}`, {channel: c.id, ...ut}])).flat();
				this.unitTypesMap = Object.fromEntries(unitTypesKv.filter(kv => kv[1].traits && kv[1].traits.length));
				this.channelsMap = Object.fromEntries(Object.values(this.unitTypesMap).map(ut => [ut.channel, allChannelsMap[ut.channel]]));
				this.channels = Object.values(this.channelsMap);
			async updateUnits() {
				if (!this.token) {
					this.connectableChannels = [];
					this.units = [];
					return;
				}
				const traits = {OnOff: true};
				const channelAccounts = (await axios.get(`/api/v1/channelaccounts`)).data;
				const channelAccountsMap = Object.fromEntries(channelAccounts.map(ca => ([ca.channel, ca])));
				this.connectableChannels = this.channels.filter(c => !channelAccountsMap[c.id]);
				const allUnits = (await axios.get(`/api/v1/units`)).data;
				this.units = allUnits.map(u => ({
					...u,
					state: {},
					typeKey: `${u.channel}.${u.type}`,
					allTraits: (this.unitTypesMap[`${u.channel}.${u.type}`] || {}).allTraits || [],
					traits: (this.unitTypesMap[`${u.channel}.${u.type}`] || {}).traits || [],
				})).filter(u => u.allTraits.some(t => traits[t]));

			// Session and Account management
			signout() {
				this.token = '';
				this.unitTypesMap = {};
				this.channelsMap = {};
				this.channels = [];
				this.connectableChannels = [];
				this.units = [];
				this.$socket.disconnect();
			},

			signInWithAccount() {
				this.signout();
				document.location = `https://${this.server}/api/v1/usersession/oauth2/signin.html?response_type=bearer&next=${encodeURIComponent(document.location)}#`;
			},

			async signInWithPartnerKey() {
				this.signout();
				try {
					const loginResponse = await axios.post(`/api/v1/user/account`, {
						partnerKey: this.partnerKey,
						userId: this.userId,
					});
					this.token = loginResponse.data.token;
				} catch(e) {
					this.showError(e.response.data.error || 'Login error');
				}
			},

			async deleteAccount() {
				await axios.delete(`/api/v1/user/account`);
				this.signout();
			},
		},
	};
</script>
