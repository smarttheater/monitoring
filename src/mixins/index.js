import * as axios from 'axios';

const APPCONFIG = require('../config').default;

// 現在時刻から次の更新時刻までのsetTimeout用msを得る
export function getNextTickUnixtime() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), (now.getMinutes() + 1), 0, 0) - now;
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
    if (performance.online_sales_status !== 'Normal') {
        return 'item-supenpeded'; // 「-」
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

export function fetchScheduleStatus(params) {
    return new Promise((resolve, reject) => {
        axios.get(APPCONFIG.API_STATUS_ENDPOINT, {
            params,
            timeout: APPCONFIG.API_TIMEOUT,
            auth: APPCONFIG.API_BASICAUTH,
        }).then((res) => {
            this.$store.commit('UPDATE_MOMENTOBJ');
            let errorMsg = '';
            if (!Array.isArray(res.data)) {
                errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [取得データが異常です]`;
            } else if (!res.data[0]) {
                errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [スケジュールデータが見つかりませんでした]`;
            }
            if (errorMsg) {
                this.$store.commit('SET_ERRORMSG', errorMsg);
            } else {
                this.$store.commit('CLEAR_ERRORMSG');
            }
            return resolve(res.data.sort((a, b) => {
                if (a.startDate < b.startDate) { return -1; }
                if (a.startDate > b.startDate) { return 1; }
                return 0;
            }));
        }).catch((err) => {
            console.log(err);
            this.$store.commit('UPDATE_MOMENTOBJ');
            this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [通信エラー][ステータス取得][${err.message}]`);
            return reject();
        });
    });
}
