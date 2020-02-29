<template>
    <nav class="navbar navbar-vertical fixed-left navbar-expand-md navbar-light bg-white" id="sidenav-main">
        <b-container>

            <!--Toggler-->
            <navbar-toggle-button @click.native="showSidebar">
                <span class="navbar-toggler-icon"></span>
            </navbar-toggle-button>
            <router-link class="navbar-brand" to="/">
                <img :src="logo" class="navbar-brand-img" width=38 alt="vicky">
            </router-link>

            <slot></slot>
            <div v-show="$sidebar.showSidebar" class="navbar-collapse collapse show" id="sidenav-collapse-main">
                <ul class="navbar-nav">
                    <slot name="links"></slot>
                </ul>
                <hr class="my-3">
            </div>
        </b-container>
    </nav>
</template>

<script>
import NavbarToggleButton from '@/components/NavbarToggleButton'
export default {
    name: 'sidebar',
    components: {
        NavbarToggleButton
    },
    props: {
        logo: {
            type: String,
            default: 'img/brand.svg',
            description: 'Sidebar app logo'
        },
        autoClose: {
            type: Boolean,
            default: true,
            description: 'Whether sidebar should autoclose on mobile when clicking an item'
        }
    },
    provide() {
        return {
            autoClose: this.autoClose
        };
    },
    methods: {
        closeSidebar() {
            this.$sidebar.displaySidebar(false)
        },
        showSidebar() {
            this.$sidebar.displaySidebar(true)
        }
    },
    beforeDestroy() {
        if (this.$sidebar.showSidebar) {
            this.$sidebar.showSidebar = false;
        }
    }
};
</script>
