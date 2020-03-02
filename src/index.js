const Fs = require('fs');
const Https = require('https');
const Querystring = require('querystring');
const { STATUS_CODES } = require('http');
const { CRLF } = require('_http_common');

const { fail, done } = require('./v1/lib/process');
const controllers = {
    'v1': require('./v1/controllers')
};

const SRV_HOST = '0.0.0.0';
const SRV_PORT = 5000;
const SRV_TIMEOUT = 15000;
const MAX_PAYLOAD = 2048;

class HttpError extends Error {
    constructor(statusCode, message='') {
        super(`${statusCode} ${message}`);
        this.message = message;
        this.statusCode = statusCode;
        this.statusMessage = STATUS_CODES.hasOwnProperty(statusCode) 
            ? STATUS_CODES[ statusCode ] 
            : 'Unknown Error'
        ;
        // this.name = 'HttpError';
    }
}

const srv = Https.createServer({
    key:  Fs.readFileSync('./data/localhost-pkey.pem'),
    cert: Fs.readFileSync('./data/localhost-cert.pem'),
});
// srv.keepAliveTimeout = 5000;

srv.on('connection', onClientConnection);
srv.on('request', onClientRequest);
srv.on('clientError', onClientError);
srv.on('close', onServerClose);

srv.listen(SRV_PORT, SRV_HOST, onStartListening);
// srv.setTimeout(SRV_TIMEOUT, onServerSocketTimeout);


function onStartListening(err) {
    if (err) throw err;
    process.stdout.write(`Start API on ${this._connectionKey.substr(2)}${CRLF}`);
}

function onServerClose() {
    process.stdout.write(`Server closed${CRLF}`);
}

function onServerSocketTimeout(socket) {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    process.stdout.write(`${connectionId} (${arguments.callee.name})${CRLF}`);

    fail.json(socket, 'Timeout exceeded. Please try again later', 408, {
        'connection': 'close'
    });
}

function onClientError(err, socket) {
    // console.log(socket.destroyed, err.message);

    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    process.stdout.write(`${connectionId} (${arguments.callee.name}) ${err.message}${CRLF}`);

    if (err instanceof HttpError) {
        socket.end(`HTTP/1.1 ${err.statusCode} ${err.statusMessage}${CRLF+CRLF+err.message}`);
    } else {
        socket.end(`HTTP/1.1 400 Bad Request${CRLF+CRLF+err.message}`);
    }
}

function onClientConnection(socket) {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    process.stdout.write(`${connectionId} (${arguments.callee.name})${CRLF}`);
};

/**
 * onClientRequest
 * @param {Object} req http.IncomingMessage An IncomingMessage object is created by http.Server or http.ClientRequest and passed as the first argument to the 'request' and 'response' event respectively. It may be used to access response status, headers and data.
 * @param {Object} res http.ServerResponse
 */
function onClientRequest(req, res) {
    const connectionId = `${req.client.remoteAddress}:${req.client.remotePort}`;
    const dataPocket = {
        chunks: [],
        bytes: 0
    };

    process.stdout.write(`${connectionId} (${arguments.callee.name}) ${req.method} ${req.url}${CRLF}`);

    req.on('data', chunk => onClientData.call(req, res, chunk, dataPocket));
    req.on('end', onClientEnd.bind(this, req, res, dataPocket));
    req.on('error', onClientRequestError);
    // req.on('close', onClientClose);

    // res.on('timeout', onClientRequestTimeout);
    res.setTimeout(15000, onClientRequestTimeout);
    res.on('close', onClientClose.bind(res, connectionId));

    // setTimeout(onClientRequestTimeout.bind(res, res.socket), 15000);
}

function onClientRequestTimeout(socket) {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    process.stdout.write(`${connectionId} (${arguments.callee.name})${CRLF}`);

    if (!this.headersSent) {
        fail.json(this, 'Timeout exceeded. Please try again later', 408);
    }
}

function onClientRequestError(err) {
    const connectionId = `${this.socket.remoteAddress}:${this.socket.remotePort}`;
    process.stdout.write(`${connectionId} (${arguments.callee.name}) ${err.message}${CRLF}`);
}

