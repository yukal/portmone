const crypto = require('crypto');
const aes = require('./AesUtil');
const rsa = require('./RsaUtil');
const datas = require('./datas');

const CHR_LET = 0;
const CHR_DIG = 2;
const CHR_CHR = 4;

const numbers = '0123456789';
const special = '^~@#$&%!?*-+[_=](.:)<,;>/|';
const letters = 'aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ';

function md5() {
    const text = Array.prototype.slice.call(arguments).join(':');
    return crypto.createHash('md5').update(text).digest('hex');
}

function crc32(str) {
    const crcTable = window.crcTable || (window.crcTable = makeCRC32Table());
    let crc = 0 ^ (-1);

    for (let i=0; i<str.length; i+=1) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

function makeCRC32Table() {
    let c, crcTable = [];

    for (let n=0; n<256; n++) {
        c = n;
        for (let k=0; k<8; k++) {
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[ n ] = c;
    }

    return crcTable;
}

function generatePassword(length=32) {
    const numbers = '0123456789';
    const special = '^~@#$&%!?*-+[_=](.:)<,;>/|';
    const letters = 'aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ';

    const qtys = Math.floor((datas.randomInt(10, 20) * length) / 100) || 1;
    const qtyn = Math.floor((datas.randomInt(10, 30) * length) / 100) || 1;
    const qtyc = length - qtyn - qtys;

    let pass = generatePasswordChars(letters, qtyc);
    pass = appendPasswordChars(pass, generatePasswordChars(special, qtys));
    pass = appendPasswordChars(pass, generatePasswordChars(numbers, qtyn));

    return pass;
}

function generatePasswordChars(chars, num=4) {
    let word = '';
    for (let x=0, len=chars.length; x<num; x+=1) {
        word += chars[ datas.randomInt(0, len-1) ];
    }
    return word;
}

function appendPasswordChars(pass, chars) {
    let phrase = pass;

    for (let n=0, plen=phrase.length, vlen=chars.length; n<vlen; n+=1) {
        const index = datas.randomInt(1, plen-1);
        phrase = phrase.substr(0, index) + chars[ n ] + phrase.substr(index);
        plen += 1;
    }

    return phrase;
}

function genChars(num=4, voc=CHR_LET|CHR_DIG) {
    const vocabularies = [];
    let word = '';

    (voc & CHR_LET) === 0 && vocabularies.push(letters);
    (voc & CHR_DIG) === 2 && vocabularies.push(numbers);
    (voc & CHR_CHR) === 4 && vocabularies.push(special);

    for (let x=0; x<num; x+=1) {
        let vocabulary = vocabularies[ datas.randomInt(0, vocabularies.length-1) ];
        word += vocabulary[ datas.randomInt(0, vocabulary.length-1) ];
    }

    return word;
}

module.exports.aes = aes;
module.exports.rsa = rsa;
module.exports.md5 = md5;
module.exports.crc32 = crc32;
module.exports.generatePassword = generatePassword;

module.exports = {
    CHR_LET,
    CHR_DIG,
    CHR_CHR,

    genChars,
    generatePassword,
    crc32,
    md5,
    aes,
    rsa,
};
