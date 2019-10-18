// import { config } from '../app.config';
import Vue from 'vue';
import vueResource from 'vue-resource';
import App from './App.vue';
import router from './router';
import template from './plugins/template';
import './registerServiceWorker'

// Vue.prototype.appConfig = config;
Vue.config.productionTip = false;
Vue.use(vueResource);
Vue.use(template);

new Vue({
    router,
    render: h => h(App)
}).$mount('#app')
