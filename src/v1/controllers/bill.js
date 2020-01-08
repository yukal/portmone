const crypto = require('crypto');
const zlib = require('zlib');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const fileExists = util.promisify(fs.exists);

const { fail, done } = require('../middleware/process');
const config = require('../../config.json');
const crypt = require('../middleware/crypt');
const datas = require('../middleware/datas');
const colors = require('../middleware/colors');
const formatter = require('../middleware/formatter');
const PortmoneAPI = require('../middleware/PortmoneAPI');
const CACHE_DIR = './data/cache';

let API;

async function rtBill(req, res) {
    const { secret, authKey, MM, YY, cvv2, card_number } = req.body;
    let CCARD;

    if (! validateBillBody(req.body)) {
        return fail(res, 'Wrong parameters');
    }

    if (req.body.hasOwnProperty('card_number')) {

        CCARD = { MM, YY, cvv2, card_number };

    } else {
        const data = await loadData(authKey);
        if (! await verifyAuth(data, authKey, config)) {
            return fail(res, 'Wrong auth key');
        }

        const jsonData = crypt.aes.decrypt(data.data, data.secret);
        if (! datas.isJSON(jsonData)) {
            return fail(res, 'Wrong card data');
        }

        CCARD = JSON.parse(jsonData);
    }

    const currency = 'UAH';
    const amount = Number.parseInt(req.body.amount, 10) || 0;
    const phone = datas.parseMobilePhone(req.body.phone);

    API = new PortmoneAPI(config);
    API.on('api-error', onApiError);
    API.on('api-data', onApiData);

    API.bill(currency, amount, phone, CCARD)
        .then(data => done(res, data))
        .catch(err => fail(res, err))
    ;
}

function rtCheckPin(req, res) {
    const { pin } = req.body;

    if (! validatePinBody(pin)) {
        return fail(res, 'Wrong parameters');
    }

    API.checkPin(pin)
        .then(response => {
            const { name, lat, lng } = API.location;
            const statusMsg = util.format('%s Payment successful!', colors.green('✔'));

            console.log('  %s\n    %s  (%s, %s)', statusMsg, name, lat, lng);
            done(res);
        })
        .catch(response => {
            console.log('  %s Payment failed!', colors.red('✖'));
            fail(res, 'unknown error');
        })
    ;
}

async function rtEncode(req, res) {
    if (!req.body.hasOwnProperty('card_number_mask')) {
        req.body.card_number_mask = datas.getMaskCardN16(req.body.card_number);
    }

    const secret = crypt.generatePassword(32);
    const data = crypt.aes.encrypt(JSON.stringify(req.body), secret);

    const { encType, encOpts } = datas.cloneObject(config.crypt);
    encOpts.privateKeyEncoding.passphrase = secret;

    const { publicKey, privateKey } = crypto.generateKeyPairSync(encType, encOpts);
    const pbKeyB64 = await crypt.rsa.encompress(publicKey, encOpts.publicKeyEncoding.type, 'base64');

    const jsonData = JSON.stringify({ secret, data, privateKey }, null, 4);
    const destination = util.format('%s/%s', CACHE_DIR, crypt.md5(pbKeyB64));
    fs.writeFile(destination, jsonData, err => err && console.error(err));

    done(res, { authKey: pbKeyB64 });
}

async function rtDecode(req, res) {
    // const { secret, authKey } = req.body;
    // const data = await loadData(authKey);

    // if (! await verifyAuth(data, authKey, config)) {
    //     return fail(res, 'Wrong auth key');
    // }

    // let CCARD = crypt.aes.decrypt(data.data, data.secret);

    // if (datas.isJSON(CCARD)) {
    //     CCARD = JSON.parse(CCARD);
    //     CCARD.card_number_mask = datas.getMaskCardN16(CCARD.card_number);
    // }

    // done(res, { CCARD });
    done(res);
}


function validateBillBody(body) {
    const { amount, phone, secret, authKey, MM, YY, cvv2, card_number } = body;
    const HAS_AUTH = !!authKey;

    const HAS_PAYMENT = amount && phone 
        ? /^\d{10}$/.test(phone) 
            && /\d{1,}/.test(amount) 
            && amount > 0
        : false;

    const HAS_CARD_DATA = MM && YY && cvv2 && card_number 
        ? /\d{16}/.test(card_number)
            && /\d{2}/.test(MM) 
            && /\d{2}/.test(YY) 
            && /\d{3}/.test(cvv2) 
        : false;

    return HAS_PAYMENT ?HAS_CARD_DATA||HAS_AUTH :false;
}

