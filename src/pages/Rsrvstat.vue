<template>
<div :class="['content', {'onerror': errorMsgStr}]">
    <myHeader>
        <div slot="headerMenu" class="statheadermenu">
            <div class="lastupdate"><span>{{ lastupdateStr }}</span><br>({{(APPCONFIG.UPDATEINTERVAL / 1000)}}秒毎に自動更新)</div>
            <div class="btn-update" @click="manualUpdate">更新</div>
        </div>
    </myHeader>

    <div class="timesettings">
        <select class="date" @change="changeDay">
            <option v-if="$route.query.day" :value="$route.query.day" selected>{{ $route.query.day }}</option>
            <option v-for="day in dayMomentArray" :key="day.unix()" :value="day.format('YYYYMMDD')">{{ day.format('YYYY-MM-DD (ddd)') }}</option>
        </select>
        <div v-if="isToday" class="time">
            <p class="clock"><span>{{ momentObj.format('HH:mm') }}</span></p>
            <div class="option"><label><input type="checkbox" v-model="bool_hidepasthours"> 過ぎた時間帯を隠す</label></div>
        </div>
    </div>

    <errorOneline v-if="errorMsgStr" :errorMsgStr="`データ取得エラーが発生しています ${errorMsgStr}`"></errorOneline>

    <transition name="fadeup" appear>
    <main v-if="hourArray[0]" :key="`${selectedDay}hours`">
        <div v-for="hour in hourArray" :key="`${selectedDay}${hour}`"
            :class="['hour',
                {
                    'hour-active': (isToday && momentObj.format('HH') === hour),
                    'hour-hidden': (bool_hidepasthours && momentObj.isAfter(moment(`${selectedDay} ${parseInt(hour, 10)}:59:59`, 'YYYYMMDD H:mm:ss'))),
                }
            ]">
            <div class="items">
                <div v-for="performance in performancesByHour[hour]" :key="`${performance.day}${performance.start_time}`"
                    :class="['item', getStatusClassNameByPerformance(performance)]">
                    <p class="time">{{ performance.start_time }}～</p>
                    <div class="wrapper-status">
                        <p class="status">{{ performance.seat_status }}</p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    </transition>
</div>
</template>


<script>
import * as axios from 'axios';
import * as moment from 'moment';
import 'twix';

const APPCONFIG = require('../config').default.RSRVSTAT;

