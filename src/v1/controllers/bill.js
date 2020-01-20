/**
 * Bill
 * This controller implements:
 * - payment of mobile telephone (Kyivstar only) using a credit card
 * - encoding/decoding of credit card data for secure data transfer
 * - implementing of Express routes:
 *   - post /v1/bill
 *   - post /v1/pin
 *   - post /v1/encode
 *   - post /v1/decode
 *
 * @file
 * @ingroup Express.Controllers
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

const crypto = require('crypto');
const zlib = require('zlib');
const util = require('util');
const fs = require('fs');

// const fileAccessAsync = fs.promises.access;
const readFileAsync = fs.promises.readFile;
const randomBytesAsync = util.promisify(crypto.randomBytes);

const { fail, done } = require('../middleware/process');
const compressionAsync = require('../middleware/asyncCompression');
const config = require('../../config.json');
const crypt = require('../middleware/crypt');
const datas = require('../middleware/datas');
const colors = require('../middleware/colors');
const Reporter = require('../middleware/Reporter');
const PortmoneAPI = require('../middleware/PortmoneAPI');
const CACHE_DIR = './data/cache';

let API;

/**
 * rtBill
 * Replenishment of a mobile account
 * @see https://expressjs.com/ru/4x/api.html#req
 * @see https://expressjs.com/ru/4x/api.html#res
 * @param {Object} req An object that represents the HTTP request
 * @param {Object} res An object that represents the HTTP response
 * @returns void
 */
async function rtBill(req, res) {
    if (! validateBillBody(req.body)) {
        return fail(res, 'Wrong parameters');
    }

    const currency = 'UAH';
    const amount = Number.parseInt(req.body.amount, 10) || 0;
    const phone = datas.parseMobilePhone(req.body.phone);
    const CCARD = await loadCreditCardData(req.body);
    const apiParams = Object.assign({}, config, {onApiData, onApiError});

    if (!CCARD) {
        return fail(res, 'Cant load credit card data');
    }

    API = new PortmoneAPI(apiParams);

    API.bill(currency, amount, phone, CCARD)
        .then(data => done(res, data))
        .catch(err => fail(res, err))
    ;
}

/**
 * rtCheckPin
 * Confirmation of the payment by pin code
 * @see https://expressjs.com/ru/4x/api.html#req
 * @see https://expressjs.com/ru/4x/api.html#res
 * @param {Object} req An object that represents the HTTP request
 * @param {Object} res An object that represents the HTTP response
 * @returns void
 */
function rtCheckPin(req, res) {
    const { pin } = req.body;

    if (! validatePinBody(pin)) {
        return fail(res, 'Wrong parameters');
    }

    if (!API) {
        const apiParams = Object.assign({}, config, {onApiData, onApiError});
        API = new PortmoneAPI(apiParams);
    }

    API.checkPin(pin)
        .then(() => {
            process.stdout.write(getStatusMessage(API));
            done(res);
        })
        .catch(() => {
            process.stdout.write(getStatusMessage(API));
            fail(res, 'unknown error');
        })
    ;
}

/**
 * rtEncode
 * Encodes credit card data
 * @see https://expressjs.com/ru/4x/api.html#req
 * @see https://expressjs.com/ru/4x/api.html#res
 * @param {Object} req An object that represents the HTTP request
 * @param {Object} res An object that represents the HTTP response
 * @returns void
 */
async function rtEncode(req, res) {
    const { MM, YY, cvv2, card_number } = req.body;
    const creditCardDigits = util.format('%s%s%s%s', card_number, cvv2, MM, YY);
    const bufBytes = datas.digitsToBytes(creditCardDigits);

    const encoding = 'binary';
    const noiseLen = 512 - bufBytes.length - 1;
    const offset = datas.randomInt(0, 255);
    const offsetBuff = Buffer.from([offset]);

    const secret = crypt.genPassword(32);
    const file = util.format('%s/%s', CACHE_DIR, crypt.md5(secret));

    try {

        const noise = await randomBytesAsync(noiseLen);
        const bufNoised = Buffer.concat([
            offsetBuff,
            noise.slice(0, offset),
            bufBytes,
            noise.slice(offset)
        ]);

        const bufGzipped = await compressionAsync.encoders.gzip(bufNoised);
        const bufEncrypted = crypt.aes.encrypt(bufGzipped.toString(encoding), secret, false);

        fs.writeFile(file, bufEncrypted, encoding, function(err) {
            err ? console.error(err) 
                : console.log('Saved: "%s" [%d b]', file, bufEncrypted.length)
            ;
        });

    } catch(err) {

        console.error(err);

    }

    done(res, { authKey: secret });
}

