/**
 * Brequest
 * 
 * @file
 * @ingroup Libraries
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

const Url = require('url');
const Https = require('https');
const Http = require('http');
const Querystring = require('querystring');
// const zlib = require('zlib');
// const util = require('util');
const iconv = require('iconv-lite');
const Cookie = require('./Cookie');
const asyncCompression = require('./asyncCompression');
// iconv.extendNodeEncodings();
const { isObject, cloneObject } = require('./datas');

const NOD_USER_AGENT = "Brequest v1.0";
const LIN_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36";
const WIN_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36";

class Brequest {
    constructor() {
        let cookies = new Cookie(this);

        Object.defineProperties(this, {
            cookies: {
                // value: new Cookie()
                enumerable: true,
                get: () => cookies,
                set: (val) => {
                    if (val === null) {
                        cookies = new Cookie();
                    } else {
                        cookies.update(val);
                    }
                }
            },
        });

        this.requestOptions = {};
        this.requestData = {};
        this.body = '';
    }

    get(url, headers) {
        const options = getOptions('GET', url, headers);
        return request.call(this, options);
    }

    post(url, data, headers) {
        const options = getOptions('POST', url, headers);
        return request.call(this, options, data);
    }

    postXHR(url, data, headers={}) {
        headers['X-Requested-With'] = 'XMLHttpRequest';
        const options = getOptions('POST', url, headers);
        return request.call(this, options, data);
    }

    postJSON(url, data, headers={}) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
        const options = getOptions('POST', url, headers);
        return request.call(this, options, JSON.stringify(data));
    }

    getHeaders(entry) {
        if (this.hasOwnProperty('res')) {
            return entry ?this.res.headers[entry] :this.res.headers;
        }
        return undefined;
    }

    getShortHostname(hostname) {
        const host = hostname ?hostname :this.requestOptions.host;
        return host.replace(/^www\./i, '');
    }

    encodeURI(obj) {
        return Querystring.stringify(obj);
    }
}

Brequest.downloadFile = function downloadFile(src, dirname, callback) {
    const RequestModule = src.substr(0,6)=='https:' ?Https: Http;
    const filename = Brequest.getFilenameFromLink(src);
    const file = Fs.createWriteStream(`${dirname}/${filename}`, { autoClose: true });
    const request = RequestModule.get(src, res => {
        res.pipe(file);
        callback && res.on('end', () => callback(filename, dirname, request));
    }).end();
}

Brequest.getFilenameFromLink = function getFilenameFromLink(link) {
    const filename = link.match(/[^\/]+$/);
    return Array.isArray(filename) ?filename.shift() :filename;
}

function request(options, data) {
    const self = this;
    const RequestModule = options.protocol === 'https:'? Https: Http;
    const shortHostname = this.getShortHostname(options.host);
    let postData = null;

    if (this.cookies.hasOwnProperty(shortHostname)) {
        options.headers.Cookie = this.cookies.getValues(shortHostname);
    }

    if (data) {
        if (! options.headers.hasOwnProperty('Content-Type')) {
            postData = isObject(data) ?this.encodeURI(data) :data;
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
        } else {
            postData = data;
        }

        if (! options.headers.hasOwnProperty('Content-Length')) {
            options.headers['Content-Length'] = Buffer.byteLength(postData, 'utf8');
        }
    }

    options.headers['Accept-Encoding'] = Brequest.compression.toString();
    this.requestOptions = options;
    this.requestData = data;
    this.body = '';

    return new Promise((resolve, reject) => {
        let packages = [];

        self.req = RequestModule.request(options, res => {
            self.res = res;

            res.on('data', chunk => packages.push(chunk));
            res.on('end', () => finish.call(self, null, packages, resolve, reject));
        });

        postData && self.req.write(postData);

        self.req.on('error', err => finish.call(self, err, packages, resolve, reject));
        self.req.end(); // !IMPORTANT
    });
}

async function finish(err, packages, resolve, reject) {
    if (this.res) {
        const { headers, statusCode, statusMessage } = this.res;
        const { cookies } = this;

        if (packages.length) {
            this.body = await decodeBody.call(this, Buffer.concat(packages));
        }

        if (headers.hasOwnProperty('set-cookie')) {
            cookies.update(headers['set-cookie'], this.getShortHostname());
            // console.log(cookies.getItems(host));
        }

        // if (res.statusMessage != 'OK')
        if (statusCode > 399) {
            const errorMessage = `request-error [${statusCode}] ${statusMessage}`;
            return reject(errorMessage);
        }
    }

    return err ?reject(err) :resolve(this.body);
}

function getOptions(method, url, headersData) {
    const headers = isObject(headersData) ?cloneObject(headersData) :{};

    if (!headers.hasOwnProperty('User-Agent')) {
        headers['User-Agent'] = WIN_USER_AGENT;
    }

    return Object.assign({ method, headers }, Url.parse(url));
}

/**
 * getContentInfo
 * @param {Object} headers An object of the http.IncomingMessage
 * @param {Object} buff A buffer of Html body
 */
function getContentInfo(headers, buff) {
    const data = {
        type: '',
        charset: '',
        encoding: '',
    };

    if (headers.hasOwnProperty('content-type')) {
        const chunks = headers['content-type'].split(';');

        // Content-Type
        data.type = chunks.shift().trim().toLowerCase();

        // Other settings (e.g. charset=utf-8)
        chunks.map(item => {
            let [ key, val ] = item.split('=');
            data[ key.trim().toLowerCase() ] = val.trim().toLowerCase().replace(/^['"]|["']$/g,'');
        });
    }

    // if (!data.hasOwnProperty('charset')) {
    //     
    // }

    if (headers.hasOwnProperty('content-encoding')) {
        data.encoding = headers['content-encoding'].toLowerCase();
    } else {
        if (Brequest.compression.isGzip(buff)) {
            data.encoding = 'gzip';
        }
        if (Brequest.compression.isDeflate(buff)) {
            data.encoding = 'deflate';
        }
        if (Brequest.compression.isBrotli(buff)) {
            data.encoding = 'br';
        }
    }

    return data;
}

/**
 * decodeBody
 * @param {Buffer} buff A buffer of Html body
 */
async function decodeBody(buff) {
    let body = buff;

    try {
        const contentInfo = getContentInfo(this.res.headers, buff);

        // Decompress
        if (Brequest.compression.decoders.hasOwnProperty(contentInfo.encoding)) {
            const decompress = Brequest.compression.decoders[ contentInfo.encoding ];
            body = await decompress(buff);
        }

        // Encoding content by charset
        if (contentInfo.hasOwnProperty('charset')) {
            if (['','utf8','utf-8'].indexOf(contentInfo.charset) == -1) {
                body = iconv.encode(iconv.decode(buff, contentInfo.charset), 'utf8');
            }
        }

        if ('application/json' == contentInfo.type) {
            return JSON.parse(body.toString());
        }

    } catch(error) {
        console.error(error);
    }

    return body.toString();
}

Brequest.compression = asyncCompression;
module.exports = Brequest;
