class HtmlParser {
    constructor(html) {
        this.html = html;
        // Object.defineProperty(this, '_html', { value: html });
    }

    querySelector(query, collection=[]) {
        const { mask, masks } = buildQSMasks(query);
        const reqex = new RegExp(mask, 'ig');
        let data = this.html.substr(0);
        let matches;
        // let index = 0;

        while (matches = reqex.exec(data)) {
            const [ html ] = matches;
            let matchesResult = true;
            let last = matches.index + html.length;

            // index += last;
            data = data.substr(last);

            for (const submask of masks) {
                const subRegex = new RegExp(submask, 'ig');
                matchesResult = matchesResult && subRegex.test(data);
            }

            if (matchesResult) {
                return parseHTML(html, collection);
            }
        }

        return undefined;
    }

    getFormsData(target) {
        let data = this.html.substr(0);
        // let index = 0;
        let matches;
        let formData;
        const forms = [];

        while(matches = /<input.*?>|<\/?(form).*?>/ig.exec(data)) {
            const [ html, form ] = matches;
            let last = matches.index + html.length;
            data = data.substr(last);
            // index += last;

            if (form) {
                const attributes = parseHTML(html, 'attributes');

                if (Object.keys(attributes).length) {
                    if (target && !isMatchedAttribute(attributes, target)) {
                        continue;
                    }

                    forms.push(attributes);
                    formData = forms[ forms.length-1 ];
                    formData.values = {};
                }
            } else if (formData) {
                const attributes = parseHTML(html, 'attributes');

                if (attributes.hasOwnProperty('name') && attributes.hasOwnProperty('value')) {
                    const { name, value } = attributes;
                    name && (formData.values[ name ] = value);
                }
            }
        }

        return target ?forms.shift() :forms;
    }
}

function buildQSMasks(query) {
    let mask = '';
    let masks = [];
    let matches;

    if (matches = /(\w+)(?:\[([\S=]+)\])?/i.exec(query)) {
        let [ html, tag, params ] = matches;
        masks = params.split("][").map(item => {
            const paramsChunks = item.split("=");
            if (paramsChunks.length == 2) {
                paramsChunks[1] = paramsChunks[1].replace(/^['"]/, '').replace(/["']$/, '');
                return `(?:${paramsChunks[0]}=["']?${paramsChunks[1]}['"]?)`;
            }
            return paramsChunks[0];
        });

        mask = `<${tag}.*${masks.shift()}.*>`;
    }

    return { mask, masks };
}

function isMatchedAttribute(attrs, target) {
    if (target) {
        let attrName = '';

        if (target[0] == '#') {
            attrName = 'id';
        }

        if (target[0] == '.') {
            attrName = 'class';
        }

        return attrs.hasOwnProperty(attrName) && target.substr(1) == attrs[attrName];
    }

    return false;
}

function parseHTML(html, collection=[]) {
    const copy = html.substr(0);
    let obj = {};
    let data = {};
    let matches;

    if (matches = /<(\w+)([^>]*)>/.exec(copy.replace(/\s+/g, ' ').replace(/\s?\/>/, '>'))) {
        const [ , tag, params ] = matches;
        obj.html = html;
        obj.tag = tag;
        obj.attributes = parseAttributes(params);

        if (Array.isArray(collection) && collection.length) {
            collection.map(attr => {
                if (obj.hasOwnProperty(attr)) {
                    data[ attr ] = obj[ attr ];
                }
            });
        }

        else if (typeof(collection) == 'string' && collection.length) {
            if (obj.hasOwnProperty(collection)) {
                data = obj[ collection ];
            }
            else if (obj.attributes.hasOwnProperty(collection)) {
                data = obj.attributes[ collection ];
            }
        }

        else {
            data = obj;
        }
    }

    return data;
}

function parseAttributes(attributes) {
    // const re = /([\w]+)=["']([^\s]+)/im;
    const re = /([\w]+)=["']([^'"]+)['"]/im;
    const obj = {};
    let text = attributes.slice().replace(/\s+/img, ' '), 
        html = '',
        last = 0,
        res
    ;

    while (res = re.exec(text.substr(last))) {
        text = res.input;
        last = res.index + res[0].length;
        const [html, tag, type] = Array.prototype.slice.call(res);

        if (tag && type) {
            obj[ tag ] = toType(type);
        }
    }

    return obj;
}

function toType(type) {
    if (type === 'true') {
        return true;
    }

    if (type === 'false') {
        return false;
    }

    if (/^[\d-]+$/.test(type)) {
        return Number.parseInt(type, 10);
    }

    return type;
}

// function HtmlParser(html) {
//     if (!(this instanceof HtmlParser)) {
//         return new HtmlParser(html);
//     }

//     this.html = html;
//     Object.defineProperty(this, 'original_html', { value: html });
// };

module.exports = HtmlParser;