/**
 * rtDecode
 * Decodes credit card data
 * @see https://expressjs.com/ru/4x/api.html#req
 * @see https://expressjs.com/ru/4x/api.html#res
 * @param {Object} req An object that represents the HTTP request
 * @param {Object} res An object that represents the HTTP response
 * @returns void
 */
async function rtDecode(req, res) {
    // const { secret, authKey } = req.body;
    // const data = await loadCreditCardData(authKey);

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

async function loadCreditCardData(body) {
    const { secret, authKey, MM, YY, cvv2, card_number } = body;
    const destination = util.format('%s/%s', CACHE_DIR, crypt.md5(authKey));
    let data = false;

    // const isRawData = body.hasOwnProperty('card_number') 
    //     && body.hasOwnProperty('MM') 
    //     && body.hasOwnProperty('YY') 
    //     && body.hasOwnProperty('cvv2')
    // ;
    // if (isRawData) {
    //     return { MM, YY, cvv2, card_number };
    // }

    if (MM && YY && cvv2 && card_number) {
        return { MM, YY, cvv2, card_number };
    }

    if (!authKey) {
        console.error(arguments.callee.name, 'No auth key');
        return false;
    }

    try {

        // await fileAccessAsync(destination, fs.constants.F_OK | fs.constants.R_OK);

        const buffer = await readFileAsync(destination);
        const cryptedString = crypt.aes.decrypt(buffer, authKey);
        const cryptedBuffer = Buffer.from(cryptedString, 'binary');

        const unzippedBuffer = await compressionAsync.decoders.gzip(cryptedBuffer);
        const offset = unzippedBuffer[0] + 1;
        const chunk = unzippedBuffer.slice(offset, offset+12);
        data = datas.getCardDatas(chunk);
        // console.log(datas.bytesToDigits(chunk), data);

    } catch(err) {

        console.error(err);

    }

    return data;
}

function getStatusMessage(API, colored=true) {
    const { name, lat, lng } = API.location;
    const SIGN_CHECK = '✔';
    const SIGN_CROSS = '✖';
    let signStatus = colored ?colors.green(SIGN_CHECK) :SIGN_CHECK;
    let wordStatus = 'successful';

    if (API.success === false) {
        signStatus = colored ?colors.red(SIGN_CROSS) :SIGN_CROSS;
        wordStatus = 'failed';
    }

    return `  ${signStatus} Payment ${wordStatus}!\n    ${name}  (${lat}, ${lng})\n\n`;
}

function onApiError(err) {
    process.stdout.write(colors.red(this.currScenario.name) + colors.mono(6, ' => '));
    console.error(err.toString());

    const dumpData = {
        error_string: err.toString(),
        error_object: err,
        href: this.client.requestOptions.href,
        headers: this.client.res ?this.client.res.headers :typeof(this.client.res),
        data: this.client.requestData,
        body: this.client.body.toString(),
    };

    if (datas.isEmpty(dumpData.error_object)) {
        delete dumpData.error_object;
    }

    const content = JSON.stringify(dumpData, null, 4);
    const dumpfile = util.format('%s/%s.dump', CACHE_DIR, this.currScenarioAlias);
    fs.writeFile(dumpfile, content, 'utf8', er => er && console.error(er));
}

function onApiData(data) {
    if (!onApiData.streamFile) {
        const dumpFilename = util.format('%s/%s', CACHE_DIR, Date.now());
        onApiData.streamFile = fs.createWriteStream(dumpFilename, { autoClose: true });
        onApiData.reporter = new Reporter({ client: this.client });
    }

    try {
        onApiData.reporter
            .setData({ data: data.values || data })
            .out(onApiData.streamFile)
            .out(process.stdout)
        ;

        const dumpfile = util.format('%s/%s', CACHE_DIR, this.currScenarioAlias);
        const body = typeof(this.client.body) == 'string' 
            ? this.client.body 
            : JSON.stringify(this.client.body, null, 4)
        ;
        const buff = Buffer.from(body);

        // fs.writeFile(dumpfile, body, 'utf8', err => err && console.error(err));
        zlib.gzip(buff, (err, result) => {
            const contents = err ?buff :result;
            fs.writeFile(`${dumpfile}.gz`, contents, 'binary', e=>e && console.error(e))
        });

    } catch (err) {
        console.error(arguments.callee.name, err);
    }

    if (this.currScenarioAlias == PortmoneAPI.DONE) {
        onApiData.streamFile.end(getStatusMessage(this, false));
        onApiData.streamFile = false;
    }
}

module.exports = {
    bill: rtBill,
    checkPin: rtCheckPin,
    encode: rtEncode,
    decode: rtDecode,
};
