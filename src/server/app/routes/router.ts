/**
 * ルーティング
 */
import * as express from 'express';
import { NOT_FOUND } from 'http-status';
import * as path from 'path';
import { authorizeRouter } from './api/authorize';
import { utilRouter } from './api/util';

export default (app: express.Application) => {
    app.get([
        '/static/config/prd.php',
        '/static/config/dev.json'
    ],(_req, res, _next) => {
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

    app.use('/api/authorize', authorizeRouter);
    app.use('/api', utilRouter);

    app.get('*', (req, res, next) => {
        if (req.xhr || req.header('Sec-Fetch-Mode') === 'cors') {
            next();
            return;
        }
        res.sendFile(path.resolve(`${__dirname}/../../../client/index.html`));
    });

    app.all('*', (req, res, _next) => {
        res.status(NOT_FOUND);
        if (req.xhr || req.header('Sec-Fetch-Mode') === 'cors') {
            res.json('NOT FOUND');
            return;
        }
    });
};
