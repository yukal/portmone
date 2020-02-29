const Fs = require('fs');
const Path = require('path');
const Https = require('https');

const API_VER = 'v1';
const API_HOST = '0.0.0.0';
const API_PORT = process.env.mode=='dev' ?5000 :80;

const paths = {
    controllers: Path.join(__dirname, API_VER, 'controllers'),
    routes: Path.join(__dirname, API_VER, 'routers'),
    views: Path.join(__dirname, API_VER, 'views'),
    static: Path.join(__dirname, API_VER, 'views/static'),
};

const credentials = {
    key: Fs.readFileSync('./data/localhost-pkey.pem', 'utf8'),
    cert: Fs.readFileSync('./data/localhost-cert.pem', 'utf8')
};

const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');
const controllers = require(paths.controllers);
const expressRoutes = require(paths.routes)(express, controllers);
const expressApplication = express();

expressApplication
    .use(express.static(paths.static))
    .set('views', paths.views)
    .set('view engine', 'ejs')

    .use(cors())
    .use(bodyParser.text())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))

    .get('/', (req, res) => res.render('pages/index'))

    .use(`/${API_VER}`, expressRoutes)
    .use((req, res, next) => {
        res.status(404).end();
    })
;

const httpsServer = Https.createServer(credentials, expressApplication);
httpsServer.listen(API_PORT, API_HOST, err => {
    err? console.error(err) :console.log(`\nStart API on %s:%d\n`, API_HOST, API_PORT);
});
