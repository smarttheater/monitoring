import Vue from 'vue';
import Vuex from 'vuex';
// import createPersistedState from 'vuex-persistedstate';

Vue.use(Vuex);

export default new Vuex.Store({
    // plugins: [createPersistedState({ storage: window.sessionStorage })],

    modules: {
    },

    state: {
        // token: '',
        // lang: 'ja',
        loadingMsg: '',
    },

    mutations: {
        SET_LOADINGMSG(state, footermsg) {
            state.loadingMsg = footermsg;
        },

        CLEAR_LOADINGMSG(state) {
            state.loadingMsg = '';
        },
    },

    actions: {
        QUIT() {
            return new Promise(async (resolve) => {
                // ページごと初期化する
                // window.sessionStorage.removeItem('vuex');
                window.location.href = window.location.href.split('#')[0];
                resolve();
            });
        },
    },
});
