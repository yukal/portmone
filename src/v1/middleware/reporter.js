const util = require('util');
const fs = require('fs');
const datas = require('./datas');

const INDENT_STEP = 4;
const DEFAULT_COLORS = {
    'default': 'dark-gray',
    'content-type': '256:106',
    'content-encoding': '256:106',
    // 'content-type': 'cyan',
    // 'content-encoding': 'cyan',
    // 'transfer-encoding': 'light-magenta',
    // 'date': 'yellow',
    // 'expires': 'yellow',
    'method': 'white',
};
const PALETTE = {
    'default': 39,
    'black': 30,
    'red': 31,
    'green': 32,
    'yellow': 33,
    'blue': 34,
    'magenta': 35,
    'cyan': 36,
    'light-gray': 37,
    'dark-gray': 90,
    'light-red': 91,
    'light-green': 92,
    'light-yellow': 93,
    'light-blue': 94,
    'light-magenta': 95,
    'light-cyan': 96,
    'white': 97,
};

function paint(key, val, colors) {
    const defaultColor = colors.default || 'default';
    let color = defaultColor;

    if (typeof(colors[key]) == 'string') {
        if (colors[key].substr(0,4) == '256:') {
            return util.format('\x1B[38;05;%sm%s\x1B[0m', colors[key].substr(4), val)
        } else {
            color = colors[key] || 'default';
        }
    }

    if (typeof(colors[key]) == 'function') {
        color = colors[key](val) || 'default';
        if (!PALETTE.hasOwnProperty(color)) {
            return color;
        }
    }

    return colors.hasOwnProperty(key)
        ? util.format('\x1B[%sm%s\x1B[0m', PALETTE[color], val)
        : util.format('\x1B[%sm%s\x1B[0m', PALETTE[defaultColor], val);
}

function formatOptions(data, indentNum=2, colors) {
    const indent = ' '.repeat(indentNum);
    const headers = {};
    const info = [];

    if (! data) {
        return info;
    }

    const contentLength = data.hasOwnProperty('content-length')
        ? Math.round(data['content-length'] / 1024) : 0;
    const cntlenInfo = contentLength>0 ? ` (${contentLength} Kb)` : '';
    const date = data.hasOwnProperty('date') ?data.date :'';
    headers.server = `${data.server}  ${ date }${ cntlenInfo }`;

    const contentData = [
        getContentType(data).join(', '),
        data.hasOwnProperty('content-encoding') 
            ? data['content-encoding'] : '',
        data.hasOwnProperty('set-cookie') ?'cookie' :'',
        data.hasOwnProperty('transfer-encoding') 
            ? data['transfer-encoding'] : '',
        data.hasOwnProperty('x-content-type-options') 
            ? data['x-content-type-options'] : '',
        getCacheType(data),
        data.hasOwnProperty('strict-transport-security') 
            ? data['strict-transport-security'] : '',
        data.hasOwnProperty('vary') 
            ? data['vary'] : '',
    ].filter(s=>s.length).join('; ');

    if (contentData.length > 2) {
        headers.content = contentData;
    }

    Object.assign(headers, datas.getRemains(data, [
        'server', 'date', 'content-type', 'connection', 'expires',
        'transfer-encoding', 'cache-control', 'pragma', 'set-cookie',
        'strict-transport-security', 'x-content-type-options', 'vary',
        'content-length', 'content-encoding',
    ]));

    for (const key in headers) {
        let str = Array.isArray(headers[ key ])
            ? headers[ key ].join('\n' + indent + ' '.repeat(key.length + 2))
            : headers[ key ]
        ;

        colors && (str = paint(key, str, colors));
        info.push(util.format('%s%s: %s\n', indent, datas.textCapital(key), str));
    }

    return info;
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

function getContentType(data, key='content-type') {
    const types = [];
    let chunks = data.hasOwnProperty(key) ?data[key].split(';') :[];

    if (! data.hasOwnProperty(key)) {
        return types;
    }

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

    return types;
}

getRequestInfo.formatData = function(data, indentNum=2) {
    const indent = ' '.repeat(indentNum);
    const info = [];

    if (typeof(data) == 'object' && data !== null) {
        for (const key in data) {
            let str = Array.isArray(data[ key ])
                ? data[ key ].join('\n' + indent + ' '.repeat(key.length + 2))
                : data[ key ]
            ;

            // info.push(util.format('\x1B[96m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
            // info.push(util.format('\x1B[36m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
            // info.push(util.format('\x1B[38;05;130m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
            // info.push(util.format('\x1B[38;05;035m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
            // info.push(util.format('\x1B[38;05;161m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
            // info.push(util.format('\x1B[38;05;202m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
            info.push(util.format('\x1B[38;05;106m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));
        }
    }
    else if (typeof(data) == 'string') {

        info.push(util.format('\x1B[38;05;106m%s%s\x1B[0m: %s\n', indent, key.toUpperCase(), str));

    } else {
        info.push(data);
    }

    return info;
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
    info = info.concat(formatOptions(headers, indentNum, colors));
    info.push('\n');
    // info = info.concat(getRequestInfo.formatData(parsedData.values ?parsedData.values :parsedData, indentNum, colors));

    // return info.join('') + '\n\n';
    return info.join('');
}

getRequestInfo.file = function(response, indentNum=2) {
    const filename = getPageID(response.options);
    const fileData = `./data/cache/${filename}.data`;
    const fileRaw  = `./data/cache/${filename}.raw`;

    const body = datas.isObject(response.body) 
        ? JSON.stringify(response.body, null, 4) 
        : response.body
    ;

    fs.writeFile(fileRaw, body, 'utf8', function(err) {
        if (err) return console.error(err);
        // console.log('File saved to:', destination);
    });
}

getRequestInfo.stdout = function(response, indentNum=2, colors) {
    if (!colors) {
        colors = DEFAULT_COLORS;
        Object.assign(colors, {
            'statusCode': paintStatusCode,
            // 'path': paintPath,
        });
    }

    const content = getRequestInfo(response, indentNum, colors);
    process.stdout.write(content);
}

function getPageID(options) {
    const { host, path } = options;
    let alias = host + path.split('?').shift();

    if (alias[alias.length-1] == '/') {
        alias = alias.substr(0, alias.length-1);
    }

    return alias
        .replace(/^www\./, '')
        .replace(/\W/g, '.')
        .replace(/\.+/g, '.')
    ;
}

function paintStatusCode(val) {
    if (val>199 && val<300) {
        return 'green';
    }

    else if (val>299 && val<400) {
        return 'yellow';
    }

    else if (val>399 && val<500) {
        return 'red';
    }

    return 'default';
}

module.exports = getRequestInfo;
