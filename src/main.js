// iPad前提だったがIEでも利用される可能性が出てきたのでpolyfillを入れておく
import 'es6-promise/auto';
import 'mdn-polyfills/Array.prototype.findIndex';

import Vue from 'vue';
import Store from './store';
import Router from './router';

Vue.component('myHeader', require('./components/MyHeader.vue').default);
Vue.component('ErrorOneline', require('./components/ErrorOneline.vue').default);

// APPCONFIGをVuexで保存してから初期化
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
