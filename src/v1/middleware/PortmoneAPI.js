const EventEmitter = require('events');
const util = require('util');

const crypt = require('./crypt');
const datas = require('./datas');
const Parser = require('./HtmlParser');

const PM_HOST = 'https://www.portmone.com.ua';
const PB_HOST = 'https://acs.privatbank.ua';

class PortmoneAPI extends EventEmitter {
    constructor(config, client) {
        super();

        this.config = config;
        this.client = client;

        // Portmone payment data
        this.pmPayData = {};

        // Privatbank payment data
        this.pbPayData = {};

        this.on('api-scenario', onScenario);
    }

    bill(currency, amount, phone, CCARD) {
        this.location = this.config.choords[ datas.randomInt(0, this.config.choords.length-1) ];
        const fingerprint = crypt.md5(new Date().toISOString());
        const self = this;

        if (amount) {
            this.pmPayData.bill_amount = amount;
        }

        if (currency) {
            this.pmPayData.currencyAPay = currency.toUpperCase();
        }

        if (phone) {
            this.phone = phone;
            // const parsedPhone = datas.parseMobilePhone(phone);
            this.pmPayData.phone = datas.getMaskFrom(phone, '+XXX XX XXX XX XX');
            this.pmPayData.description = phone.slice(-9);
        }

        if (CCARD) {
            if (!CCARD.hasOwnProperty('card_number_mask')) {
                CCARD.card_number_mask = datas.getMaskCardN16(CCARD.card_number);
            }

            Object.assign(this.pmPayData, CCARD, this.config.kyivstar);
        }

        this.pmPayData.fp = fingerprint;
        this.pbPayData = {
            lat: this.location.lat, 
            lng: this.location.lng,
            fp: crypt.md5(fingerprint), 
        }

        return new Promise(function promise(resolve, reject) {
            self.on('api-done', function onBillDone(scenarios, response) {
                const { jsessionid } = response.parsedData;

                if (jsessionid) {
                    resolve({ location: this.location });
                } else {
                    reject(null);
                    console.error(response.body);
                }
            });

            onPortmoneForm.call(self);
        });
    }

    checkPin(pin) {
        const self = this;

        return new Promise(function promise(resolve, reject) {
            self.on('api-done', function onCheckPinDone(scenarios, response) {
                const { success } = response.parsedData;
                success ?resolve(response) :reject(response);
            });

            onPortmoneCheckPin.call(self, pin);
        });
    }
}


function urlPrepend(prefix, url) {
    return url[0] === '/' ?prefix+url :url;
}

function getScenarioName(data) {
    const name = datas.isFunction(data) ?data.name :data.callee.name;

    // return name.replace(/[A-Z]/g, function(val, index) {
    return name.substr(2).replace(/[A-Z]/g, function(val, index) {
        return index==0 ?val.toLowerCase() :`-${val.toLowerCase()}`;
    });
}

function getScenarios(data, nextScenarioName) {
    const scenarios = {
        'portmone-form': onPortmonePromo,
        'portmone-promo': onPortmonePay,
        'portmone-pay': onPrivatbankForm,
        'privatbank-form': onPrivatbankPay,
        // 'privatbank-pay': undefined,
        'portmone-check-pin': onPortmoneConfirm,
        'portmone-confirm': onPortmoneDone,
        // 'portmone-done': undefined,
    };

    const name = getScenarioName(data);
    const nextScenario = nextScenarioName ?nextScenarioName :scenarios[name];

    return [ name, nextScenario ];
}

async function onScenario(scenarios, response) {
    const [ currScenario, nextScenario ] = scenarios;

    if (response) {
        let parsedData = datas.getDataFrom(response, 'parsedData');
        this.emit('api-data', parsedData, response, scenarios);
    }

    if (datas.isFunction(nextScenario)) {
        nextScenario.call(this, response);
    }
    else if (nextScenario == 'done') {
        this.emit('api-done', scenarios, response);
    }
}

function onPortmoneForm() {
    const scenarios = getScenarios(arguments.callee);
    const action = util.format('%s/r3/new-kyivstar/?%s', PM_HOST, this.client.encodeURI(this.config.params));

    this.client.get(action)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#ptm-form');
            Object.assign(this.pmPayData, resp.parsedData.values);

            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

function onPortmonePromo(response) {
    const scenarios = getScenarios(arguments.callee);
    const action = util.format('%s/r3/secure/check/kyivstar-promo', PM_HOST);
    const values = Object.assign({ description: this.phone }, this.config.kyivstar);

    this.client.postXHR(action, values)
        .then(resp => {
            resp.parsedData = { description: datas.getDataFrom(resp, 'body.response.description') };
            Object.assign(this.pmPayData, resp.parsedData);

            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenario))
    ;
}

function onPortmonePay(response) {
    const scenarios = getScenarios(arguments.callee);
    const action = util.format('%s/r3/secure/pay/do-payment', PM_HOST);

    this.client.post(action, this.pmPayData)
        .then(resp => {
            const html = datas.getDataFrom(resp, 'body.response.form');
            resp.parsedData = new Parser(html).getFormsData('#apiForm');

            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

function onPrivatbankForm(response) {
    const scenarios = getScenarios(arguments.callee);
    const action = urlPrepend(PB_HOST, response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#form_send');
            this.pbPayData = Object.assign({}, resp.parsedData.values, this.pbPayData);

            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

function onPrivatbankPay(response) {
    const scenarios = getScenarios(arguments.callee, 'done');
    const action = urlPrepend(PB_HOST, response.parsedData.action);

    this.client.post(action, this.pbPayData)
        .then(resp => {
            resp.parsedData = {
                jsessionid: datas.getSessionID('jsessionid', resp.res.headers['set-cookie']),
            };

            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

function onPortmoneCheckPin(pin) {
    const scenarios = getScenarios(arguments.callee);
    const action = util.format('%s/pCheckPIN.jsp', PB_HOST);
    const values = {
        pPasswordID: '',
        pPassword: pin,
        __rnd: Math.random(),
    };

    this.client.post(action, values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#fPaREs');
            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

function onPortmoneConfirm(response) {
    const scenarios = getScenarios(arguments.callee);
    const action = urlPrepend(PM_HOST, response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#apiForm');
            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

function onPortmoneDone(response) {
    const scenarios = getScenarios(arguments.callee, 'done');
    const action = urlPrepend(PM_HOST, response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = {
                success: /Оплата пройшла успішно/ig.test(resp.body),
            };

            this.emit('api-scenario', scenarios, resp);
        })
        .catch(err => this.emit('api-error', err, scenarios))
    ;
}

/**
 * Statuses of the API
 */
PortmoneAPI.prototype.PM_FORM = 'portmone-form';
PortmoneAPI.prototype.PM_PAY = 'portmone-pay';
PortmoneAPI.prototype.PM_PIN = 'portmone-check-pin';
PortmoneAPI.prototype.PB_FORM = 'privatbank-form';
PortmoneAPI.prototype.PB_PAY = 'privatbank-pay';
PortmoneAPI.prototype.PROMO = 'portmone-promo';
PortmoneAPI.prototype.CONFIRM = 'portmone-confirm';
PortmoneAPI.prototype.DONE = 'portmone-done';

module.exports = PortmoneAPI;