function validatePinBody(pin) {
    return pin ? /\d{6,}/.test(pin) :false;
}

async function verifyAuth(data, key, config, decode='base64') {
    if (! data) {
        return false;
    }

    const { type } = config.crypt.encOpts.publicKeyEncoding;
    const publicKey = await crypt.rsa.decompress(key, type, decode);

    return data.secret != ''
        && data.data != ''
        && crypt.rsa.verifySignature(data.privateKey, publicKey, data.secret)
    ;
    // const sign = crypt.rsa.getSignature(privateKey, secret);
    // const check = crypt.rsa.verifySignature(privateKey, publicKey, secret);
}

async function loadData(authKey) {
    const destination = util.format('%s/%s', CACHE_DIR, crypt.md5(authKey));
    let data = false;

    if (!authKey) {
        return false;
    }

    if (!await fileExists(destination)) {
        return false;
    }

    try {
        const jsonData = await readFile(destination, 'utf8');
        data = JSON.parse(jsonData);
    } catch (err) {
        // console.error(err);
    }

    return data;
}

function onApiError(err) {
    process.stdout.write(colors.red(arguments.callee.name) + colors.mono(6, ' => '));
    const dumpfile = util.format('%s/%s.dump', CACHE_DIR, this.currScenarioAlias);

    if (datas.isObject(err)) {
        if (err.hasOwnProperty('msg')) {
            // const { res, options, body, parsedData } = err.response;
            const textBody = JSON.stringify({
                headers: this.client.res.headers,
                href: this.client.requestOptions.href,
                data: this.client.requestData,
                // body: this.client.res.,
            }, null, 4);

            fs.writeFile(dumpfile, textBody, 'utf8', err => err && console.error(err));
            console.error(err.msg);
        } else {
            const textBody = JSON.stringify(err, null, 4);
            fs.writeFile(dumpfile, textBody, 'utf8', err => err && console.error(err));
            console.error(err);
        }
        // err.hasOwnProperty('msg') ?console.error(err.msg) :console.error(err);
    } else {
        const textBody = JSON.stringify(err, null, 4);
        fs.writeFile(dumpfile, textBody, 'utf8', err => err && console.error(err));
        console.error(err);
    }
}

function onApiData(data, response) {
    const indentWidth = 4;
    const frameWidth = process.stdout.columns - indentWidth * 2;

    if (!onApiData.dumpfile) {
        onApiData.dumpfile = util.format('%s/%s', CACHE_DIR, Date.now());
    }

    try {
        const headerColors = {
            href: 'gray',
            method: 'white',
            status: function paintStatusCode(val) {
                if (val>199 && val<300) { return 'green'; }
                else if (val>299 && val<400) { return 'brown'; }
                else if (val>399) { return 'red'; }
                return 'gray';
            },
            'content-type': '029',
            // server: 'gray',
        };

        const values = data.hasOwnProperty('values') ?data.values :data;
        const textHeadersColored = formatter.headerData(this, headerColors)
            + '\n' + datas.tree(values, indentWidth, frameWidth, treeCallback) 
            + '\n\n'
        ;

        const textHeaders = formatter.headerData(this)
            + '\n' + datas.tree(values, indentWidth, frameWidth) 
            + '\n\n'
        ;

        const dumpfile = util.format('%s-%s.gz', onApiData.dumpfile, this.currScenarioAlias);
        const textBody = typeof(response.body) == 'string' 
            ? response.body 
            : JSON.stringify(response.body, null, 4)
        ;

        // fs.writeFile(dumpfile, textBody, 'utf8', err => err && console.error(err));
        zlib.gzip(Buffer.from(textBody), (_, result) => {
            fs.writeFile(`${dumpfile}.gz`, result, 'binary', e=>e&&console.error(e))
        });

        fs.appendFile(`${onApiData.dumpfile}.log`, textHeaders, 'utf8', err => err && console.error(err));
        process.stdout.write(textHeadersColored);

    } catch (err) {
        console.error(arguments.callee.name, err);
    }

    if (this.currScenarioAlias == this.DONE) {
        onApiData.dumpfile = false;
    }
}

function treeCallback(val, key) {
    return colors('023', key.toUpperCase()) + colors.gray(`: ${val}`);
    // return colors('244', key.toUpperCase()) + colors.gray(`: ${val}`);
    // return colors('106', key.toUpperCase()) + colors.gray(`: ${val}`);
}

module.exports = {
    bill: rtBill,
    checkPin: rtCheckPin,
    encode: rtEncode,
    decode: rtDecode,
};
