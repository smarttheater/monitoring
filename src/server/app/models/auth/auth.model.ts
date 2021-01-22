import * as cinerino from '@cinerino/sdk';


/**
 * 認証モデル
 * @class AuthModel
 */
export class AuthModel {
    /**
     * 状態
     */
    public state: string;
    /**
     * スコープ
     */
    public scopes: string[];

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
    public create(): cinerino.auth.ClientCredentials {
        return new cinerino.auth.ClientCredentials({
            domain: (<string>process.env.CLIENT_CREDENTIALS_DOMAIN),
            clientId: (<string>process.env.CLIENT_CREDENTIALS_CLIENT_ID),
            clientSecret: (<string>process.env.CLIENT_CREDENTIALS_CLIENT_SECRET),
            state: this.state,
            scopes: this.scopes
        });
    }
}
