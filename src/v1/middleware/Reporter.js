/**
 * Reporter
 * Generates specific data information, that collects from a request, 
 * into a string and passes it to a stream or a variable.
 *
 * @file
 * @ingroup Helpers
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

const clr = require('./colors');
const Cookie = require('./Cookie');
const { tree, splitText } = require('./datas');

class Reporter {
    getData(callbacks) {
        const indentWidth = this.params.indentWidth;
        const frameWidth = this.params.frameWidth;
        const chunks = [];
        let group = 'head';
        let breakline = '';

        if (!callbacks) {
            callbacks = { head:{}, body:{} };
        }

        this.scenarios.map(scenario => {
            const buf = [];
            const separator = scenario.hasOwnProperty('separator') ?scenario.separator :' ';
            const indent = scenario.hasOwnProperty('indent') ?scenario.indent :indentWidth;

            scenario.callbacks.map(callback => {
                const sneraioParams = Object.assign({indentWidth, frameWidth, colored:false}, scenario);
                const data = callback(this.params, sneraioParams);
                data.length && buf.push(data);
            });

            if (group != scenario.group) {
                group = scenario.group;
                breakline = "\n";
            } else {
                breakline = '';
            }

            if (buf.length) {
                const data = indent !== false
                    ? splitText(buf.join(separator), frameWidth-indent, indent)
                    : buf.join(separator)
                ;

                data && chunks.push(`${breakline}${data}\n`);
            }
        });

        return chunks.join("\n");
    }

    /**
     * out
     * Writes data to a stream
     * @see middleware/colors.js
     *
     * @param {WriteStream} stream WritableStream
     * @param {Bool} colored [optional] Appends ANSI metacodes to a string
     * @returns {Object} Reporter instance
     */
    out(stream, colored) {
        const scenariosLength = this.scenarios.length;
        const indentWidth = this.params.indentWidth;
        const frameWidth = this.params.frameWidth;
        let group = scenariosLength ?this.scenarios[0].group :'';
        let currScenarioNum = 0;

        if (colored === undefined) {
            colored = isTTY(stream);
        }

        for (const scenario of this.scenarios) {
            currScenarioNum += 1;

            const buf = [];
            const separator = scenario.hasOwnProperty('separator') ?scenario.separator :' ';
            const indent = scenario.hasOwnProperty('indent') ?scenario.indent :indentWidth;

            scenario.callbacks.map(callback => {
                const sneraioParams = Object.assign({indentWidth, frameWidth, colored}, scenario);
                const data = callback(this.params, sneraioParams);
                data.length && buf.push(data);
            });

            if (buf.length) {
                let beforeBreak;

                if (group != scenario.group) {
                    group = scenario.group;
                    beforeBreak = '\n';
                } else {
                    beforeBreak = '';
                }

                // splitText(buf.join(separator), frameWidth-indent, indent)
                const data = indent !== false
                    ? splitText(buf.join(separator), frameWidth, indent)
                    : buf.join(separator)
                ;

                stream.write(`${beforeBreak}${data}\n`);
            }

            if (currScenarioNum == scenariosLength) {
                stream.write("\n");
            }
        }

        return this;
    }

    setData(data) {
        if (data !== null && typeof(data) == 'object') {
            // this.params.data = data;

            for (const item in data) {
                this.params[item] = data[item];
                // console.log('Rpt-update "%s"', item);
            }
        }

        return this;
    }

    constructor(params={}) {
        if (params !== null && typeof(params) == 'object') {
            if (!params.hasOwnProperty('indentWidth')) {
                params.indentWidth = 4;
            }

            if (!params.hasOwnProperty('frameWidth')) {
                params.frameWidth = process.stdout.columns - params.indentWidth * 2;
            }

            Object.defineProperty(this, 'params', { value: params });
        }

        Object.defineProperty(this, 'scenarios', {
            value: [
                {
                    group: 'head',
                    indent: false,
                    separator: ' ',
                    callbacks: [
                        getRequestStatusCode,
                        getRequestMethod,
                        getRequestHref,
                    ]
                }, {
                    group: 'head',
                    callbacks: [
                        getRequestCookie
                    ]
                }, {
                    group: 'head',
                    separator: ' | ',
                    callbacks: [
                        getIMServer,
                        getIMDate,
                        getIMContentLength,
                    ]
                }, {
                    group: 'head',
                    separator: '; ',
                    callbacks: [
                        getIMContentType,
                        getIMContentEncoding,
                        getIMTransferEncoding,
                        getIMCookie,
                        getIMCache,
                    ]
                },
                {
                    group: 'body',
                    separator: ', ',
                    callbacks: [
                        getIMSetCookie
                    ]
                }, {
                    group: 'body',
                    indent: false,
                    callbacks: [
                        getParsedData
                    ]
                }
            ]
        });
    }
}


function getRequestStatusCode(params, scenario) {
    const { statusCode } = params.client.req.res;

    if (!scenario.colored) {
        return `${statusCode}`;
    }

    if (statusCode > 399) { return clr.red(statusCode); }
    if (statusCode > 299) { return clr.brown(statusCode); }
    if (statusCode > 199) { return clr.green(statusCode); }

    return clr.gray(statusCode);
}

