const util = require('util');
const datas = require('./datas');
const reporter = require('./reporter');
const Parser = require('./HtmlParser');
const breq = require('./Brequest')({
    reporters: [ reporter.stdout ],
});

const api = {};
const URL_HOST = 'https://www.portmone.com.ua';
const URL_FORM = '%s/r3/new-kyivstar/?%s';
const URL_PAY  = '%s/r3/secure/pay/do-payment';
const URL_PROMO = '%s/r3/secure/check/kyivstar-promo';

api.ID = 'Portmone';

api.promo = async function promo(description, additions) {
    const action = util.format(URL_PROMO, URL_HOST);
    const values = Object.assign({ description }, additions);

    return breq.postXHR(action, values)
        .then(resp => callback(resp, 'promo'))
        .catch(err => err)
    ;
}

api.form = async function form(queryData) {
    const action = util.format(URL_FORM, URL_HOST, breq.encodeURI(queryData));

    return breq.get(action)
        .then(resp => callback(resp, 'form'))
        .catch(err => err)
    ;
}

api.pay = async function pay(form, additions) {
    const action = util.format(URL_PAY, URL_HOST);
    const values = Object.assign({}, form.values, additions);

    return breq.post(action, values)
        .then(resp => callback(resp, 'pay'))
        .catch(err => err)
    ;
}

api.confirm = async function confirm(form) {
    const action = urlPrepend(URL_HOST, form.action);

    return breq.post(action, form.values)
        .then(resp => callback(resp, 'confirm'))
        .catch(err => err)
    ;
}

api.done = async function done(form) {
    const action = urlPrepend(URL_HOST, form.action);

    return breq.post(action, form.values)
        .then(resp => /Оплата пройшла успішно/ig.test(resp.body))
        .catch(err => err)
    ;
}

function callback(resp, scenario) {
    let data = '';

    switch(scenario) {
        case 'promo':
            data = datas.getDataFrom(resp, 'body.response.description');
            break;

        case 'form':
            data = new Parser(resp.body).getFormsData('#ptm-form');
            break;

        case 'pay':
            const htmlForm = datas.getDataFrom(resp, 'body.response.form');
            data = new Parser(htmlForm).getFormsData('#apiForm');
            break;

        case 'confirm':
            data = new Parser(resp.body).getFormsData('#apiForm');
            break;
    }

    return data;
}

function urlPrepend(prefix, url) {
    return url[0] === '/' ?prefix+url :url;
}

module.exports = api;
