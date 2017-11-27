import Vue from 'vue';
import Vuex from 'vuex';
// import createPersistedState from 'vuex-persistedstate';
import * as moment from 'moment';

Vue.use(Vuex);


export default new Vuex.Store({
    strict: process.env.NODE_ENV !== 'production',

    // plugins: [createPersistedState({ storage: window.sessionStorage })],

    modules: {
    },

    state: {
        moment: moment(),
        // token: '',
        // lang: 'ja',
        errorMsgStr: '',
        loadingMsg: '',
        scheduleStatus: [],
    },

    mutations: {
        SET_ERRORMSG(state, errorMsgStr) {
            state.errorMsgStr = errorMsgStr;
        },

        CLEAR_ERRORMSG(state) {
            state.errorMsgStr = '';
        },

        SET_LOADINGMSG(state, footermsg) {
            state.loadingMsg = footermsg;
        },

        CLEAR_LOADINGMSG(state) {
            state.loadingMsg = '';
        },

        SET_SCHEDULESTATUS(state, scheduleStatus) {
            state.scheduleStatus = scheduleStatus;
        },

        UPDATE_MOMENTOBJ(state) {
            state.moment = moment();
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
