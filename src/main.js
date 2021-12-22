import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import VueSocketIO from 'vue-socket.io-extended'
import VueRouter from 'vue-router'
import io from "socket.io-client";

Vue.config.productionTip = false

Vue.use(VueSocketIO, io(window.server, {
  autoConnect: false,
  transports: ["polling", "websocket"],
}));

Vue.use(VueRouter);

const routes = [];

const router = new VueRouter({
  routes // short for `routes: routes`
});

new Vue({
  vuetify,
  router,
  render: h => h(App)
}).$mount('#app');
