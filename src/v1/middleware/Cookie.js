/**
 * Cookie
 * 
 * @file
 * @ingroup Libraries
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

class Cookie {
    constructor(component) {
        Object.defineProperty(this, 'component', {
            value: component
        });
    }

    getItems(hostname, callback) {
        const items = {};

        if (hostname !== undefined) {
            if (this.hasOwnProperty(hostname)) {
                const entry = this[ hostname ];
                const data = Object.keys(entry).map(key => entry[key].value);

                return callback ?callback(data, hostname) :data;
            }
            return undefined;
        } else {
            for (const host in this) {
                const entry = this[ host ];
                const data = Object.keys(entry).map(key => entry[key].value);
                items[ host ] = callback ?callback(data, host) :data;
            }
        }

        return items;
    }

    getValues(hostname) {
        return this.getItems(hostname, data => data.join('; '));
    }

    update(cookieData, hostname) {
        // const hostname = host.replace(/^www\./i, '');
        if (hostname && Array.isArray(cookieData)) {
            const parsedCookie = Cookie.parse(cookieData);
            this[ hostname ] = this.hasOwnProperty(hostname)
                ? updateCookie(this[hostname], parsedCookie)
                : parsedCookie
            ;
        }

        else if (cookieData instanceof Cookie) {
            for (const item in cookieData) {
                this[item] = cookieData[item];
            }
        }

        else if (cookieData !== null && typeof cookieData == 'object') {
            Object.assign(this, cookieData);
        }
    }
}

Cookie.AS_STRING = 1;
Cookie.AS_OBJECT = 2;
Cookie.AS_ARRAY = 3;

Cookie.parse = function parseCookie(data, valuesOnly=Cookie.AS_OBJECT) {
    const cookiesCollection = typeof(data) == 'string' ?[ data ] :data;
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
        }
    }

    if (valuesOnly != Cookie.AS_OBJECT) {
        const items = [];

        for (const cookie in parsed) {
            items.push(parsed[cookie].value);
        }

        if (valuesOnly === Cookie.AS_STRING) {
            return items.join('; ');
        }

        // if (valuesOnly === Cookie.AS_ARRAY) {
        //     return items;
        // }

        return items;
    }

    return parsed;
}

function updateCookie(oldCookie, newCookie) {
    const cookie = Object.assign({}, oldCookie);

    for (const key in newCookie) {
        let canUpdate = false;

        if (!oldCookie.hasOwnProperty(key)) {
            canUpdate = true;
        } else if (oldCookie[key].hasOwnProperty('expires') && newCookie[key].hasOwnProperty('expires')) {
            if (oldCookie[key].expires < newCookie[key].expires) {
                canUpdate = true;
            }
        }

        if (canUpdate) {
            cookie[ key ] = newCookie[ key ];
        }
    }

    return cookie;
}

module.exports = Cookie;
