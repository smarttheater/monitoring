// https://eslint.org/docs/user-guide/configuring

module.exports = {
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module',
        ecmaVersion: 2017,
    },
    env: {
        browser: true,
    },
    extends: [
        'airbnb-base',
        // 'plugin:vue/essential'
    ],
    // required to lint *.vue files
    plugins: [
        'html'
    ],
    // check if imports actually resolve
    settings: {
        'import/resolver': {
            webpack: {
                config: 'build/webpack.base.conf.js'
            }
        }
    },
    // add your custom rules here
    rules: {
        // don't require .vue extension when importing
        'import/extensions': ['error', 'always', {
            js: 'never',
            vue: 'never'
        }],
        // disallow reassignment of function parameters
        // disallow parameter object manipulation except for specific exclusions
        'no-param-reassign': ['error', {
            props: true,
            ignorePropertyModificationsFor: [
                'state', // for vuex state
                'acc', // for reduce accumulators
                'e' // for e.returnvalue
            ]
        }],
        // allow optionalDependencies
        'import/no-extraneous-dependencies': ['error', {
            optionalDependencies: ['test/unit/index.js']
        }],
        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        indent: ['error', 4],
        camelcase: 0,
        'no-alert': 0,
        'no-console': 0,
        'linebreak-style': [0, 'windows'],
        'no-underscore-dangle': 0,
        'no-param-reassign': 0,
        'max-len': 0,
        'no-plusplus': 0,
        'arrow-body-style': 0,
        'global-require': 0,
        'import/no-dynamic-require': 0,
    },
    globals: {
        window: true,
        document: true,
        alert: true,
        confirm: true,
    }
}
