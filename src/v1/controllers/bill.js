const crypto = require('crypto');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const fileExists = util.promisify(fs.exists);

const { fail, done } = require('../middleware/process');
const config = require('../../config.json');
const crypt = require('../middleware/crypt');
const datas = require('../middleware/datas');
const portmone = require('../middleware/portmone');
const privatbank = require('../middleware/privatbank');
const CACHE_FILE_MASK = './data/cache/%s.data';

async function rtBill(req, res) {
    const { amount, secret, authKey, MM, YY, cvv2, card_number } = req.body;
    const { choords, kyivstar } = config;
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

    CCARD.card_number_mask = datas.getMaskCardN16(CCARD.card_number);

    const bill_amount = Number.parseInt(amount, 10) || 0;
    const phone = datas.parseMobilePhone(req.body.phone);
    const fp = crypt.md5(new Date().toISOString());
    const location = choords[ datas.randomInt(0, choords.length-1) ];

    const pbPayData = {
        lat: location.lat, 
        lng: location.lng,
        fp, 
    };

    const pmPayData = Object.assign({}, CCARD, kyivstar, {
        phone: datas.getMaskFrom(phone, '+XXX XX XXX XX XX'),
        description: phone.slice(-9),
        currencyAPay: 'UAH',
        bill_amount,
        fp, 
    });

    portmone.promo(phone, kyivstar)
        .then(desc => portmone.form(config.params))
        .then(form => portmone.pay(form, pmPayData))
        .then(form => privatbank.form(form))
        .then(form => privatbank.pay(form, pbPayData))
        .then(jsid => done(res, { jsid, location }))
        // .then(data => console.log(data))
        .catch(err => fail(res, err))
    ;
}

function rtCheckPin(req, res) {
    const { pin, sid } = req.body;

    if (! validatePinBody(req.body)) {
        return fail(res, 'Wrong parameters');
    }

    privatbank.sendPin(pin, sid)
        .then(form => portmone.confirm(form))
        .then(form => portmone.done(form))
        .then((success, body) => {
            console.log('  Success: %s', success ?'true': 'false');
            success ?done(res) :fail(res);
            !success && console.log(body);
        })
        // .then(stat => console.log(stat))
        .catch(err => fail(res, err))
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
    const destination = util.format(CACHE_FILE_MASK, crypt.md5(pbKeyB64));
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

function validatePinBody(body) {
    const { pin } = body;
    return pin
        ? /\d{6,}/.test(pin)
        : false
    ;
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
    const destination = util.format(CACHE_FILE_MASK, crypt.md5(authKey));
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

module.exports = {
    bill: rtBill,
    checkPin: rtCheckPin,
    encode: rtEncode,
    decode: rtDecode,
};
