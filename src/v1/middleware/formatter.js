const util = require('util');
const fs = require('fs');
const datas = require('./datas');
const clr = require('./colors');
const Cookie = require('./Cookie');

const SEP_HEAD = ' | ';
const SEP_CONT = '; ';
const BLOCK_LIMIT = 104;
const DEFAULT_COLORS = {
    'href': 'gray',
    'method': 'white',
    'content-type': '029',
};

class Formatter {
    constructor(conf) {
        this.indentWidth = 4;
        this.frameWidth = process.stdout.columns - this.indentWidth * 2;
        this.api = {};

        if (datas.isObject(conf)) {
            if (conf.hasOwnProperty('indentWidth')) {
                this.indentWidth = conf.indentWidth;
                this.frameWidth = process.stdout.columns - this.indentWidth * 2;
            }

            if (conf.hasOwnProperty('frameWidth')) {
                this.frameWidth = conf.frameWidth;
            }

            if (conf.hasOwnProperty('api')) {
                this.api = conf.api;
            }
        }
        // this.headerColors;
    }

    dump(file, values, encode='utf8') {
        const data = headerData(this.api)
            + '\n' + datas.tree(values, this.indentWidth, this.frameWidth) 
            + '\n\n'
        ;

        fs.appendFile(file, data, encode, err => err && console.error(err));
    }

    log(values, colors) {
        if (!colors) {
            colors = Object.assign({ status: paintStatusCode }, DEFAULT_COLORS);
        }

        function treeCallback(val, key) {
            return clr('023', key.toUpperCase()) + clr.gray(`: ${val}`);
            // return clr('244', key.toUpperCase()) + clr.gray(`: ${val}`);
            // return clr('106', key.toUpperCase()) + clr.gray(`: ${val}`);
        }

        const headersDataColored = headerData(this.api, colors)
            + '\n' + datas.tree(values, this.indentWidth, this.frameWidth, treeCallback) 
            + '\n\n'
        ;

        process.stdout.write(headersDataColored);
    }
}

function paintStatusCode(val) {
    if (val>199 && val<300) { return 'green'; }
    else if (val>299 && val<400) { return 'brown'; }
    else if (val>399) { return 'red'; }
    return 'gray';
}

function getCacheType(headers) {
    const pragma = headers.hasOwnProperty('pragma') ?headers.pragma.toLowerCase() :'';
    let cacheType = '';

    if (headers.hasOwnProperty('cache-control')) {
        cacheType = headers['cache-control'].toLowerCase();

        if (cacheType.indexOf(pragma) == -1) {
            cacheType = cacheType.split(',').concat([ pragma ]).join(',');
        }
    }

    // cacheType = cacheType.split(',').filter(val => val.indexOf('=')==-1).join(',');
    if (cacheType.indexOf('no-cache') > -1) {
        cacheType = 'no-cache';
    }

    return cacheType;
}

function getContentType(val, separator=', ') {
    if (datas.isEmpty(val)) {
        return '';
    }

    let chunks = val.split(';');
    const types = [];

    if (chunks.length > 0) {
        types.push(chunks.shift().trim().split('/')[1]);
        chunks.map(item => {
            const [ key, value ] = item.trim().toLowerCase().split('=');
            if (key == 'charset') {
                value.indexOf('utf')==-1 && types.push(value)
            } else {
                types.push(value);
            }
            // types[ key ] = value;
        });
    }

    return types.join(separator);
}

