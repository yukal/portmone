const URL = require('url');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const iconv = require('iconv-lite');
const Cookie = require('./Cookie');
// iconv.extendNodeEncodings();
const { isObject, cloneObject } = require('./datas');

const NOD_USER_AGENT = "Brequest v1.0";
const LIN_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36";
const WIN_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36";

const decoders = {
    gzip: 'gunzip',
    deflate: 'inflate',
    br: 'brotliDecompress',
};

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

    getHostname(hostname) {
        const host = hostname ?hostname :this.requestOptions.host;
        return host.replace(/^www\./i, '');
    }

    encodeURI(obj) {
        let uriChunks = [];
        for (const key in obj) {
            const data = obj[key] !== null && typeof obj[key] == 'object'
                ? JSON.stringify(obj[key]) : obj[key];
            const uriChunk = key + '=' + encodeURIComponent(data);
            uriChunks.push(uriChunk);
        }
        return uriChunks.join('&');
    }
}

function request(options, data) {
    const self = this;
    const RequestModule = options.protocol === 'https:'? https: http;
    const host = this.getHostname(options.host);
    let postData = null;

    if (this.cookies.hasOwnProperty(host)) {
        options.headers.Cookie = this.cookies.getValues(host);
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

    options.headers['Accept-Encoding'] = Object.keys(decoders).join(', ');
    this.requestOptions = options;
    this.requestData = data;

    return new Promise((resolve, reject) => {
        const chunks = [];

        self.req = RequestModule.request(options, res => {
            self.res = res;

            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);

                const contentEncoding = res.headers.hasOwnProperty('content-encoding')
                    ? res.headers['content-encoding'].toLowerCase() : '';

                const decompress = decoders.hasOwnProperty(contentEncoding) 
                    ? zlib[decoders[ contentEncoding ]] :false;

                decompress 
                    ? decompress(buffer, (err, decoded) => 
                      request.finish.call(self, err, decoded, resolve, reject)) 
                    : request.finish.call(self, null, buffer, resolve, reject)
                ;
            });
        });

        postData && self.req.write(postData);

        self.req.on('error', err => request.finish.call(self, err, null, resolve, reject));
        self.req.end(); // !IMPORTANT
    });
}

request.finish = function(err, bodyBuff, resolve, reject) {
    if (err) {
        console.error(err);
        return reject(err);
    }

    if (this.res.headers.hasOwnProperty('set-cookie')) {
        this.cookies.update(this.res.headers['set-cookie'], this.getHostname());
        // console.log(this.cookies.getItems(host));
    }

    // if (this.res.statusMessage != 'OK')
    if (this.res.statusCode > 399) {
        console.error(this.res.statusCode, this.res.statusMessage);
        this.requestData && console.log(this.requestData);
        return reject(null);
    }

    const contentType = this.res.headers['content-type'] || '';
    const body = decodeBody(bodyBuff, contentType);

    return resolve({ body });
}

function getOptions(method, url, headersData) {
    const headers = isObject(headersData) ?cloneObject(headersData) :{};

    if (!headers.hasOwnProperty('User-Agent')) {
        headers['User-Agent'] = WIN_USER_AGENT;
    }

    return Object.assign({ method, headers }, URL.parse(url));
}

function decodeBody(buff, contentType) {
    const chunks = contentType.split(';');
    const ctype = chunks.shift().trim().toLowerCase();
    const settings = {};
    let body = buff;

    chunks.map(item => {
        let [ key, value ] = item.split('=');
        settings[ key.trim().toLowerCase() ] = value.trim();
    });

    if (settings.hasOwnProperty('charset')) {
        if (['utf8','utf-8'].indexOf(settings.charset) == -1) {
            body = iconv.encode(iconv.decode(buff, settings.charset), 'utf8');
        }
    }

    switch(ctype) {
        case 'application/json':
            try {
                return JSON.parse(body);
            }
            catch(error) {
                console.error(error);
            }
            break;
    }

    return body.toString();
}

module.exports = Brequest;
