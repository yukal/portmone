function isJSON(str) {
    if (typeof(str) == 'string') {
        return str[0] + str[str.length - 1] === '{}';
    }

    return false;
}

function isFunction(fn) {
    return fn && {}.toString.call(fn) === '[object Function]';
}

function isObject(data) {
    return data !== null && typeof(data) == 'object';
}

function cloneObject(obj, additions={}) {
    if (!isObject(obj) && !isFunction(obj)) {
        return null;
    }

    let clone = obj.constructor();

    // Object.assign(clone, obj);
    for (const attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            clone[attr] = obj[attr];
        }
    }

    return Object.assign(clone, additions);

    // const clone = JSON.parse(JSON.stringify(obj));
    // return additions ?Object.assign(clone, additions) :clone;
}

function assignObjects() {
    const args = Array.prototype.slice.call(arguments);
    const object = {};

    args.map(item => Object.assign(object, cloneObject(item)));

    return object;
}

function getItemsExcept(obj, exceptions=[]) {
    const items = {};
    Object.keys(obj).map(key => {
        exceptions.indexOf(key)===-1 && (items[ key ] = obj[ key ]);
    })
    return items;
}

function randomNumbers(len=4, prefix='') {
    let number = `${prefix}`;
    for (let n=0; n<len; n+=1) {
        const num = randomInt(0,9);
        number += `${num}`;
    }
    return number;
}

function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMaskFrom(data, mask) {
    let chunks = [];
    let acc = 0;

    if (typeof(mask) == 'string') {
        chunks = mask.split(' ').map(item => {
            const substr = data.substr(acc, item.length);
            acc += item.length;
            return substr;
        });
    }

    else if (Array.isArray(mask)) {
        chunks = mask.map(num => {
            const substr = data.substr(acc, num);
            acc += num;
            return substr;
        });
    }

    return chunks.join(' ');
}

// 1234 5678 9012 3456 == 16 length of digits
function getMaskCardN16(cn) {
    let chunks = [];

    if (chunks = cn.match(/\d{4}/g)) {
        return chunks.join(' ');
    }

    return '';
}

function getSessionID(keyPhrase, content) {
    const data = Array.isArray(content) ?content.join(';') :content;
    // const re = new RegExp(`${keyPhrase}=([^;]+)`, 'im');
    const re = new RegExp(`${keyPhrase}=([0-9a-z]+)`, 'im');
    let res;

    if (data) {
        if (res = data.match(re)) {
            // console.log(res);
            return res[1];
        }
    }

    return '';
}

/**
 * Parse Mobile Phone
 *
 * It parses all of the digits from a given string
 * and returns formatted phone number with country code.
 * The phone string might be in any format with or without 
 * a country code, but expecting a length of the digits 
 * inherent of the country
 *
 * @param {string} phone Phone string
 * @param {int} digits Length of the phone digits
 * @param {string} code Country code with a plus as a lead
 * @param {char|bool} missedDigitChar A char that would be inserted instead of missed digit
 * @returns {string}
 *
 * @see https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
 */
function parseMobilePhone(phone, digits=10, code='+38', missedDigitChar='0') {
    const codeEscaped = code.replace(/\D/g, '\x5C$&');
    const phoneEscaped = String(phone)
        // Remove country code
        .replace(new RegExp('^'+codeEscaped), '')

        // Remove all of "not digits"
        .replace(/\D/g, '')

        // Get last digits
        .slice(-digits)
    ;

    let telephone = `${ code }${ phoneEscaped }`;
    const missedDigits = code.length + digits - telephone.length;

    if (missedDigits>0 && missedDigitChar) {
        for (let n=0; n < missedDigits; n+=1) {
            telephone += `${ missedDigitChar }`;
            // telephone = `${ telephone }0`;
        }
    }

    return telephone;
}

function getDataFrom(obj, path='') {
    const pathChunks = path ?path.split('.') :[];
    let currentPath = obj;
    let currentKey;
    let data = null;

    try {
        while (currentKey = pathChunks.shift()) {
            if (! currentPath.hasOwnProperty(currentKey)) {
                // console.error('Key "%s" not found in object', currentKey);
                currentPath = false;
                break;
            }
            currentPath = currentPath[ currentKey ];
        }
        currentPath && (data = currentPath);

    } catch(err) {
        return null;
    }

    return data;
}

function textCapital(name, sep='-') {
    return name.split(sep).map(s => s[0].toUpperCase() + s.substr(1).toLowerCase()).join(sep);
}

function isEmpty(data) {
    for (const empty of [undefined, null, '']) {
        if (data === empty) return true;
    }

    if (typeof(data) == 'object') {
        return Array.isArray(data) 
            ? data.length < 1
            : Object.keys(data).length < 1
        ;
    }

    else if (Number.isNaN(data)) {
        return true;
    }

    return false;
}

function splitText(textData, limit, indent=0, subIndent=0) {
    const text = `${textData}`;
    if (!limit) {
        limit = process.stdout.columns;
    }

    let indentStr = ' '.repeat(indent);
    let indentLen = indentStr.length;
    let linesCount = Math.ceil((indentLen + text.length) / limit);
    const rows = [];

    if (linesCount > 0) {
        rows.push(indentStr + text.substr(0, limit));
    }

    if (linesCount > 1) {
        linesCount = Math.ceil((indentLen + (text.length-limit)) / limit);
        indentStr += ' '.repeat(subIndent);

        for (let n=1; n<=linesCount; n+=1) {
            rows.push(indentStr + text.substr(n*limit, limit));
        }
    }

    return rows.join('\n');
}

function tree(obj, indent=0, limit=86, callbacks={}) {
    if (!isObject(obj)) {
        return false;
    }

    const data = Object.keys(obj).map(key => {
        const subIndent = indent + key.length + 2;
        let indentStr = ' '.repeat(indent);
        let value = obj[key];

        value = isObject(value)
            // ? util.format('{\n%s\n%s}', tree(value, indent+2, limit, callbacks), indentStr)
            ? util.format('\n%s', tree(value, indent+2, limit, callbacks))
            : splitText(value, limit-subIndent, 0, subIndent)
        ;

        if (isFunction(callbacks)) {

            // Run callback for all items
            const data = callbacks(value, key);
            return indent == 0 ?data :indentStr+data;

        } else if (callbacks.hasOwnProperty(key)) {

            // Run callback by founded key
            const data = callbacks[key](value, key);
            return indent == 0 ?data :indentStr+data;

        } else {

            // Return data without callback usage
            return indent == 0 
                ? `${key}: ${value}`
                : `${indentStr}${key}: ${value}`
            ;

            // return indent == 0 
            //     ? util.format('%s: %s', key, value)
            //     : util.format('%s%s: %s', indentStr, key, value)
            // ;

        }
    });

    return data.join('\n');
}


module.exports = {
    assignObjects,
    cloneObject,
    getDataFrom,
    getMaskFrom,
    getMaskCardN16,
    getItemsExcept,
    getSessionID,
    isEmpty,
    isJSON,
    isFunction,
    isObject,
    parseMobilePhone,
    randomInt,
    randomNumbers,
    textCapital,
    splitText,
    tree,
};