function onClientData(res, chunk, dataPocket) {
    const connectionId = `${this.socket.remoteAddress}:${this.socket.remotePort}`;
    dataPocket.bytes += chunk.length;

    if (dataPocket.bytes <= MAX_PAYLOAD) {
        process.stdout.write(`${connectionId} (${arguments.callee.name}) ${this.socket.bytesRead} b ${CRLF}`);
        dataPocket.chunks.push(chunk);
    } else {
        const message = `Data limit exceeded. Maximum ${MAX_PAYLOAD} bytes are expected`;
        const error = new Error(message);
        error.code = 'ECONNRESET';
        return this.emit('error', error);
    }
}

function onClientEnd(req, res, dataPocket) {
    const connectionId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

    if (dataPocket.bytes > MAX_PAYLOAD) {
        if (!res.headersSent) {
            const message = `Data limit exceeded. Maximum ${MAX_PAYLOAD} bytes are expected`;
            return fail.json(res, message, 413, { 'Connection': 'close' })
                , req.socket.destroy()
            ;
        }

        return ;
    }

    const data = collectData(req, dataPocket.chunks);
    const controller = getController(req, controllers);

    dataPocket.chunks = [];
    dataPocket.bytes = 0;

    // TODO: CORS

    if (controller instanceof Function) {
        process.stdout.write(`${connectionId} (${arguments.callee.name}) >> ${controller.name}()${CRLF}`);
        return controller.call(this, req, res, data);
    }

    return fail.json(res, 'Unsupported url-path or request-method', 404);

    // return controller instanceof Function
    //     ? controller.call(this, req, res, data)
    //     : fail.json(res, getErrorMessage(controller), 404)
    //     // : fail.json(res, 'Unsupported url-path or request-method', 404)
    // ;
}

function onClientClose(connectionId='') {
    // process.stdout.write(`${connectionId} (${arguments.callee.name}) ${this.statusCode} ${this.statusMessage}${CRLF}`);
    process.stdout.write(`${connectionId} (onClientClose) ${this.statusCode} ${this.statusMessage}${CRLF}`);
}

function collectData(req, chunks) {
    let data = Buffer.concat(chunks).toString('ascii');

    const contentType = req.headers.hasOwnProperty('content-type')
        ? req.headers['content-type'].split(';').shift().toLowerCase().trim()
        : ''
    ;

    try {
        if (contentType == 'application/x-www-form-urlencoded') {
            data = Querystring.parse(data);
        }

        else if (contentType == 'application/json') {
            data = JSON.parse(data);
        }
    } catch(err) {
        process.stderr.write(` (${arguments.callee.name}) ${err.message + CRLF}`);
        return false;
    }

    return data;
}

function getController(request, controllers) {
    let { url, method } = request;

    // if (url == '/') {}

    if (url.length > 1) {
        const urlChunks = url.substr(1).toLowerCase().split('/');
        let urlChunksLen = urlChunks.length;
        let urlChunk;
        let controllerName = '';
        let nesting = controllers;

        while (urlChunksLen > 1) {
            urlChunk = urlChunks.shift();
            urlChunksLen--;

            if (nesting.hasOwnProperty(urlChunk)) {
                nesting = nesting[ urlChunk ];
            } else {
                break;
            }
        }

        if (urlChunksLen == 1) {
            controllerName = getControllerName(urlChunks.shift(), method);

            if (!controllerName) {
                return false;
            }

            return nesting.hasOwnProperty(controllerName)
                ? nesting[ controllerName ] 
                : false
            ;
        }
    }

    return false;
}

function getControllerName(methodName='', prefix='') {
    if (!methodName) {
        return '';
    }

    const controllerName = prefix 
        ? `act-${prefix.toLowerCase()}-${methodName}`
        : `act-${methodName}`
    ;

    return controllerName.replace(/\-\w/g, s => s[1].toUpperCase());
}

function getRouteFromRequest(request, root='/home') {
    let { url, method } = request;

    if (url == '/') {
        url = root;
    }

    url = `act-${method}-${url.substr(1)}`.toLowerCase();
    return url.replace(/\-\w/g, s => s[1].toUpperCase());
}
