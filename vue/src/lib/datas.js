export function isObject(data) {
    return data !== null && typeof data == 'object';
}

export default {
    isObject,
    validResponse,
};
