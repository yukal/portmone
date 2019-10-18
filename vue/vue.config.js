const path = require('path');

module.exports = {
    devServer: {
        contentBase: path.join(__dirname, 'public'),
        compress: true,
        disableHostCheck: true,
        port: 5001,
        host: '0.0.0.0',
        index: 'index.html',
        noInfo: true,
        overlay: true,
        quiet: false,
        useLocalIp: true,
        // writeToDisk: true,
        // http2: true,
        // lazy: true,

        proxy: {
            '/v1': {
                // pathRewrite: { '^/api': '/api/v1' },
                target: 'http://localhost:5000',
                secure: false,
                changeOrigin: true,
            }
        },
        // headers: { "Access-Control-Allow-Origin": "*" },
        // bonjour: true,
        allowedHosts: [
            '0.0.0.0',
            '127.0.0.1',
            'localhost',
        ]
    },
};
