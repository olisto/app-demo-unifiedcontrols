<template>
	<v-app>
		<v-app-bar
				app
				color="primary"
				dark
		>

			<v-spacer></v-spacer>
			<v-btn raised :disabled="htmlBool(token)" @click="showLoginPartnerDialog = true">Sign in with partner key</v-btn>
			<v-btn raised :disabled="htmlBool(token)" @click="signInWithAccount">Sign in with Olisto account</v-btn>
			<v-btn raised :disabled="!htmlBool(token)" @click="signout">Sign out</v-btn>
			<v-btn raised :disabled="!htmlBool(token)" @click="showDeleteAccountDialog = true">Delete user context</v-btn>
		</v-app-bar>

		<v-main>
			<HelloWorld/>
		</v-main>
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
					<v-btn color="blue darken-1" text @click="showLoginPartnerDialog = false">Nevermind</v-btn>
					<v-btn color="blue darken-1" text @click="signInWithPartnerKey(); showLoginPartnerDialog = false">Log in</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
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
					<v-btn color="blue darken-1" text @click="showDeleteAccountDialog = false">Cancel</v-btn>
					<v-btn color="red" text @click="deleteAccount(); showDeleteAccountDialog = false">Accept</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
		<v-snackbar
				v-model="showingError"
				color="red"
		>{{errorText}}</v-snackbar>
	</v-app>
</template>

<script>
	import axios from "axios";
	import HelloWorld from './components/HelloWorld';

	export default {
		name: 'App',

		components: {
			HelloWorld,
		},

		data: () => ({
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
				if (!token) {
					return;
				}
				axios.defaults.headers.authorization = `Bearer ${token}`;
				window.localStorage.token = token;
			}
		},

		created() {
			axios.defaults.baseURL = `https://${this.server}`;
			console.log(this.$route.query.token);
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

			signout() {
				this.token = '';
				window.localStorage.removeItem('token');
				this.channelDescriptions = null;
				this.units = null;
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
