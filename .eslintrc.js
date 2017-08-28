// http://eslint.org/docs/user-guide/configuring

module.exports = {
    root: true,
    parser: 'babel-eslint',
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2017,
    },
    env: {
        browser: true,
    },
    extends: 'airbnb-base',
    // required to lint *.vue files
    plugins: [
        'html',
    ],
    // add your custom rules here
    rules: {
        // don't require .vue extension when importing
        'import/extensions': ['error', 'always', {
            js: 'never',
            vue: 'never',
        }],
        // allow optionalDependencies
        'import/no-extraneous-dependencies': ['error', {
            optionalDependencies: ['test/unit/index.js'],
        }],
        // allow debugger during development
        'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
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
        location: true,
        history: true,
        $: true,
        Vue: true,
        alert: true,
        confirm: true,
        FileReader: true,
        sessionStorage: true,
    },
};
