"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModel = void 0;
const cinerino = require("@cinerino/sdk");
/**
 * 認証モデル
 * @class AuthModel
 */
class AuthModel {
    /**
     * @constructor
     * @param {any} session
     */
    constructor() {
        this.state = 'STATE';
        this.scopes = [];
    }
    /**
     * 認証クラス作成
     * @memberof AuthModel
     * @method create
     * @returns {cinerino.auth.ClientCredentials}
     */
    create() {
        return new cinerino.auth.ClientCredentials({
            domain: process.env.CLIENT_CREDENTIALS_DOMAIN,
            clientId: process.env.CLIENT_CREDENTIALS_CLIENT_ID,
            clientSecret: process.env.CLIENT_CREDENTIALS_CLIENT_SECRET,
            state: this.state,
            scopes: this.scopes
        });
    }
}
exports.AuthModel = AuthModel;
