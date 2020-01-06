const EventEmitter = require('events');

const crypt = require('./crypt');
const datas = require('./datas');
const Parser = require('./HtmlParser');
const Brequest = require('./Brequest');

const PM_HOST = 'https://www.portmone.com.ua';
const PB_HOST = 'https://acs.privatbank.ua';

const API_DATA = {
    // Shop Site ID
    ssid: 6044,
    // Shop Language
    lang: 'uk',
    payee: {
        payee_id: 'KYIVSTAR_P',
        attribute1: 'P',
        format: 'json',
    }
};

class PortmoneAPI extends EventEmitter {
    constructor(config, client) {
        super();

        this.config = config;
        this.client = client ?client :new Brequest();

        // Portmone payment data
        this.pmPayData = {};

        // Privatbank payment data
        this.pbPayData = {};

        if (config.hasOwnProperty('cookies')) {
            this.client.cookies.update(config.cookies);
        }

        this.on('api-scenario', onScenario);
    }

    getPortmoneHost(path='', params) {
        const url = path[0] === '/' ?PM_HOST+path :path;
        return params ?url+'?'+this.client.encodeURI(params) :url;
    }

    getPrivatbankHost(path='', params) {
        const url = path[0] === '/' ?PB_HOST+path :path;
        return params ?url+'?'+this.client.encodeURI(params) :url;
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

        Object.assign(this.pmPayData, API_DATA.payee, CCARD, {
            bill_amount: amount,
            currencyAPay: currency.toUpperCase(),
            phone: datas.getMaskFrom(phone, '+XXX XX XXX XX XX'),
            description: phone.slice(-9),
            fp: fingerprint,
            lang: API_DATA.lang,
        });

        Object.assign(this.pbPayData, {
            lat: this.location.lat, 
            lng: this.location.lng,
            fp: crypt.md5(fingerprint), 
        });

        return new Promise(function promise(resolve, reject) {
            self.once('api-done', function onBillDone(response) {
                const { jsessionid } = response.parsedData;

                if (jsessionid) {
                    resolve({ location: self.location });
                } else {
                    reject('no-jsession');
                }
            });

            onPortmoneForm.call(self);
        });
    }

