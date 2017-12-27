export default {
    API_STATUS_ENDPOINT: 'https://ttts-api-development.azurewebsites.net/preview/performancesWithAggregation',
    API_TIMEOUT: 30000,
    API_BASICAUTH: {
        username: 'tower333',
        password: 'TTTS!2017',
    },
    VSTRSTAT: {
        API_CHECKPOINTDIFINITION_ENDPOINT: 'https://ttts-api-development.azurewebsites.net/preview/places/checkinGate',
        CONCERNED_CATEGORYCODE_ARRAY: [
            'Wheelchair',
        ],
        UPDATEINTERVAL: 60000,
    },
    RSRVSTAT: {
        API_ENDPOINT: 'https://ttts-api-development.azurewebsites.net/preview/performancesWithAggregation',
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
