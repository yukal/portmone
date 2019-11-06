const URL = require('url');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const iconv = require('iconv-lite');
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

function request(options, data) {
    const RequestModule = options.protocol === 'https:'? https: http;
    const host = getHostFrom(options.host);
    let postData = null;

    if (request.cookies.hasOwnProperty(host)) {
        options.headers.Cookie = getCookieValues(request.cookies[ host ]).join('; ');
    }

    if (data) {
        if (! options.headers.hasOwnProperty('Content-Type')) {
            postData = encodeData(data);
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8';
        } else {
            postData = data;
        }

        if (! options.headers.hasOwnProperty('Content-Length')) {
            options.headers['Content-Length'] = Buffer.byteLength(postData, 'utf8');
        }
    }

    options.headers['Accept-Encoding'] = Object.keys(decoders).join(', ');

    return new Promise((resolve, reject) => {
        const resolveData = { options, data };
        const chunks = [];

        const req = RequestModule.request(options, res => {
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const encoding = (res.headers['content-encoding'] || '').toLowerCase();
                const decompress = decoders.hasOwnProperty(encoding) ?zlib[decoders[ encoding ]] :false;
                const buffer = Buffer.concat(chunks);

                decompress 
                    ? decompress(buffer, (err, decoded) => 
                      request.finish(res, err, decoded, resolveData, resolve, reject)) 
                    : request.finish(res, null, buffer, resolveData, resolve, reject)
                ;
            });
        });

        postData && req.write(postData);

        req.on('error', err => request.finish(req.res, err, null, resolveData, resolve, reject));
        req.end(); // !IMPORTANT
    });
}

request.finish = function(res, err, bodyBuff, resolveData, resolve, reject) {
    if (err) {
        console.error(err);
        return reject(null);
    }

    resolveData.res = res;

    if (res.headers.hasOwnProperty('set-cookie')) {
        const host = getHostFrom(resolveData.options.host);
        const cookies = res.headers['set-cookie'];
        request.cookies = { host, cookies };
        // console.log(getCookieValues(request.cookies[host]));
    }

    // if (res.statusMessage != 'OK')
    if (res.statusCode > 399) {
        console.error(res.statusCode, res.statusMessage);
        request.reporters.map(rep => rep(resolveData));
        resolveData.data && console.log(resolveData.data);
        return reject(null);
    }

    const contentType = res.headers['content-type'] || '';
    resolveData.body = decodeBody(bodyBuff, contentType);
    request.reporters.map(rep => rep(resolveData));

    return resolve(resolveData);
}

request.get = function(url, headers) {
    const options = setOptions('GET', url, headers);
    return request(options);
}

request.post = function(url, data, headers) {
    const options = setOptions('POST', url, headers);
    return request(options, data);
}

request.postXHR = function(url, data, headers={}) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
    const options = setOptions('POST', url, headers);

    return request(options, data);
}

request.postJSON = function(url, data, headers={}) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    const options = setOptions('POST', url, headers);

    return request(options, JSON.stringify(data));
}

function setOptions(method, url, headersData) {
    const headers = isObject(headersData) ?cloneObject(headersData) :{};

    if (!headers.hasOwnProperty('User-Agent')) {
        headers['User-Agent'] = WIN_USER_AGENT;
    }

    return Object.assign({ method, headers }, URL.parse(url));
}

function encodeData(data) {
    return isObject(data) ?encodeURI(data) :data;
}

request.encodeURI = function(obj) {
    let uriChunks = [];
    for (const key in obj) {
        const data = obj[key] !== null && typeof obj[key] == 'object'
            ? JSON.stringify(obj[key]) 
            : obj[key]
        ;
        const uriChunk = key + '=' + encodeURIComponent(data);
        uriChunks.push(uriChunk);
    }
    return uriChunks.join('&');
}

function encodeURI(obj) {
    let uriChunks = [];
    for (const key in obj) {
        const data = obj[key] !== null && typeof obj[key] == 'object'
            ? JSON.stringify(obj[key]) 
            : obj[key]
        ;
        const uriChunk = key + '=' + encodeURIComponent(data);
        uriChunks.push(uriChunk);
    }
    return uriChunks.join('&');
}

function decodeBody(buff, contentType='') {
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

function getHostFrom(host) {
    return host.replace(/^www\./i, '');
}

function getCookieValues(parsedCookies) {
    return Object.keys(parsedCookies).map(key => parsedCookies[key].value);
}

function parseCookies(cookies) {
    const cookiesCollection = typeof(cookies) == 'string' ?[ cookies ] :cookies;
    const today = Date.now();
    const parsed = {};

    for (const param of cookiesCollection) {
        const chunks = param.split(';');
        const value = chunks.shift().trim();
        const ID = value.substr(0, value.indexOf('='));
        const cookie = { value };

        chunks.map(item => {
            const [ key, value ] = item.trim().split('=');
            const lowKey = key.toLowerCase();

            lowKey === 'expires'
                ? cookie[ lowKey ] = Date.parse(value)
                : cookie[ lowKey ] = value || true
            ;
        });

        if (cookie.hasOwnProperty('expires')) {
            if (today > Date.parse(cookie.expires)) {
                continue;
            }
        }

        if (! parsed.hasOwnProperty(ID)) {
            parsed[ID] = cookie;
        } else if (cookie.hasOwnProperty('expires') && parsed[ID].hasOwnProperty('expires')) {
            cookie.expires > parsed[ID].expires && (parsed[ID] = cookie);
            // Date.parse(cookie.expires) > Date.parse(parsed[ID].expires) && (parsed[ID] = cookie);
        }
    }

    return parsed;
}

function mergeCookies() {
    const args = [ ...arguments ];

    if (args.length <= 1) {
        return args.shift();
    }

    const cookies = args.shift();

    args.map(items => {
        Object.keys(items).map(ID => {
            if (! cookies.hasOwnProperty(ID)) {

                cookies[ID] = items[ID];

            } else if (cookies[ID].hasOwnProperty('expires') && items[ID].hasOwnProperty('expires')) {

                items[ID].expires > cookies[ID].expires && (cookies[ID] = items[ID]);

            }
        });
    });

    return cookies;
}

module.exports = function init(options={}) {
    // Define dependencies as readonly object
    !request.initiated && Object.defineProperties(request, {
        dependencies: {
            value: options.hasOwnProperty('dependencies') ?options.dependencies :{}
        },
        reporters: {
            value: options.hasOwnProperty('reporters') ?options.reporters :[],
            // enumerable: true,
        },
        cookies: {
            get: function getCookies() {
                if (! request.hasOwnProperty('__cookies')) {
                    request.__cookies = {};
                }
                return request.__cookies;
            },
            set: function setCookies(data) {
                const { host, cookies } = data;

                if (! request.hasOwnProperty('__cookies')) {
                    request.__cookies = {};
                }

                if (! request.__cookies.hasOwnProperty(host)) {
                    request.__cookies[ host ] = {};
                }

                request.__cookies[host] = mergeCookies(request.__cookies[host], parseCookies(cookies));
                // request.__cookies[ host ] = parseCookies(cookies);
            },
        },
    });

    request.initiated = true;
    return request;
    // return cloneObject(request);
};
