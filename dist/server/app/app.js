"use strict";
const bodyParser = require("body-parser");
const compression = require("compression");
const express = require("express");
const fs = require("fs");
const helmet = require("helmet");
const basic_auth_middleware_1 = require("./middlewares/basicAuth/basic-auth.middleware");
const benchmarks_middleware_1 = require("./middlewares/benchmarks/benchmarks.middleware");
const ip_filter_middleware_1 = require("./middlewares/ipFilter/ip-filter.middleware");
const router_1 = require("./routes/router");
process.env.VERSION = JSON.parse(fs.readFileSync(`${__dirname}/../../../package.json`, 'utf8')).version;
/**
 * express設定
 */
const app = express();
app.use(ip_filter_middleware_1.default); // IP制限
app.use(basic_auth_middleware_1.default); // ベーシック認証
app.use(helmet({ contentSecurityPolicy: false })); // セキュリティー対策
app.set('trust proxy', 1);
app.use(benchmarks_middleware_1.default); // ベンチマーク的な
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use(express.static(`${__dirname}/../../client`, { index: false }));
router_1.default(app);
module.exports = app;
