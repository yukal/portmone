/**
 * HtmlParser
 * 
 * @file
 * @ingroup Libraries
 * @version 1.0
 * @license MIT
 * @author Alexander Yukal <yukal@email.ua>
 */

class HtmlParser {
    constructor(html) {
        this.html = html;
    }

    getFormsData(target) {
        let data = this.html.substr(0);
        let matches;
        let formData;
        let position = 0;
        let start = -1;
        let end = -1;
        const forms = [];

        while (matches = /<(\/?form).*?>/im.exec(data)) {
            const [ tpl, tag ] = [ ...matches ];
            let { index, groups } = matches;

            let last = index + tpl.length;
            position += last;
            data = data.substr(last);

            if (tag == 'form') {
                const attributes = parseHTML(tpl, 'attributes');

                if (target && !isMatchedAttribute(attributes, target)) {
                    continue;
                }

                forms.push(attributes);
                formData = forms[ forms.length-1 ];
                formData.values = {};
                start = position;
            }

            else if (tag == '/form' && position>start && start>-1) {
                end = position - tpl.length;
                const html = this.html.substring(start, end);
                formData.values = getFormChildItems(html);

                start = -1;
                end = -1;
            }
        }

        return target ?forms.shift() :forms;
    }
}

function getFormChildItems(html) {
    let data = html.substr(0);
    let matches;
    const values = {};

    while (matches = /<\w+\s(?:[^>]*)name=(?:[^>]*)>/im.exec(data)) {
        let last = matches.index + matches[0].length;
        const { name, value } = parseHTML(matches[0], 'attributes');
        name && (values[ name ] = value || '');
        data = data.substr(last);
    }

    return values;
}

function isMatchedAttribute(attrs, target) {
    if (target.length) {
        let attributeName = 'name';
        const aliases = {
            '#': 'id',
            '.': 'class'
        };

        if (aliases.hasOwnProperty(target[0])) {
            attributeName = aliases[ target[0] ];
            target = target.substr(1);
        }

        if (attrs.hasOwnProperty(attributeName)) {
            return target == attrs[ attributeName ];
        }
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

module.exports = HtmlParser;