function formatHeaders(headers, limit=86, indent=0, colors={}) {
    // const HEAD_SEPARATOR = colors ?paint('separator-head', SEP_HEAD, colors) :SEP_HEAD;
    // const CONT_SEPARATOR = colors ?paint('separator-cont', SEP_CONT, colors) :SEP_CONT;

    const hdrServer = [
        'server', 'date', 'content-length',
    ];

    const hdrContent = [
        'content-type', 'content-encoding', 'transfer-encoding', 'set-cookie',
        'cache-control', 'pragma', 'connection', 'expires',
        'strict-transport-security', 'x-content-type-options', 'vary',
    ];

    const callbacks = {
        'content-length': val => val > 0 ?`${(val/1024).toFixed(2)} Kb` :null,
        // 'content-type': val => getContentType(val, CONT_SEPARATOR),
        // 'content-type': val => getContentType(val),
        'content-type': val => colors.hasOwnProperty('content-type') 
            ? clr(colors['content-type'], getContentType(val))
            : getContentType(val),
        'cache-control': val => getCacheType(headers),
        'set-cookie': val => datas.isEmpty(val) ?null :'cookie',
        'strict-transport-security': val => null,
        'connection': val => null,
        'expires': val => null,
        'pragma': val => null,
        'vary': val => null,
    };

    let server = [];
    let content = [];
    let other = [];

    for (const item of hdrServer) {
        if (headers.hasOwnProperty(item)) {
            const value = callbacks.hasOwnProperty(item) ?callbacks[item](headers[item]) :headers[item];
            // value && server.push(datas.splitText(value, limit, 4, 2+item.length));
            value && server.push(value);
        }
    }

    for (const item of hdrContent) {
        if (headers.hasOwnProperty(item)) {
            const value = callbacks.hasOwnProperty(item) ?callbacks[item](headers[item]) :headers[item];
            // value && content.push(datas.splitText(value, limit, 4, 2+item.length));
            value && content.push(value);
        }
    }

    Object.keys(datas.getItemsExcept(headers, [].concat(hdrServer, hdrContent))).map(item => {
        const value = headers[item];
        value && other.push(datas.splitText(`${item}: ${value}`, limit-indent, indent, 2+item.length));
    });

    if (server.length) {
        const SEPARATOR = ' | ';
        const text = util.format('%s\n', datas.splitText(server.join(SEPARATOR), limit-indent, indent));
        // const color = colors.hasOwnProperty('server') ?colors.server :'244';
        const color = colors.hasOwnProperty('server') ?colors.server :undefined;
        server = text.split(SEPARATOR).map(item => color?clr(color, item):item).join(SEPARATOR);
    } else
        server = '';

    if (content.length) {
        const SEPARATOR = '; ';
        const text = util.format('%s\n', datas.splitText(content.join(SEPARATOR), limit-indent, indent));
        // const color = colors.hasOwnProperty('content') ?colors.content :'244';
        const color = colors.hasOwnProperty('content') ?colors.content :undefined;
        content = text.split(SEPARATOR).map(item => color?clr(color, item):item).join(SEPARATOR);
    } else
        content = '';

    // content = content.length
    //     ? util.format('%s\n', datas.splitText(content.join('; '), limit-indent, indent)) :'';

    other = other.length
        ? util.format('%s\n', other.join('\n')) :'';

    // return util.format('%s%s%s', server, content, other);
    return server + content + other;
}

function headerData(instanceAPI, colors) {
    const { req, res } = instanceAPI.client;
    const options = instanceAPI.client.requestOptions;
    // const data = instanceAPI.client.requestData;

    // const requestHeaders = options.headers;
    // const responseHeaders = res.headers;

    const indentWidth = 4;
    const frameWidth = process.stdout.columns - indentWidth * 2;

    let statusContent;
    let headersContent;

    if (colors) {

        let statusColor = colors.hasOwnProperty('status') ?colors.status :'default';   // Green
        const methodColor = colors.hasOwnProperty('method') ?colors.method :'default'; // White
        const hrefColor = colors.hasOwnProperty('href') ?colors.href :'default';       // Gray

        if (datas.isFunction(statusColor)) {
            statusColor = statusColor(res.statusCode);
        }
        // console.log(colors);

        statusContent = util.format('%s %s %s', clr(statusColor, res.statusCode), clr(methodColor, req.method), clr(hrefColor, options.href));
        headersContent = formatHeaders(res.headers, frameWidth, indentWidth, colors);
        headersContent = appendCookies(headersContent, instanceAPI.client, frameWidth, indentWidth, colors);

    } else {

        statusContent = util.format('%s %s %s', res.statusCode, req.method, options.href);
        headersContent = formatHeaders(res.headers, frameWidth, indentWidth);
        headersContent = appendCookies(headersContent, instanceAPI.client, frameWidth, indentWidth);

    }

    return [statusContent, headersContent].join('\n');
}

function appendCookies(text='', client, frameWidth, indentWidth, colors) {
    const options = client.requestOptions;
    let content = text;

    if (options.headers.hasOwnProperty('Cookie')) {
        const cookies = colors ?clr.gray(options.headers.Cookie) :options.headers.Cookie;
        const splitted = datas.splitText('cookie: '+cookies, frameWidth-indentWidth, indentWidth);
        content = util.format('%s\n%s', splitted, content);
    }

    if (client.res.headers.hasOwnProperty('set-cookie')) {
        const cookiesData = getCookiesFrom(client);

        if (cookiesData.length) {
            const cookies = colors ?clr.gray(cookiesData) :cookiesData;
            const splitted = datas.splitText('set-cookie: '+cookies, frameWidth-indentWidth, indentWidth);
            content = util.format('%s\n%s', content, splitted);
        }
    }

    return content;
}

function getCookiesFrom(client) {
    const parsedCookies = Cookie.parse(client.res.headers['set-cookie']);

    if (datas.isObject(parsedCookies)) {
        const items = Object.keys(parsedCookies).map(key => parsedCookies[key].value);
        return items.join('; ');
    }

    return '';

    // const hostname = client.getHostname();
    // const cookies = client.cookies.getValues(hostname);
    // return typeof(cookies)=='string' ?cookies :'';
}

module.exports = Formatter;
