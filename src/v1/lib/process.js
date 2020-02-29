const { STATUS_CODES } = require('http');

function send(response, data, statusCode=200, headers={}) {
    response.statusCode = statusCode;

    // console.log(Object.getPrototypeOf(Object.getPrototypeOf(response)));
    // process.exit(0);

    // if (!response.hasOwnProperty('setHeader')) {
    //     return response.end(buildHeaders(headers, statusCode, data));
    // }

    Object.keys(headers).map(item => response.setHeader(item, headers[item]));

    return data 
        ? response.end(data)
        : response.end()
    ;
}

function done(response, data, statusCode=200, headers={}) {
    return send(response, data, statusCode, headers);
}

function fail(response, data, statusCode=400, headers={}) {
    return send(response, data, statusCode, headers);
}

done.plain = function sendSuccessAsPlainText(response, data, statusCode=200, headers={}) {
    const headersData = Object.assign({}, headers, {'Content-Type': 'text/plain'});
    return send(response, data, statusCode, headersData);
}
fail.plain = function sendFailedAsPlainText(response, data, statusCode=400, headers={}) {
    const headersData = Object.assign({}, headers, {'Content-Type': 'text/plain'});
    return send(response, data, statusCode, headersData);
}

done.json = function sendSuccessAsJsonData(response, data, statusCode=200, headers={}) {
    const headersData = Object.assign({}, headers, {'Content-Type': 'application/json'});
    const jsonString = prepareJsonData(true, data);
    return send(response, jsonString, statusCode, headersData);
}
fail.json = function sendFailedAsJsonData(response, data, statusCode=400, headers={}) {
    const headersData = Object.assign({}, headers, {'Content-Type': 'application/json'});
    const jsonString = prepareJsonData(false, data);
    return send(response, jsonString, statusCode, headersData);
}

function prepareJsonData(success, data) {
    let responseData = { success };

    if (data instanceof Object) {
        responseData = Object.assign({}, data, responseData);
    } else if (typeof data == 'string') {
        responseData.message = data;
    }

    return JSON.stringify(responseData, null, 2);
}

function buildHeaders(headers, statusCode, content='') {
    // const CRLF = '\r\n';
    const headerData = Object.assign({ date: getFormattedDate() }, headers);
    const headerString = Object.keys(headerData).map(item => `${item}: ${headerData[item]}`).join('\r\n');

    const statusMessage = STATUS_CODES.hasOwnProperty(statusCode)
        ? STATUS_CODES[ statusCode ] 
        : 'Unknown Status'
    ;

    return content 
        ? `HTTP/1.1 ${statusCode} ${statusMessage}\r\n${headerString}\r\n\r\n${content}`
        : `HTTP/1.1 ${statusCode} ${statusMessage}\r\n${headerString}\r\n\r\n`
    ;
}

function getFormattedDate() {
    // Sunday, Monday, Tuesday Wednesday Thursday Friday Saturday
    const weekDaysShort = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
    const monthsShort = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const dt = new Date();
    let hours = dt.getUTCHours();
    let minutes = dt.getUTCMinutes();
    let seconds = dt.getUTCSeconds();

    if (hours < 10) {
        hours = `0${hours}`;
    }

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }

    if (seconds < 10) {
        seconds = `0${seconds}`;
    }

    const dateChunks = [
        weekDaysShort[dt.getUTCDay()] + ',',
        dt.getUTCDate(),
        monthsShort[dt.getUTCMonth()],
        dt.getUTCFullYear(),
        `${hours}:${minutes}:${seconds}`,
        'UTC'
    ];

    return dateChunks.join(' ');
}

module.exports = {
    fail,
    done,
};
