import Vue from 'vue';
import VueRouter from 'vue-router';
import Store from '../store';

Vue.use(VueRouter);

const Router = new VueRouter({
    routes: [
        {
            name: 'home',
            path: '/',
            // component: resolve => require(['../pages/Home'], resolve),
            component: require('../pages/Home.vue').default,
            meta: {
                title: '東京タワー業務用画面',
            },
        },
        {
            name: 'rsrvstat',
            path: '/rsrvstat',
            // component: resolve => require(['../pages/Rsrvstat'], resolve),
            component: require('../pages/Rsrvstat.vue').default,
            meta: {
                title: '東京タワー予約状況',
            },
        },
        {
            name: 'vstrstat',
            path: '/vstrstat',
            // component: resolve => require(['../pages/Vstrstat'], resolve),
            component: require('../pages/Vstrstat.vue').default,
            meta: {
                title: '東京タワー来塔状況',
            },
        },
    ],
});

Router.beforeEach((to, _from, next) => {
    // ページVueを遅延ロードにした場合はローディング出した方がよい？
    // Store.commit('SET_LOADINGMSG', 'Loading...');
    window.document.title = to.meta.title;
    return next();
});
Router.afterEach(() => {
    // ページ出たらローディングは消す
    Store.commit('CLEAR_LOADINGMSG');
});
export default Router;
