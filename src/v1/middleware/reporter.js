const util = require('util');
const fs = require('fs');
const datas = require('./datas');
const clr = require('./colors');

const SEP_HEAD = ' > ';
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

    Object.assign(headers, datas.getItemsExcept(data, [].concat(hdrServer, hdrContent)));

    for (const key in headers) {
        let val = Array.isArray(headers[ key ])
            ? headers[ key ].join('\n' + indent + ' '.repeat(key.length + 2))
            : headers[ key ]
        ;

        const title = util.format('%s: ', datas.textCapital(key));
        // val = cropToChunks(title, val, indent);

        colors && (val = paint(key, val, colors));
        info.push(util.format('%s%s%s\n', indent, title, val));
    }

    return info;
}

function cropToChunks(title, val, indent, max=false) {
    const topLineLimit = BLOCK_LIMIT - (indent.length + title.length);
    const subLineLimit = BLOCK_LIMIT - indent.length;
    // const indentSubLine = ' '.repeat(indent.length + title.length);

    const value = max ?val.substr(0, max) :val;

    const chunks = [];
    let topLine = value.substr(0, topLineLimit);
    let subLine = value.substr(topLineLimit);
    let substr = '';
    let start = 0;

    while (substr = subLine.substr(start, subLineLimit)) {
        chunks.push(substr);
        start += subLineLimit;
    }

    return util.format('%s\n%s', topLine, chunks.join(`${ indent }\n`));
}

function getCacheType(data) {
    const pragma = data.hasOwnProperty('pragma') ?data.pragma.toLowerCase() :'';
    let cacheType = '';

    if (data.hasOwnProperty('cache-control')) {
        cacheType = data['cache-control'].toLowerCase();

        if (cacheType.indexOf(pragma) == -1) {
            cacheType = cacheType.split(',').concat([ pragma ]).join(',');
        }
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
            if (key.toLowerCase() == 'charset') {
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

getRequestInfo.file = function(response, indentNum=2) {
    // const fileData = `./data/cache/${filename}.data`;
    // const filename = 'dump-' + (new Date().toISOString()).replace(/\W/g,'');
    // const destination  = `./data/cache/${filename}.raw`;
    // const body = datas.isObject(response.body) 
    //     ? JSON.stringify(response.body, null, 4) 
    //     : response.body
    // ;

    const destination  = `./dump.log`;
    const body = getRequestInfo(response, indentNum);

    fs.appendFile(destination, body, 'utf8', function(err) {
        if (err) return console.error(err);
        // console.log('File saved to:', destination);
    });
}

getRequestInfo.stdout = function(response, indentNum=2, colors) {
    if (!colors) {
        colors = {
            'default': 'gray',
            'content-type': '029',
            'content-encoding': '029',
            'transfer-encoding': '029',
            'set-cookie': '029',
            'separator-head': '236',
            'separator-cont': '236',
            'method': 'white',
            'statusCode': paintStatusCode,
        };
    }

    const content = getRequestInfo(response, indentNum, colors);
    process.stdout.write(content);
}

function paintStatusCode(val) {
    if (val>199 && val<300) {
        return 'green';
    }

    else if (val>299 && val<400) {
        return 'brown';
    }

    else if (val>399) {
        return 'red';
    }

    return 'gray';
}

module.exports = getRequestInfo;