    checkPin(pin) {
        const self = this;

        return new Promise(function promise(resolve, reject) {
            self.once('api-done', function onCheckPinDone(response) {
                const { success } = response.parsedData;
                success ?resolve(response) :reject(response);

                // Client Cookies
                // console.log(self.client.cookies);
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


function getSID(response, keyName) {
    let sid;

    if (this.client.res.headers.hasOwnProperty('set-cookie')) {
        sid = datas.getSessionID(keyName, this.client.res.headers['set-cookie']);
    }

    if (datas.isEmpty(sid)) {
        sid = datas.getSessionID(keyName, response.body);
    }

    if (datas.isEmpty(sid) && (this instanceof PortmoneAPI)) {
        const host = this.client.requestOptions.host.replace(/^www\./i, '');
        if (this.client.cookies.hasOwnProperty(host)) {
            const cookies = this.client.cookies[ host ];
            const key = Object.keys(cookies).filter(val => val.toLowerCase()==keyName).shift();
            sid = datas.getSessionID(keyName, cookies[key].value);
        }
    }

    return sid;
    // return sid ?this[keyName]=sid :this[keyName];
}

function getScenarioAlias(data) {
    const name = datas.isFunction(data) ?data.name :data.callee.name;
    return name.substr(2).replace(/[A-Z]/g, function(val, index) {
        return index==0 ?val.toLowerCase() :`-${val.toLowerCase()}`;
    });
}

function setScenariosFrom(args) {
    const scenarios = {
        onPortmoneForm,
        onPortmonePromo,
        onPortmonePay,
        onPrivatbankForm,
        onPrivatbankPay,
        onPortmoneCheckPin,
        onPortmoneConfirm,
        onPortmoneDone,
    };

    const breaks = [
        'onPrivatbankPay',
        'onPortmoneDone'
    ];

    const scenariosNames = Object.keys(scenarios);
    const currScenarioIndex = scenariosNames.indexOf(args.callee.name);
    const nextScenarioName = scenariosNames[ currScenarioIndex+1 ];
    const prevScenarioName = scenariosNames[ currScenarioIndex-1 ];

    this.currScenario = args.callee;
    this.prevScenario = scenarios[ prevScenarioName ];
    this.nextScenario = breaks.indexOf(this.currScenario.name)>-1 ?'done' :scenarios[ nextScenarioName ];

    // process.stdout.write('prev '); console.log(this.prevScenario);
    // process.stdout.write('curr '); console.log(this.currScenario);
    // process.stdout.write('next '); console.log(this.nextScenario);
}

function onScenario(response) {
    // process.stdout.write(`${this.currScenario.name} ==> `);
    // console.log(this.nextScenario);

    if (response) {
        const parsedData = datas.getDataFrom(response, 'parsedData');
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
    const action = this.getPortmoneHost('/r3/new-kyivstar/', {
        amount: this.pmPayData.bill_amount,
        shop_site_id: API_DATA.ssid,
        lang: API_DATA.lang,
        entity: 'phone',
    });

    this.client.get(action)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#ptm-form');

            if (datas.isObject(resp.parsedData)) {
                Object.assign(this.pmPayData, resp.parsedData.values);
                this.emit('api-scenario', resp);
            } else {
                const msg = `no-data (${this.currScenarioAlias})`;
                this.emit('api-error', {msg, response: resp});
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmonePromo(response) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost('/r3/secure/check/kyivstar-promo');
    const values = Object.assign({ description: this.phone }, API_DATA.payee);

    this.client.postXHR(action, values)
        .then(resp => {
            resp.parsedData = { description: datas.getDataFrom(resp, 'body.response.description') };

            if (!datas.isEmpty(resp.parsedData.description)) {
                Object.assign(this.pmPayData, resp.parsedData);
            }

            this.emit('api-scenario', resp);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmonePay(response) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost('/r3/secure/pay/do-payment');

    this.client.post(action, this.pmPayData)
        .then(resp => {
            const html = datas.getDataFrom(resp, 'body.response.form');
            resp.parsedData = new Parser(html).getFormsData('#apiForm');

            if (datas.isObject(resp.parsedData)) {
                this.emit('api-scenario', resp);
            } else {
                const msg = `no-data (${this.currScenarioAlias})`;
                this.emit('api-error', {msg, response: resp});
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPrivatbankForm(response) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPrivatbankHost(response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#form_send');

            if (datas.isObject(resp.parsedData)) {
                this.pbPayData = Object.assign({}, resp.parsedData.values, this.pbPayData);
                this.emit('api-scenario', resp);
            } else {
                const msg = `no-data (${this.currScenarioAlias})`;
                this.emit('api-error', {msg, response: resp});
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPrivatbankPay(response) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPrivatbankHost(response.parsedData.action);

    this.client.post(action, this.pbPayData)
        .then(resp => {
            // const jsessionid = getSID.call(this, resp, 'jsessionid');
            resp.parsedData = { jsessionid: getSID.call(this, resp, 'jsessionid') };

            this.emit('api-scenario', resp);

            // if (!datas.isEmpty(resp.parsedData.jsessionid)) {
            //     this.emit('api-scenario', resp);
            // } else {
            //     // this.emit('api-done', resp);
            //     // this.removeAllListeners('api-done');
            //     const msg = `no-session (${this.currScenarioAlias})`;
            //     this.emit('api-error', {msg, response: resp});
            // }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneCheckPin(pin) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPrivatbankHost('/pCheckPIN.jsp');
    const values = {
        pPasswordID: '',
        pPassword: pin,
        __rnd: Math.random(),
    };

    this.client.post(action, values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#fPaREs');

            if (datas.isObject(resp.parsedData)) {
                this.emit('api-scenario', resp);
            } else {
                const msg = `no-data (${this.currScenarioAlias})`;
                this.emit('api-error', {msg, response: resp});
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneConfirm(response) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost(response.parsedData.action);

    this.client.post(action, response.parsedData.values)
        .then(resp => {
            resp.parsedData = new Parser(resp.body).getFormsData('#apiForm');

            if (datas.isObject(resp.parsedData)) {
                this.emit('api-scenario', resp);
            } else {
                const msg = `no-data (${this.currScenarioAlias})`;
                this.emit('api-error', {msg, response: resp});
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneDone(response) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost(response.parsedData.action);

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
 * Aliases of the API methods
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
