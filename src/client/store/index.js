import Vue from 'vue';
import Vuex from 'vuex';
// import createPersistedState from 'vuex-persistedstate';
import * as axios from 'axios';
import * as moment from 'moment';

Vue.use(Vuex);

const isProduction = (process.env.NODE_ENV === 'production');

export default new Vuex.Store({
    strict: !isProduction,

    // plugins: [createPersistedState({ storage: window.sessionStorage })],

    modules: {
    },

    state: {
        moment: moment(),
        APPCONFIG: {},
        // token: '',
        // lang: 'ja',
        errorMsgStr: '',
        loadingMsg: '',
        scheduleStatus: [],
    },

    mutations: {
        SET_APPCONFIG(state, config) {
            state.APPCONFIG = config;
        },

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
        FETCH_APPCONFIG({ commit }) {
            return new Promise(async (resolve, reject) => {
                const url = '/api/config';
                axios.get(url).then((res) => {
                    if (typeof res.data !== 'object' || Object.keys(res.data).some((key) => { return (!res.data[key] || !res.data[key][0]); })) {
                        return reject();
                    }
                    commit('SET_APPCONFIG', (res.data));
                    return resolve(res.data);
                }).catch((e) => {
                    console.error(e);
                    return reject();
                });
            });
        },

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
