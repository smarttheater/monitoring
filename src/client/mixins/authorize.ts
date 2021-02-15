import * as cinerino from '@cinerino/sdk';
import * as axios from 'axios';
import { IAppConfig } from '../store';

/**
 * 認証情報取得
 */
export async function getCredentials(appConfig: IAppConfig): Promise<{
    accessToken: string;
    expiryDate: number;
    clientId: string;
    endpoint: string;
}> {
    const res = await axios.default.post('/api/authorize/getCredentials', {}, {
        timeout: Number(appConfig.API_TIMEOUT),
    });
    return res.data;
}

/**
 * API設定
 */
export async function createOption(appConfig: IAppConfig) {
    const credentials = await getCredentials(appConfig);
    const option = {
        domain: '',
        clientId: credentials.clientId,
        redirectUri: '',
        logoutUri: '',
        responseType: '',
        scope: '',
        state: '',
        nonce: null,
        tokenIssuer: ''
    };
    const auth = cinerino.createAuthInstance(option);
    auth.setCredentials(credentials);
    return {
        endpoint: credentials.endpoint,
        auth,
        project: { id: appConfig.PROJECT_ID }
    };
}