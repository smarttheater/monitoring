import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as express from 'express';
import * as fs from 'fs';
import * as helmet from 'helmet';
import basicAuth from './middlewares/basicAuth/basic-auth.middleware';
import benchmarks from './middlewares/benchmarks/benchmarks.middleware';
import ipFilter from './middlewares/ipFilter/ip-filter.middleware';
import router from './routes/router';

process.env.VERSION = JSON.parse(fs.readFileSync(`${__dirname}/../../../package.json`, 'utf8')).version;

/**
 * express設定
 */
const app = express();

app.use(ipFilter); // IP制限
app.use(basicAuth); // ベーシック認証
app.use(helmet({ contentSecurityPolicy: false })); // セキュリティー対策
app.set('trust proxy', 1);
app.use(benchmarks); // ベンチマーク的な
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use(express.static(`${__dirname}/../../client`, { index: false }));
router(app);

export = app;
