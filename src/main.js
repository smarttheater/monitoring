import 'es6-promise/auto'; // 本来不要だがIEでも開かれる可能性を考慮

import Vue from 'vue';
import Store from './store';
import Router from './router';

Vue.component('myHeader', require('./components/MyHeader.vue').default);
Vue.component('ErrorOneline', require('./components/ErrorOneline.vue').default);

Store.dispatch('FETCH_APPCONFIG').then((APPCONFIG) => {
    console.log('APPCONFIG', APPCONFIG);
    /* eslint-disable no-new */
    new Vue({
        el: '#VueApp',
        router: Router,
        store: Store,
        render: h => h(require('./App.vue').default),
    });
}).catch(() => {
    return alert('CONFIG LOAD ERROR');
});
