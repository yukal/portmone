// import datas from '@/lib/datas';

export default {
    data() {
        return {
            authKey: '',
            CCARD: {
                MM: null,
                YY: null,
                cvv2: null,
                card_number: null
            },
        };
    },

    methods: {
        onSubmit(evt) {
            evt.preventDefault();
            this.$http.post('/v1/bill/encode-ccard', this.CCARD)
                .then(response => {
                    if (this.$validResponse(response)) {
                        this.authKey = response.body.authKey;
                    }
                })
                .catch(this.$validResponse)
            ;
        },
    },

    computed: {
        month: function() {
            const items = [{ text: 'Місяць', value: null }];

            for (let n=1; n<13; n+=1) {
                const num = n<10 ?`0${n}` :n;
                items.push(num);
            }

            return items;
        },

        years: function() {
            const fullYear = new Date().getFullYear();
            const year = Number.parseInt(fullYear.toString().substr(-2), 10);
            const items = [{ text: 'Рік', value: null }];

            for (let text=year, max=year+14; text<max+1; text+=1) {
                items.push(text);
            }

            return items;
        },
    },

    // computed: {},
    // mounted() {},
};
