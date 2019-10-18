<template>
    <div class="wrapper" :class="{ 'nav-open': $sidebar.showSidebar }">
        <side-bar :background-color="sidebarBackground" short-title="Kyivstar">
            <template slot="links">
                <sidebar-item :link="{name: 'Головна', path: '/dashboard'}" />
                <sidebar-item :link="{name: 'Кодування', path: '/encode'}" />
                <sidebar-item :link="{name: 'Допомога', path: '/help'}" />
            </template>
        </side-bar>

        <div class="main-content" :data="sidebarBackground">
            <!-- <dashboard-navbar></dashboard-navbar> -->
            <div @click="toggleSidebar">
                <fade-transition :duration="200" origin="center top" mode="out-in">
                    <router-view></router-view>
                </fade-transition>
            </div>
        </div>
        <content-footer v-if="!$route.meta.hideFooter"></content-footer>
    </div>
</template>

<script>
// import DashboardNavbar from './DashboardNavbar.vue';
import ContentFooter from "./ContentFooter.vue";
import { FadeTransition } from "vue2-transitions";

export default {
    components: {
        // DashboardNavbar,
        ContentFooter,
        FadeTransition
    },
    data() {
        return {
            sidebarBackground: "vue" //vue|blue|orange|green|red|primary
        };
    },
    methods: {
        toggleSidebar() {
            if (this.$sidebar.showSidebar) {
                this.$sidebar.displaySidebar(false);
            }
        }
    }
};
</script>

<style lang="scss">
</style>
