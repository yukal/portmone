const crypto = require('crypto');
const util = require('util');
const zlib = require('zlib');
const gzip = util.promisify(zlib.gzip);
const gunzip = util.promisify(zlib.gunzip);

function rsaTags(type) {
    const maskOpenTag = '-----BEGIN %s KEY-----\n';
    const maskCloseTag = '\n-----END %s KEY-----';

    const middleNameTag = {
        'spki': 'PUBLIC',
        'pkcs8': 'ENCRYPTED PRIVATE',
    };

    const openTag = util.format(maskOpenTag, middleNameTag[ type ]);
    const closeTag = util.format(maskCloseTag, middleNameTag[ type ]);

    return { openTag, closeTag };
}

function rsaRemoveTags(key, type) {
    const { openTag, closeTag } = rsaTags(type);
    return key.replace(openTag, '').replace(closeTag, '');
}

function rsaAppendTags(key, type) {
    const { openTag, closeTag } = rsaTags(type);
    const match = key.match(/\s{1,2}$/);

    return match
        ? util.format(`%s%s${match[0]}`, openTag, key.replace(/\s{1,2}$/, closeTag))
        : util.format('%s%s%s', openTag, key, closeTag)
    ;
}

async function rsaEncompress(key, type, encode) {
    const keyNotags = rsaRemoveTags(key, type);
    const keyCompressed = await gzip(keyNotags);

    return encode 
        ? keyCompressed.toString(encode) 
        : keyCompressed
    ;
}

async function rsaDecompress(ckey, type, decode='utf8') {
    const buff = typeof(ckey) != 'string' ?ckey :Buffer.from(ckey, decode);
    let keyDecompressed;

    try {
        keyDecompressed = await gunzip(buff);
    } catch(err) {
        return false;
    }

    const key = decode 
        ? keyDecompressed.toString() 
        : keyDecompressed
    ;

    return rsaAppendTags(key, type);
}

function rsaGetSignature(prKey, passphrase, alg='RSA-SHA256', encode='base64') {
    let signature, sig = crypto.createSign(alg);
    sig.update(passphrase || prKey);

    signature = passphrase 
        ? sig.sign({key:prKey, passphrase}, encode)
        : sig.sign(prKey, encode)
    ;

    return signature;
}

function rsaVerifySignature(prKey, pbKey, passphrase, alg='RSA-SHA256', encode='base64') {
    const prKeySig = rsaGetSignature(prKey, passphrase, alg, encode);
    const ver = crypto.createVerify(alg);
    ver.update(passphrase || prKey);

    try {
        return ver.verify(pbKey, prKeySig, encode);
    } catch (err) {
        return false;
    }
}

module.exports = {
    tags: rsaTags,
    removeTags: rsaRemoveTags,
    appendTags: rsaAppendTags,
    encompress: rsaEncompress,
    decompress: rsaDecompress,
    getSignature: rsaGetSignature,
    verifySignature: rsaVerifySignature,
};
