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
        this.phone = phone;

        const fingerprint = crypt.md5(Date.now());
        const self = this;

        if (CCARD) {
            if (!CCARD.hasOwnProperty('card_number_mask')) {
                CCARD.card_number_mask = datas.getMaskCardN16(CCARD.card_number);
            }
        }

        Object.assign(this.pmPayData, this.config.kyivstar, CCARD, {
            bill_amount: amount,
            currencyAPay: currency.toUpperCase(),
            phone: datas.getMaskFrom(phone, '+XXX XX XXX XX XX'),
            description: phone.slice(-9),
            fp: fingerprint,
        });

        Object.assign(this.pbPayData, {
            lat: this.location.lat, 
            lng: this.location.lng,
            fp: crypt.md5(fingerprint), 
        });

        return new Promise(function promise(resolve, reject) {
            self.on('api-done', function onBillDone(response) {
                const { jsessionid } = response.parsedData;

                if (jsessionid) {
                    resolve({ location: this.location });
                } else {
                    reject(null);
                    console.error('onBillDone', response.body);
                }
            });

            onPortmoneForm.call(self);
        });
    }

    checkPin(pin) {
        const self = this;

        return new Promise(function promise(resolve, reject) {
            self.on('api-done', function onCheckPinDone(response) {
                const { success } = response.parsedData;
                success ?resolve(response) :reject(response);
            });

            onPortmoneCheckPin.call(self, pin);
        });
    }

    get currScenarioAlias() {
        if (datas.isFunction(this.currScenario)) {
            return getScenarioAlias(this.currScenario);
        }

        if (typeof(this.currScenario) == 'string') {
            return this.currScenario;
        }

        return undefined;
    }

    get nextScenarioAlias() {
        if (datas.isFunction(this.nextScenario)) {
            return getScenarioAlias(this.nextScenario);
        }

        if (typeof(this.nextScenario) == 'string') {
            return this.nextScenario;
        }

        return undefined;
    }
}


function urlPrepend(prefix, url) {
    return url[0] === '/' ?prefix+url :url;
}

function getScenarioAlias(data) {
    const name = datas.isFunction(data) ?data.name :data.callee.name;
    return name.substr(2).replace(/[A-Z]/g, function(val, index) {
        return index==0 ?val.toLowerCase() :`-${val.toLowerCase()}`;
    });
}

function setScenariosFrom(args) {
    const nextScenarios = {
        'onPortmoneForm': onPortmonePromo,
        'onPortmonePromo': onPortmonePay,
        'onPortmonePay': onPrivatbankForm,
        'onPrivatbankForm': onPrivatbankPay,
        'onPrivatbankPay': 'done',
        'onPortmoneCheckPin': onPortmoneConfirm,
        'onPortmoneConfirm': onPortmoneDone,
        'onPortmoneDone': 'done',
    };

    this.currScenario = args.callee;
    this.nextScenario = nextScenarios[ args.callee.name ];
}

function onScenario(response) {
    // process.stdout.write(`${this.currScenario.name} ==> `);
    // console.log(this.nextScenario);

    if (response) {
        let parsedData = datas.getDataFrom(response, 'parsedData');
        this.emit('api-data', parsedData, response);
    }

    if (datas.isFunction(this.nextScenario)) {
        this.nextScenario(response);
    }
    else if (this.nextScenario == 'done') {
        this.emit('api-done', response);
    }
}

function onPortmoneForm() {
    setScenariosFrom.call(this, arguments);
    const action = util.format('%s/r3/new-kyivstar/?%s', PM_HOST, this.client.encodeURI(this.config.params));

    this.client.get(action)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#ptm-form');
            Object.assign(this.pmPayData, resp.parsedData.values);
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmonePromo(response) {
    setScenariosFrom.call(this, arguments);
    const action = util.format('%s/r3/secure/check/kyivstar-promo', PM_HOST);
    const values = Object.assign({ description: this.phone }, this.config.kyivstar);

    this.client.postXHR(action, values)
        .then(resp => {
            resp.parsedData = { description: datas.getDataFrom(resp, 'body.response.description') };
            Object.assign(this.pmPayData, resp.parsedData);
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmonePay(response) {
    setScenariosFrom.call(this, arguments);
    const action = util.format('%s/r3/secure/pay/do-payment', PM_HOST);

    this.client.post(action, this.pmPayData)
        .then(resp => {
            const html = datas.getDataFrom(resp, 'body.response.form');
            resp.parsedData = new Parser(html).getFormsData('#apiForm');
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPrivatbankForm(response) {
    setScenariosFrom.call(this, arguments);
    const action = urlPrepend(PB_HOST, response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#form_send');
            this.pbPayData = Object.assign({}, resp.parsedData.values, this.pbPayData);
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPrivatbankPay(response) {
    setScenariosFrom.call(this, arguments);
    const action = urlPrepend(PB_HOST, response.parsedData.action);

    this.client.post(action, this.pbPayData)
        .then(resp => {
            resp.parsedData = {
                jsessionid: datas.getSessionID('jsessionid', resp.res.headers['set-cookie']),
            };
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneCheckPin(pin) {
    setScenariosFrom.call(this, arguments);
    const action = util.format('%s/pCheckPIN.jsp', PB_HOST);
    const values = {
        pPasswordID: '',
        pPassword: pin,
        __rnd: Math.random(),
    };

    this.client.post(action, values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#fPaREs');
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneConfirm(response) {
    setScenariosFrom.call(this, arguments);
    const action = urlPrepend(PM_HOST, response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#apiForm');
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneDone(response) {
    setScenariosFrom.call(this, arguments);
    const action = urlPrepend(PM_HOST, response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = {
                success: /Оплата пройшла успішно/ig.test(resp.body),
            };
            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

/**
 * Statuses of the API
 */
PortmoneAPI.prototype.PM_FORM = 'onPortmoneForm';
PortmoneAPI.prototype.PM_PAY = 'onPortmonePay';
PortmoneAPI.prototype.PM_PIN = 'onPortmoneCheckPin';
PortmoneAPI.prototype.PB_FORM = 'onPrivatbankForm';
PortmoneAPI.prototype.PB_PAY = 'onPrivatbankPay';
PortmoneAPI.prototype.PROMO = 'onPortmonePromo';
PortmoneAPI.prototype.CONFIRM = 'onPortmoneConfirm';
PortmoneAPI.prototype.DONE = 'onPortmoneDone';

module.exports = PortmoneAPI;
