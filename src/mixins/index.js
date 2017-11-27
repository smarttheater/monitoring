import * as axios from 'axios';

const APPCONFIG = require('../config').default;

// 現在時刻から次の更新時刻までのsetTimeout用msを得る
export function getNextTickUnixtime() {
    const now = new Date();
    const targetSec = (now.getSeconds() >= 30) ? 0 : 30;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), (targetSec > 0) ? now.getMinutes() : (now.getMinutes() + 1), targetSec, 0) - now;
}

// パフォーマンス情報を見てCSSクラス付与
export function getStatusClassNameByPerformance(momentObj, performance, STATUS_THRESHOLD_RED) {
    let className = '';
    const ymd = momentObj.format('YYYY-MM-DD');

    // 詳細パフォーマンス
    if (!performance.is_avg) {
        // 開場中ならcurrent
        if (momentObj.isBetween(`${ymd} ${performance.start_time}:00`, `${ymd} ${performance.end_time}:59`)) {
            className += 'item-current';
        }
        // 開場時間を過ぎてたらsoldout
        if (momentObj.isAfter(`${ymd} ${performance.end_time}:59`)) {
            return `${className} item-soldout`;
        }
    }

    // 残数で分岐
    const num = parseInt(performance.seat_status, 10) || 0;
    if (num <= STATUS_THRESHOLD_RED && num > 0) {
        return `${className} item-last`;
    } else if (num === 0) {
        return `${className} item-soldout`;
    }
    return `${className} item-capable`;
}

export function fetchScheduleStatus(YYYYMMDD) {
    const ymd = YYYYMMDD || this.$store.state.moment.format('YYYYMMDD');
    return new Promise((resolve, reject) => {
        axios.get(`${APPCONFIG.RSRVSTAT.API_ENDPOINT}?day=${ymd}`, {
            timeout: APPCONFIG.RSRVSTAT.API_TIMEOUT,
            auth: APPCONFIG.RSRVSTAT.API_BASICAUTH,
        }).then((res) => {
            this.$store.commit('UPDATE_MOMENTOBJ');
            let errorMsg = '';
            if (res.data.error) {
                errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [${res.data.error}]`;
            } else if (!res.data || !res.data.data || !Array.isArray(res.data.data)) {
                errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [取得データが異常です]`;
            } else if (!res.data.data[0]) {
                errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [スケジュールデータが見つかりませんでした]`;
            }
            if (errorMsg) {
                this.$store.commit('SET_ERRORMSG', errorMsg);
            } else {
                this.$store.commit('CLEAR_ERRORMSG');
            }
            return resolve(res.data.data);
        }).catch((err) => {
            this.$store.commit('UPDATE_MOMENTOBJ');
            this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [通信エラー][ステータス取得][${err.message}]`);
            return reject();
        });
    });
}
