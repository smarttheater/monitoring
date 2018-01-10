export default {
    API_STATUS_ENDPOINT: 'https://ttts-api-test.azurewebsites.net/preview/performancesWithAggregation',
    API_TIMEOUT: 30000,
    API_BASICAUTH: {
        username: 'tower333',
        password: 'TTTS!2017',
    },
    VSTRSTAT: {
        API_CHECKPOINTDIFINITION_ENDPOINT: 'https://ttts-api-test.azurewebsites.net/preview/places/checkinGate',
        CONCERNED_CATEGORYCODE_ARRAY: [ // 一般と分けて表示するカテゴリー
            'Wheelchair',
        ],
        CHECKPOINT_WHERE_ARRAY: [ // APIレスポンスの checkinCountsByWhere から拾う対象
            'TOPDECK_AUTH',
            'DAITEN_AUTH',
        ],
        UPDATEINTERVAL: 60000,
    },
    RSRVSTAT: {
        API_ENDPOINT: 'https://ttts-api-test.azurewebsites.net/preview/performancesWithAggregation',
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