export default {
    data() {
        return {
            APPCONFIG,
            errorMsgStr: '',
            lastupdateStr: '未取得',
            moment,
            momentObj: moment(),
            dayMomentArray: [],
            selectedDay: this.$route.query.day || moment().format('YYYYMMDD'),
            hourArray: [],
            performancesByHour: {},
            timeoutInstance_IntervalFetch: null,
            bool_hidepasthours: true,
        };
    },
    computed: {
        isToday() {
            return (this.momentObj.format('YYYYMMDD') === this.selectedDay);
        },
    },
    created() {
        this.createDaySelect();
        this.manualUpdate();
    },
    methods: {
        // 日付選択肢を用意(7日先まで)
        createDaySelect() {
            const itr = moment.twix(moment(), moment().add(7, 'days')).iterate('days');
            const range = [];
            while (itr.hasNext()) {
                range.push(itr.next());
            }
            this.dayMomentArray = range;
        },
        changeDay(e) {
            this.selectedDay = e.target.value;
            this.manualUpdate();
        },
        // 個別にパフォーマンス情報を見てCSSクラス付与
        getStatusClassNameByPerformance(performance) {
            let className = '';
            const ymd = moment(this.selectedDay, 'YYYYMMDD').format('YYYY-MM-DD');
            // 開場中ならcurrent
            if (this.momentObj.isBetween(`${ymd} ${performance.start_time}:00`, `${ymd} ${performance.end_time}:59`)) {
                className += 'item-current';
            }
            // 開場時間を過ぎてたらsoldout
            if (this.momentObj.isAfter(`${ymd} ${performance.end_time}:59`)) {
                return `${className} item-soldout`;
            }
            // 残数で分岐
            const num = parseInt(performance.seat_status, 10) || 0;
            if (num <= APPCONFIG.STATUS_THRESHOLD.RED && num > 0) {
                return `${className} item-last`;
            } else if (num === 0) {
                return `${className} item-soldout`;
            }
            return `${className} item-capable`;
        },
        updateStatus(performanceArray) {
            // 1hごとにまとめる (start_timeの最初2文字を時間とする)
            const hourArray = [];
            const performancesByHour = {};
            performanceArray.forEach((performance) => {
                try {
                    const hour = performance.start_time.slice(0, 2);
                    if (!performancesByHour[hour]) {
                        hourArray.push(hour);
                        performancesByHour[hour] = [];
                    }
                    performancesByHour[hour].push({
                        id: performance.id,
                        start_time: moment(performance.start_time, 'hmm').format('HH:mm'),
                        end_time: moment(performance.end_time, 'hmm').format('HH:mm'),
                        seat_status: performance.seat_status,
                    });
                } catch (e) {
                    console.log(e);
                    return true;
                }
                return true;
            });

            // 時間割を念のためソート
            hourArray.sort((a, b) => {
                if (a < b) { return -1; }
                if (a > b) { return 1; }
                return 0;
            });

            // 時間割内のパフォーマンスを念のためソート
            hourArray.forEach((hour) => {
                performancesByHour[hour].sort((a, b) => {
                    if (a.start_time < b.start_time) { return -1; }
                    if (a.start_time === b.start_time) { return 0; }
                    return 1;
                });
            });

            this.hourArray = hourArray;
            this.performancesByHour = performancesByHour;
        },
        fetchData() {
            return new Promise((resolve) => {
                // 通信エラーが起きても画面は白紙にせず維持する
                axios.get(`${APPCONFIG.API_ENDPOINT}?day=${this.selectedDay}`, {
                    timeout: APPCONFIG.API_TIMEOUT,
                }).then((res) => {
                    this.momentObj = moment();
                    if (res.data.error) {
                        this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [${res.data.error}]`;
                        return false;
                    }
                    if (!res.data || !res.data.data || !Array.isArray(res.data.data)) {
                        this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [取得データが異常です]`;
                        return false;
                    }
                    if (!res.data.data[0]) {
                        this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [スケジュールデータが見つかりませんでした]`;
                        return false;
                    }
                    this.updateStatus(res.data.data);
                    this.lastupdateStr = `${this.momentObj.format('HH:mm:ss')}時点データ表示中`;
                    this.errorMsgStr = '';
                    return true;
                }).catch((err) => {
                    this.momentObj = moment();
                    this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [通信エラー][${err.message}]`;
                }).then(() => {
                    resolve();
                });
            });
        },
        setFetchDataInterval() {
            this.timeoutInstance_IntervalFetch = setTimeout(() => {
                this.fetchData().then(() => {
                    this.setFetchDataInterval(APPCONFIG.UPDATEINTERVAL);
                });
            }, APPCONFIG.UPDATEINTERVAL);
        },
        manualUpdate() {
            if (this.$store.state.loadingMsg) { return false; }
            this.$store.commit('SET_LOADINGMSG', '予約状況を取得中...');
            clearTimeout(this.timeoutInstance_IntervalFetch);
            return this.fetchData().catch((err) => {
                console.log(err);
            }).then(() => {
                this.$store.commit('CLEAR_LOADINGMSG');
                this.setFetchDataInterval();
            });
        },
    },
};
</script>

<style lang="scss" scoped>
    .content {
        padding-top: 140px;
        &.onerror {
            padding-top: 200px;
        }
    }
    .error-oneline {
        position: fixed;
        width: 100%;
        top: 60px;
    }
    .timesettings {
        max-width: 960px;
        width: 100%;
        height: 72px;
        padding-top: 12px;
        margin: auto;
        position: fixed;
        top: 60px;
        left: 0;
        right: 0;
        background-color: rgba(255,255,255,0.9);
        .date {
            display: inline-block;
            vertical-align: middle;
            font-size: 32px;
            border-radius: 6px;
            cursor: pointer;
        }
        .time {
            display: inline-block;
        }
        .clock {
            font-size: 48px;
            vertical-align: middle;
            line-height: 1;
        }
        .option {
            display: inline-block;
            vertical-align: middle;
            label {
                cursor: pointer;
            }
            input[type=checkbox] {
                cursor: pointer;
                width: 24px;
                height: 24px;
                vertical-align: middle;
            }
        }
    }
    .onerror .timesettings{
        top: 120px;
    }
    main {
        max-width: 960px;
        margin: auto;
    }
    .hour {
        background-color: #eee;
        margin-bottom: 10px;
        border-radius: 5px;
        &.hour-active {
            background-color: #d3eaf2;
        }
        &.hour-hidden {
            display: none;
        }
    }   
    .items {
        display: table;
        width: 100%;
        padding: 5px 10px;
        p {
            margin: 0;
        }
        .item {
            display: table-cell;
            text-align: center;
            font-weight: bold;
            padding: 10px 5px;
            .time {
                font-size: 20px;
                padding: 5px;
                color: #fff;
                background-color: #5290cd;
                border-radius: 5px 5px 0 0;
            }
            .wrapper-status {
                background-color: #fff;
                padding: 10px;
                border-radius: 0 0 5px 5px;
                color: #5290cd;
            }
            .status {
                font-size: 36px;
            }
        }
        .item-last {
            .time {
                background-color: #c00;
            }
            .wrapper-status {
                color: #c00;
            }
        }
        .item-soldout {
            .time {
                background-color: #bcbcbc;
            }
            .wrapper-status {
                background-color: #bcbcbc;
                color: #fff;
            }
        }
        .item-current {
            animation: bgColor 4s infinite;
        }
        @keyframes bgColor {
            0% { background-color: #e74c3c; }
            20% { background-color: #f1c40f; }
            40% { background-color: #1abc9c; }
            60% { background-color: #3498db; }
            80% { background-color: #9b59b6; }
            100% { background-color: #e74c3c; }
        }
    }
</style>
