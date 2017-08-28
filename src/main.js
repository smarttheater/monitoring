import 'es6-promise/auto'; // 本来不要だがIEでも開かれる可能性を考慮

import Vue from 'vue';
import Store from './store';
import Router from './router';

Vue.component('myHeader', require('./components/MyHeader.vue').default);
Vue.component('ErrorOneline', require('./components/ErrorOneline.vue').default);

Vue.mixin({
    methods: {
        // PHPなどのsleepと同じ。UI表示調整用
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
    },
});

/* eslint-disable no-new */
new Vue({
    el: '#VueApp',
    router: Router,
    store: Store,
    render: h => h(require('./App.vue').default),
});
