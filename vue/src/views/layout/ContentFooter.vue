<template>
    <b-container>
        <footer class="footer">
            <hr class="mt-5" />
            <div class="copyright text-center text-lg-left text-muted pb-5">
                © {{ year }}
                <a :href="link" class="font-weight-bold ml-1" target="blank">{{ author }}</a>
                <br />
                <small>based on node.js &amp; vue.js</small>
            </div>
        </footer>
    </b-container>
</template>

<script>
export default {
    data() {
        return {
            year: "2019",
            author: "Alexander",
            link: "https://www.facebook.com/alexander.yukal",
        };
    }
}
</script>

<style></style>
