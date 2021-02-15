// iPad前提だったがIEでも利用される可能性が出てきたのでpolyfillを入れておく
import 'es6-promise/auto';
import 'mdn-polyfills/Array.prototype.findIndex';

import Vue from 'vue';
import Store, { IAppConfig } from './store';
import Router from './router';

// Vue.component('ErrorOneline', require('./components/ErrorOneline.vue').default);
Vue.component('Clock', require('./components/Clock.vue').default);

Vue.component('myHeader', require('./components/MyHeader.vue').default);
Vue.component('ErrorOneline', require('./components/ErrorOneline.vue').default);

// APPCONFIGをVuexで保存してから初期化
Store.dispatch('FETCH_APPCONFIG').then((APPCONFIG: IAppConfig) => {
    console.log('APPCONFIG', APPCONFIG);
    /* eslint-disable no-new */
    new Vue({
        el: '#VueApp',
        router: Router,
        store: Store,
        render: h => h(require('./App.vue').default),
        created: () => { }
    });
}).catch(() => {
    return alert('CONFIG LOAD ERROR');
});
