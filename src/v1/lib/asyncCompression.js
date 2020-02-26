/**
 * Asynchronous Compression
 * This module converts and exports some methods of Zlib library 
 * to asynchronous, among which are: Gzip, Brotli, Deflate
 * @see https://nodejs.org/docs/latest/api/zlib.html
 * 
 * @file
 * @ingroup Modules
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */
const zlib = require('zlib');
const util = require('util');

const brotliCompressAsync = util.promisify(zlib.brotliCompress);
const brotliDecompressAsync = util.promisify(zlib.brotliDecompress);
const deflateAsync = util.promisify(zlib.deflate);
const inflateAsync = util.promisify(zlib.inflate);
const gzipAsync = util.promisify(zlib.gzip);
const gunzipAsync = util.promisify(zlib.gunzip);


/**
 * isBrotli
 * Whether is the content was compressed by Brotli algorithm
 * @param {Buffer} buffer A buffer of Html body
 * @returns {Boolean}
 */
function isBrotli(buffer) {
    return Buffer.from([ 0xCE, 0xB2, 0xCF, 0x81 ])
        .equals(buffer.slice(0, 4));
}

/**
 * isDeflate
 * Whether is the content was compressed by Deflate algorithm
 * @param {Buffer} buffer A buffer of Html body
 * @returns {Boolean}
 */
function isDeflate(buffer) {
    return 0x08 === buffer[0]
}

/**
 * isGzip
 * Whether is the content was compressed by Gzip algorithm
 * @param {Buffer} buffer A buffer of Html body
 * @returns {Boolean}
 */
function isGzip(buffer) {
    return Buffer.from([ 0x1F, 0x8B ])
        .equals(buffer.slice(0, 2));
}

module.exports = {
    encoders: {
        'br': brotliCompressAsync,
        'deflate': deflateAsync,
        'gzip': gzipAsync,
    },
    decoders: {
        'br': brotliDecompressAsync,
        'deflate': inflateAsync,
        'gzip': gunzipAsync,
    },

    isBrotli,
    isDeflate,
    isGzip,

    toString() {
        return Object.keys(this.decoders).join(',');
    }
};
