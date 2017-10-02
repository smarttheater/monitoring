export default {
    VSTRSTAT: {
        API_ENDPOINT: 'https://ttts-authentication-d.azurewebsites.net/util/pass/list',
        API_TIMEOUT: 30000,
        API_BASICAUTH: {
            username: 'tower333',
            password: 'TTTS!2017',
        },
        UPDATEINTERVAL: 60000,
    },
    RSRVSTAT: {
        API_ENDPOINT: 'https://ttts-authentication-d.azurewebsites.net/util/performancestatus',
        API_TIMEOUT: 30000,
        API_BASICAUTH: {
            username: 'tower333',
            password: 'TTTS!2017',
        },
        STATUS_THRESHOLD: {
            RED: 9,
        },
        UPDATEINTERVAL: 60000,
    },
};
