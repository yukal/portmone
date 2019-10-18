const apiver = 1;
const apiv = `v${apiver}`;
const devmode = process.env.mode=='dev';
const host = '0.0.0.0';
const port = devmode ?5000 :80;

const path = require('path');
const _paths = {
    controllers: path.join(__dirname, apiv, 'controllers'),
    routes: path.join(__dirname, apiv, 'routers'),
    views: path.join(__dirname, apiv, 'views'),
    static: path.join(__dirname, apiv, 'views/static'),
};

const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');
const controllers = require(_paths.controllers);
const apiRouter = require(_paths.routes)(express, controllers);

express()
    .use(express.static(_paths.static))
    .set('views', _paths.views)
    .set('view engine', 'ejs')

    .use(cors())
    .use(bodyParser.text())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))

    .get('/', (req, res) => res.render('pages/index'))

    .use(`/${apiv}`, apiRouter)
    .use((req, res, next) => {
        res.status(500).end();
    })

    .listen(port, host, err => {
        err? console.error(err) :console.log(`\nStart API on %s:%d\n`, host, port);
    })
;
