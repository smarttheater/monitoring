"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_1 = require("http-status");
const path = require("path");
const authorize_1 = require("./api/authorize");
const util_1 = require("./api/util");
exports.default = (app) => {
    app.get([
        '/static/config/prd.php',
        '/static/config/dev.json'
    ], (_req, res, _next) => {
        res.redirect('/api/config');
    });
    app.use((req, res, next) => {
        if ((/\.(css|js|svg|jpg|png|gif|ico|json|html|txt)/).test(req.path)) {
            res.status(404);
            res.end();
            return;
        }
        next();
    });
    app.use('/api/authorize', authorize_1.authorizeRouter);
    app.use('/api', util_1.utilRouter);
    app.get('*', (req, res, next) => {
        if (req.xhr || req.header('Sec-Fetch-Mode') === 'cors') {
            next();
            return;
        }
        res.sendFile(path.resolve(`${__dirname}/../../../client/index.html`));
    });
    app.all('*', (req, res, _next) => {
        res.status(http_status_1.NOT_FOUND);
        if (req.xhr || req.header('Sec-Fetch-Mode') === 'cors') {
            res.json('NOT FOUND');
            return;
        }
    });
};
