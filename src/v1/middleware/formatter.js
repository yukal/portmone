const util = require('util');
const fs = require('fs');
const datas = require('./datas');
const clr = require('./colors');

const SEP_HEAD = ' | ';
const SEP_CONT = '; ';
const BLOCK_LIMIT = 104;

function paint(key, val, colors) {
    let color = colors.hasOwnProperty(key) ?colors[key] :'gray';

    if (datas.isFunction(color)) {
        color = color(val);
    }

    return clr.hasOwnProperty(color)
        ? clr[color](val)
        : clr(color, val)
    ;
}

function formatHeaderItems(data, items, formats={}, colors) {
    const formattedItems = [];
    for (const name of items) {
        let value = formats.hasOwnProperty(name)
            ? formats[name](datas.getDataFrom(data, name))
            : datas.getDataFrom(data, name)
        ;

        if (! datas.isEmpty(value)) {
            colors
                ? formattedItems.push(paint(name, value, colors))
                : formattedItems.push(value)
            ;
        }
    }
    return formattedItems;
}

function formatHeaders(data, indentNum=2, colors) {
    const indent = ' '.repeat(indentNum);
    const headers = {};
    let info = [];

    const HEAD_SEPARATOR = colors ?paint('separator-head', SEP_HEAD, colors) :SEP_HEAD;
    const CONT_SEPARATOR = colors ?paint('separator-cont', SEP_CONT, colors) :SEP_CONT;

    if (! data) {
        return info;
    }

    const hdrServer = [
        'server', 'date', 'content-length',
    ];

    const hdrContent = [
        'content-type', 'content-encoding', 'connection', 'expires',
        'transfer-encoding', 'cache-control', 'pragma', 'set-cookie',
        'strict-transport-security', 'x-content-type-options', 'vary',
    ];

    const formats = {
        'content-length': val => val > 0 ?`${val} bytes` :null,
        'content-type': val => getContentType(val, CONT_SEPARATOR),
        'cache-control': val => getCacheType(data),
        'connection': val => null,
        'set-cookie': val => datas.isEmpty(val) ?null :'cookie',
        'expires': val => null,
        'pragma': val => null,
        'vary': val => null,
    };

    const serverInfo = formatHeaderItems(data, hdrServer, formats, colors);
    serverInfo.length>0 && info.push(util.format('%s%s\n', indent, serverInfo.join(HEAD_SEPARATOR)));

    const contentInfo = formatHeaderItems(data, hdrContent, formats, colors);
    contentInfo.length>0 && info.push(util.format('%s%s\n', indent, contentInfo.join(CONT_SEPARATOR)));

    // Object.assign(headers, datas.getItemsExcept(data, [].concat(hdrServer, hdrContent)));
    for (const key in headers) {
        let val = Array.isArray(headers[ key ])
            ? headers[ key ].join('\n' + indent + ' '.repeat(key.length + 2))
            : headers[ key ]
        ;

        const title = util.format('%s: ', datas.textCapital(key));

        colors && (val = paint(key, val, colors));
        info.push(util.format('%s%s%s\n', indent, title, val));
    }

    return info;
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

function getRequestInfo(response, indentNum=2, colors) {
    const { res, options, body, postData } = response;
    const headers = datas.cloneObject(res.headers);
    const indent = ' '.repeat(indentNum);
    let info = [];

    const status = colors ?paint('statusCode', res.statusCode, colors) :res.statusCode;
    const method = colors ?paint('method', res.req.method, colors) :res.req.method;
    const path   = colors ?paint('path', options.href, colors) :options.href;
    // const path   = colors ?paint('path', res.req.path, colors) :res.req.path;

    info.push(util.format('%s %s %s\n', status, method, path));
    info = info.concat(formatHeaders(headers, indentNum, colors));
    info.push('\n');

    // return info.join('') + '\n\n';
    return info.join('');
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
    const { statusCode, headers } = instanceAPI.client.res;
    const { href } = instanceAPI.client.requestOptions;
    const { method } = instanceAPI.client.req;

    const indentWidth = 4;
    const frameWidth = process.stdout.columns - indentWidth * 2;

    let statusContent;
    let headersContent;

    if (colors) {

        let statusColor = colors.hasOwnProperty('status') ?colors.status :'default';   // Green
        const methodColor = colors.hasOwnProperty('method') ?colors.method :'default'; // White
        const hrefColor = colors.hasOwnProperty('href') ?colors.href :'default';       // Gray

        if (datas.isFunction(statusColor)) {
            statusColor = statusColor(statusCode);
        }
        // console.log(colors);

        statusContent = util.format('%s %s %s', clr(statusColor, statusCode), clr(methodColor, method), clr(hrefColor, href));
        headersContent = formatHeaders(instanceAPI.client.res.headers, frameWidth, indentWidth, colors);

    } else {

        statusContent = util.format('%s %s %s', statusCode, method, href);
        headersContent = formatHeaders(instanceAPI.client.res.headers, frameWidth, indentWidth);

    }

    return [statusContent, headersContent].join('\n');
}

const formatter = {
    headerData,
};

module.exports = formatter;
