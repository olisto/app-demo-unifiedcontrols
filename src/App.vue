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
			<!-- Controllable units grid -->
			<v-container fluid v-if="units.length">
				<p>Control a device</p>
				<v-row dense>
					<!-- For each unit -->
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
									v-for="(trait, index) in unitTypesMap[unit.typeKey].allTraits"
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

			<!-- channels grid -->
			<v-container fluid v-if="channels.length">
				<p>{{units.length ? 'Or, c' : 'C'}}onnect to a channel</p>
				<v-row dense>
					<v-col
						v-for="(channel, index) in channels"
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
								<v-btn
									v-if="!connectedChannelsMap[channel.id]"
									:href="`https://${server}/api/v1/accessControl/proxy/channel/${channel.id}/ops/signin?bearerToken=${token}`"
									target="_blank"
								>Connect</v-btn>
								<v-btn
									v-else
									@click="disconnectChannel(channel)"
								>Disconnect</v-btn>
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
					<v-text-field label="Partner key" v-model="partnerKey" autofocus required></v-text-field>
					<v-text-field label="User ID" v-model="partnerUserId" required></v-text-field>
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

	// All supported traits
	const traits = {
		OnOff: OnOffControl,
		Brightness: BrightnessControl,
	};

	export default {
		name: 'App',

		components: {
			// Remap all keys in `traits` to `key` + Control
			...Object.fromEntries(Object.keys(traits).map(k => [`${k}Control`, traits[k]])),
		},

		data: () => ({
			channels: [],
			channelsMap: {},
			unitTypesMap: {},
			connectedChannelsMap: {},
			units: [],

			// User session, logging in
			token: null,
			partnerKey: null,
			partnerUserId: null,

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
			partnerUserId: function(value) {
				window.localStorage.partnerUserId = value;
			},
		},

		async created() {
			axios.defaults.baseURL = `https://${this.server}`;
			this.partnerKey = window.localStorage.partnerKey || '';
			this.partnerUserId = window.localStorage.partnerUserId || '';
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
				// Load all channel + unit type defintions from server
				const allChannelsMap = (await axios.get(`/api/v1/channels/descriptions`)).data;
				// Take unit types from each channel
				const unitTypes = Object.values(allChannelsMap)
					// extend with channel ID
					.map(c => c.unitTypes.map(ut => ({channel: c.id, ...ut})))
					// flatten into single list
					.flat()
					// And filter out those without any supported traits
					.filter(u => u.allTraits && u.allTraits.some(t => traits[t]));
				// Map unitTypes, index by `channelId.unitTypeId`
				this.unitTypesMap = Object.fromEntries(unitTypes.map(ut => [`${ut.channel}.${ut.id}`, ut]));

				// Construct map of useful channels found in the filtered list of unitTypes. De-duplicates.
				// (this gives us those channels containing at least one unit with selected traits)
				this.channelsMap = Object.fromEntries(unitTypes.map(ut => [ut.channel, allChannelsMap[ut.channel]]));
				// Derive list of useful channels from channelsMap, as that is de-duplicated already.
				this.channels = Object.values(this.channelsMap);
			async updateUnits() {
				if (!this.token) {
					this.units = [];
					return;
				}
				// Retrieve accounts for connected channels in the account. Note that we globally set the Bearer token when logged in
				const channelAccounts = (await axios.get(`/api/v1/channelaccounts?status=connected`)).data;
				this.connectedChannelsMap = Object.fromEntries(channelAccounts.map(ca => [ca.channel, ca]));
				// Retrieve all available units in the account
				const allUnits = (await axios.get(`/api/v1/units`)).data;
				// Enrich and filter unit data
				this.units = allUnits.map(u => {
					const typeKey = `${u.channel}.${u.type}`;
					// (later) filter out those for which we don't have a type definition
					if (!this.unitTypesMap[typeKey]) {
						return null;
					}
					return {
						...u,
						// Add typeKey for easy type definition lookup
						typeKey,
					};
				}).filter(u => u);
			},

			// Session and Account management
			signout() {
				this.token = '';
				this.unitTypesMap = {};
				this.channelsMap = {};
				this.channels = [];
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
					const loginResponse = await axios.post(`/api/v1/users/account`, {
						partnerKey: this.partnerKey,
						partnerUserId: this.partnerUserId,
					});
					this.token = loginResponse.data.token;
				} catch(e) {
					this.showError(e.response.data.error || 'Login error');
				}
			},

			async deleteAccount() {
				await axios.delete(`/api/v1/users/`);
				this.signout();
			},

			async disconnectChannel(channel) {
				await axios.delete(`/api/v1/channelaccounts/${this.connectedChannelsMap[channel.id]._id}`);
				this.updateUnits();
			},
		},
	};
</script>
