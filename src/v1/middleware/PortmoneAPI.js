const EventEmitter = require('events');

const crypt = require('./crypt');
const datas = require('./datas');
const HtmlParser = require('./HtmlParser');
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

        // Set cookies
        if (config.hasOwnProperty('cookies')) {
            this.client.cookies.update(config.cookies);
        }

        // Set custom error listener
        if (config.hasOwnProperty('onApiError')) {
            this.on('api-error', config.onApiError);
        }

        // Set custom data listener
        if (config.hasOwnProperty('onApiData')) {
            this.on('api-data', config.onApiData);
        }

        // Start listening to the API worker
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
            self.once('api-done', function onBillDone(parsedData) {
                parsedData.jsessionid
                    ? resolve({ location: self.location })
                    : reject('no-jsession')
                ;
            });

            onPortmoneForm.call(self);
        });
    }

    checkPin(pin) {
        const self = this;

        return new Promise(function promise(resolve, reject) {
            self.once('api-done', function onCheckPinDone(parsedData) {
                parsedData.success ?resolve() :reject();
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


/**
 * getSID
 * @param {string} sidName Name of session ID
 */
function getSID(sidName) {
    let sid;

    // Get SID from responsed cookie
    if (this.client.res.headers.hasOwnProperty('set-cookie')) {
        sid = datas.getSessionID(sidName, this.client.res.headers['set-cookie']);
    }

    // Trying to get SID from the body of a response
    if (datas.isEmpty(sid)) {
        sid = datas.getSessionID(sidName, this.client.body);
    }

    // Trying to get SID from cached cookie
    if (datas.isEmpty(sid) && (this instanceof PortmoneAPI)) {
        const shortHostname = this.client.getShortHostname();
        if (this.client.cookies.hasOwnProperty(shortHostname)) {
            const cookies = this.client.cookies.getValues(shortHostname);
            sid = datas.getSessionID(sidName, cookies);
        }
    }

    return sid;
    // return sid ?this[sidName]=sid :this[sidName];
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

function onScenario(parsedData) {
    process.stdout.write(`${this.currScenario.name} ==> `);
    console.log(this.nextScenario);

    if (parsedData) {
        this.emit('api-data', parsedData);
    }

    if (datas.isFunction(this.nextScenario)) {
        this.nextScenario(parsedData);
    }

    else if (this.nextScenario == 'done') {
        this.emit('api-done', parsedData);
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
        .then(body => {
            const form = new HtmlParser(body).getFormsData('#ptm-form');

            if (datas.isObject(form)) {
                Object.assign(this.pmPayData, form.values);
                this.emit('api-scenario', form);
            } else {
                this.emit('api-error', 'no-data');
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmonePromo(data) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost('/r3/secure/check/kyivstar-promo');
    const values = Object.assign({ description: this.phone }, API_DATA.payee);

    this.client.postXHR(action, values)
        .then(body => {
            const description = datas.getDataFrom(body, 'response.description');
            if (description) {
                this.pmPayData.description = description;
            }
            this.emit('api-scenario', { description });
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmonePay(data) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost('/r3/secure/pay/do-payment');

    this.client.post(action, this.pmPayData)
        .then(body => {
            const html = datas.getDataFrom(body, 'response.form');
            const form = new HtmlParser(html).getFormsData('#apiForm');

            datas.isObject(form)
                ? this.emit('api-scenario', form)
                : this.emit('api-error', 'no-data')
            ;
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPrivatbankForm(data) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPrivatbankHost(data.action);

    this.client.post(action, data.values)
        .then(body => {
            const form = new HtmlParser(body).getFormsData('#form_send');

            if (datas.isObject(form)) {
                this.pbPayData = Object.assign({}, form.values, this.pbPayData);
                this.emit('api-scenario', form);
            } else {
                this.emit('api-error', 'no-data');
            }
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPrivatbankPay(data) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPrivatbankHost(data.action);

    this.client.post(action, this.pbPayData)
        .then(body => {
            const jsessionid = getSID.call(this, 'jsessionid');
            datas.isEmpty(jsessionid)
                ? this.emit('api-error', 'no-data')
                : this.emit('api-scenario', { jsessionid })
            ;
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
        .then(body => {
            const form = new HtmlParser(body).getFormsData('#fPaREs');
            datas.isObject(form)
                ? this.emit('api-scenario', form)
                : this.emit('api-error', 'no-data')
            ;
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneConfirm(data) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost(data.action);

    this.client.post(action, data.values)
        .then(body => {
            const form = new HtmlParser(body).getFormsData('#apiForm');
            datas.isObject(form)
                ? this.emit('api-scenario', form)
                : this.emit('api-error', 'no-data')
            ;
        })
        .catch(err => this.emit('api-error', err))
    ;
}

function onPortmoneDone(data) {
    setScenariosFrom.call(this, arguments);
    const action = this.getPortmoneHost(data.action);

    this.client.post(action, data.values)
        .then(body => {
            const parsedData = {
                success: /Оплата пройшла успішно/ig.test(body),
            };
            this.emit('api-scenario', parsedData);
        })
        .catch(err => this.emit('api-error', err))
    ;
}

/**
 * Aliases of the API methods
 */
PortmoneAPI.PM_FORM = 'portmone-form';
PortmoneAPI.PM_PAY = 'portmone-pay';
PortmoneAPI.PM_PIN = 'portmone-check-pin';
PortmoneAPI.PB_FORM = 'privatbank-form';
PortmoneAPI.PB_PAY = 'privatbank-pay';
PortmoneAPI.PROMO = 'portmone-promo';
PortmoneAPI.CONFIRM = 'portmone-confirm';
PortmoneAPI.DONE = 'portmone-done';

module.exports = PortmoneAPI;
