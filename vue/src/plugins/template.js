import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// import '@/assets/vendor/nucleo/css/nucleo.css';
import "@/assets/scss/template.scss";

import BootstrapVue from 'bootstrap-vue';
import globalComponents from './global-components';
import globalDirectives from './globalDirectives';
import SidebarPlugin from '@/components/SidebarPlugin/index';
import NotificationPlugin from '@/components/NotificationPlugin/index';
import ResponsePlugin from '@/components/ResponsePlugin/index';

export default {
    install (Vue) {
        Vue.use(BootstrapVue);
        Vue.use(globalComponents);
        Vue.use(globalDirectives);
        Vue.use(SidebarPlugin);
        Vue.use(NotificationPlugin);
        Vue.use(ResponsePlugin);
    }
}
