const util = require('util');
const datas = require('./datas');
const reporter = require('./reporter');
const Parser = require('./HtmlParser');
const breq = require('./Brequest')({
    reporters: [ reporter.stdout ],
});

const api = {};
const URL_HOST = 'https://acs.privatbank.ua';
const URL_CHECKPIN = '%s/pCheckPIN.jsp';

api.ID = 'Privatbank';

api.form = async function form(form) {
    let { action, values } = form;

    return breq.post(action, values)
        .then(resp => callback(resp, 'form'))
        .catch(err => err)
    ;
}

api.pay = async function pay(form, additions) {
    const { action, values } = form;
    const data = Object.assign({}, values, additions);

    return breq.post(action, data)
        .then(resp => callback(resp, 'pay'))
        .catch(err => err)
    ;
}

api.sendPin = async function sendPin(pin, sid) {
    const action = util.format(URL_CHECKPIN, URL_HOST);
    const values = {
        pPasswordID: '',
        pPassword: pin,
        __rnd: Math.random(),
    };

    return breq.post(action, values)
        .then(resp => callback(resp, 'pin'))
        .catch(err => err)
    ;
}

function callback(resp, scenario) {
    let data = '';

    switch(scenario) {
        case 'form':
            data = new Parser(resp.body).getFormsData('#form_send');
            break;

        case 'pay':
            data = datas.getSessionID('jsessionid', resp.res.headers['set-cookie']);
            break;

        case 'pin':
            data = new Parser(resp.body).getFormsData('#fPaREs');
            break;
    }

    return data;
}

module.exports = api;
