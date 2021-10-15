import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import VueSocketIO from 'vue-socket.io'
import VueRouter from 'vue-router'

Vue.config.productionTip = false

Vue.use(new VueSocketIO({
  debug: true,
  connection: `http://${window.server}`,
  options: {
    // path: '/',
  },
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
