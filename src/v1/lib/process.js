function fail(res, error, stat=200) {
    const response = typeof(error)=='string' ?{ msg: error } :error||{};
    response.success = false;
    error && console.error(error);
    res.status(stat).json(response);
}

function done(res, data={}, stat=200) {
    const response = Object.assign({ success: true }, data);
    res.status(stat).json(response);
}

module.exports = {
    fail,
    done,
};
