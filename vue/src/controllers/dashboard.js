// import datas from '@/lib/datas';

export default {
    data() {
        return {
            data: {
                amount: '1',
                phone: '',
                authKey: '',
            },
            confirmData: {
                pin: '',
            },
            location: {},
        };
    },

    methods: {
        onSubmit(evt) {
            evt.preventDefault();
            this.$http.post('/v1/bill/pay', this.data)
                .then(response => {
                    if (this.$validResponse(response)) {
                        const { location, jsessionid, PHPSESSID } = response.body;
                        this.confirmData.sid = jsessionid;
                        this.confirmData.PHPSESSID = PHPSESSID;
                        this.location = location;
                    }
                })
                .catch(this.$validResponse)
            ;
        },

        onConfirm(evt) {
            evt.preventDefault();
            this.$http.post('/v1/bill/pay-confirm', this.confirmData)
                .then(response => {
                    if (this.$validResponse(response)) {
                        const title = 'Успішно';
                        const message = `+38${this.data.phone}`;
                        this.$notify({ type:'success', title, message });
                    }
                })
                .catch(this.$validResponse)
            ;
        },
    },

    // computed: {},
    // mounted() {},
};
