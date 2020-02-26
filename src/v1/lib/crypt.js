/**
 * Crypt
 * 
 * @file
 * @ingroup Helpers
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

const crypto = require('crypto');
const aes = require('./AesUtil');
const rsa = require('./RsaUtil');
const { randomInt } = require('./datas');

const CHR_LOCASE = 1;
const CHR_UPCASE = 2;
const CHR_WORD = 3; // CHR_LOW|CHR_UP
const CHR_DIGIT = 4;
const CHR_SPEC = 8;

function md5() {
    const text = Array.prototype.slice.call(arguments).join(':');
    return crypto.createHash('md5').update(text).digest('hex');
}

function crc32(str) {
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

    const crcTable = window.crcTable || (window.crcTable = makeCRC32Table());
    let crc = 0 ^ (-1);

    for (let i=0; i<str.length; i+=1) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

function genPassword(length=32, mode=CHR_WORD|CHR_DIGIT|CHR_SPEC) {
    if (!(Number.isInteger(mode) && mode>0)) {
        return false;
    }

    const ASCII = [
        // Special chars: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
        // 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A,
        // 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E,
        // 0x3F, 0x40, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F, 0x60, 0x7B, 0x7C,
        // 0x7D, 0x7E,

        // Special chars (0-16): !#$%&()*,.:;@[]^~+|
        0x21, 0x23, 0x24, 0x25, 0x26, 0x28, 0x29, 0x2A, 0x2C, 0x2E,
        0x3A, 0x3B, 0x40, 0x5B, 0x5D, 0x5E, 0x7E, 0x2B, 0x7D,

        // Digits [0..9]
        0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,

        // Lower case letters [A..Z]
        0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A,
        0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, 0x51, 0x52, 0x53, 0x54,
        0x55, 0x56, 0x57, 0x58, 0x59, 0x5A,

        // Upper case letters [a..z]
        0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A,
        0x6B, 0x6C, 0x6D, 0x6E, 0x6F, 0x70, 0x71, 0x72, 0x73, 0x74,
        0x75, 0x76, 0x77, 0x78, 0x79, 0x7A
    ];

    let map = [];

    // Fill map
    ((mode & CHR_SPEC)   === CHR_SPEC)   && (map = map.concat(ASCII.slice(0,19)));
    ((mode & CHR_DIGIT)  === CHR_DIGIT)  && (map = map.concat(ASCII.slice(19,29)));
    ((mode & CHR_LOCASE) === CHR_LOCASE) && (map = map.concat(ASCII.slice(29,55)));
    ((mode & CHR_UPCASE) === CHR_UPCASE) && (map = map.concat(ASCII.slice(55,81)));

    // const specialCharsLimit = Math.ceil(length*12/100);
    const mapLength = map.length;
    const arr = Array.from({ length }, () => map[randomInt(0, mapLength-1)]);

    return Buffer.from(arr).toString('ascii');
}

module.exports = {
    CHR_UPCASE,
    CHR_LOCASE,
    CHR_WORD,
    CHR_DIGIT,
    CHR_SPEC,

    genPassword,
    crc32,
    md5,
    aes,
    rsa,
};