function getRequestMethod(params, scenario) {
    const request = params.client.req;
    let method = '';

    if (request.hasOwnProperty('method')) {
        method = scenario.colored 
            ? clr.white(request.method) 
            : request.method
        ;
    }

    return method;
}

function getRequestHref(params, scenario) {
    const options = params.client.requestOptions;
    let href = '';

    if (options.hasOwnProperty('href')) {
        href = scenario.colored 
            ? clr.mono(8, options.href) 
            : options.href
        ;
    }

    return href;
}

function getRequestCookie(params, scenario) {
    const headers = params.client.requestOptions.headers;
    let cookie = '';

    if (headers.hasOwnProperty('Cookie')) {
        cookie = scenario.colored 
            ? 'cookie: ' + clr.mono(8, headers.Cookie) 
            : 'cookie: ' + headers.Cookie
        ;
    }

    return cookie;
}

function getIMServer(params, scenario) {
    const headers = params.client.req.res.headers;
    return headers.hasOwnProperty('server')
        ? headers.server 
        : ''
    ;
}

function getIMDate(params, scenario) {
    const headers = params.client.req.res.headers;
    return headers.hasOwnProperty('date')
        ? headers.date 
        : ''
    ;
}

function getIMContentLength(params, scenario) {
    const headers = params.client.req.res.headers;
    let contentLength = headers.hasOwnProperty('content-length')
        ? headers['content-length'] : params.client.req.socket.bytesRead;

    if (contentLength > 0) {
        contentLength = (contentLength/1024).toFixed(2) + ' Kb';
    }

    return contentLength;
}

function getIMContentType(params, scenario) {
    const headers = params.client.req.res.headers;

    if (!headers.hasOwnProperty('content-type')) {
        return '';
    }

    let chunks = headers['content-type'].split(';');
    const types = [];

    if (chunks.length > 0) {
        const contentType = chunks.shift().trim().split('/')[1];
        scenario.colored 
            ? types.push(clr('029', contentType))
            : types.push(contentType)
        ;

        chunks.map(item => {
            const [ key, value ] = item.trim().toLowerCase().split('=');
            if (key == 'charset') {
                value.indexOf('utf')==-1 && types.push(value);
            } else {
                types.push(value);
            }
            // types[ key ] = value;
        });
    }

    return types.length ?types.join(', ') :'';
}

function getIMContentEncoding(params, scenario) {
    const headers = params.client.req.res.headers;
    return headers.hasOwnProperty('content-encoding')
        ? headers['content-encoding'] 
        : '';
}

function getIMTransferEncoding(params, scenario) {
    const headers = params.client.req.res.headers;
    return headers.hasOwnProperty('transfer-encoding')
        ? headers['transfer-encoding'] 
        : '';
}

function getIMCookie(params, scenario) {
    const headers = params.client.req.res.headers;
    let cookie = '';

    if (headers.hasOwnProperty('cookie')) {
        cookie = scenario.colored 
            ? clr.gray(headers.cookie) 
            : headers.cookie
        ;
    }

    return cookie;
}

function getIMCache(params, scenario) {
    const headers = params.client.req.res.headers;
    const pragma = headers.hasOwnProperty('pragma') 
        ? headers.pragma.toLowerCase()
        : '';

    let cacheType = '';

    if (headers.hasOwnProperty('cache-control')) {
        cacheType = headers['cache-control'].toLowerCase();

        if (cacheType.indexOf(pragma) == -1) {
            cacheType = cacheType.split(',').concat([ pragma ]).join(',');
        }
    }

    if (cacheType.indexOf('no-cache') > -1) {
        cacheType = 'no-cache';
    }

    return cacheType;
}

function getIMSetCookie(params, scenario) {
    const headers = params.client.req.res.headers;

    if (headers.hasOwnProperty('set-cookie')) {
        const cookie = Cookie.parse(headers['set-cookie'], Cookie.AS_STRING);

        return scenario.colored 
            ? clr('023', 'SET-COOKIE: ') + clr.mono(8, cookie)
            : `set-cookie: ${cookie}`
        ;
    }

    return '';
}

function getParsedData(params, scenario) {
    if (!params.hasOwnProperty('data')) {
        return '';
    }

    const indentWidth = scenario.hasOwnProperty('indentWidth') ?scenario.indentWidth :4;
    const frameWidth = scenario.hasOwnProperty('frameWidth') 
        ? scenario.frameWidth :process.stdout.columns - indentWidth * 2;

    function treeCallback(val, key) {
        return clr('023', key.toUpperCase()) + clr.gray(`: ${val}`);
        // return clr('244', key.toUpperCase()) + clr.gray(`: ${val}`);
        // return clr('106', key.toUpperCase()) + clr.gray(`: ${val}`);
    }

    return scenario.colored 
        ? tree(params.data, indentWidth, frameWidth, treeCallback)
        : tree(params.data, indentWidth, frameWidth)
    ;
}

function isTTY(stream) {
    try {
        return stream.isTTY;
    }
    catch(err) {
        return false;
    }
}

module.exports = Reporter;
