import i18n from './i18n-ua';

function validResponse(response) {
    let type = 'danger';
    let title = i18n[ 'Request error' ];

    if (!response.ok) {
        let message = i18n.hasOwnProperty(response.statusText)
            ? i18n[ response.statusText ]
            : response.statusText
        ;
        message = `${response.status} ${message}`;
        this.$notify({ type, title, message });
        return false;
    }

    if (!response.body.success) {
        const message = i18n.hasOwnProperty(response.body.msg)
            ? i18n[ response.body.msg ]
            : i18n[ 'Unknown error' ]
        ;
        this.$notify({ type, title, message });
        return false;
    }

    return true;
}

const ResponsePlugin = {
    install(Vue, options) {
        Vue.prototype.$validResponse = validResponse;
    }
};

export default ResponsePlugin;
