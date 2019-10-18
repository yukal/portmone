import Vue from 'vue';
import Router from 'vue-router';
import Dashboard from './views/layout/DashboardLayout';

Vue.use(Router);

export default new Router({
    // mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            redirect: 'help',
            // meta: { hideFooter: true },
            component: Dashboard,
            children: [
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    // meta: { hideFooter: true },
                    component: () => import('./views/dashboard.vue')
                },
                {
                    path: '/encode',
                    name: 'encode',
                    component: () => import('./views/encode.vue'),
                },
                {
                    path: '/help',
                    name: 'help',
                    component: () => import('./views/help.vue'),
                },
            ],
        },
        // {
        //     path: '/about',
        //     name: 'about',
        //     component: () => import('./views/About.vue'),
        // },
        // {
        //     path: '/login',
        //     name: 'login',
        //     component: () => import('./views/Login.vue'),
        // },
    ]
});
