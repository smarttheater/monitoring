<template>
<div :class="['content', {'onerror': $store.state.errorMsgStr}]">
    <myHeader>
        <div slot="headerMenu" class="statheadermenu">
            <div class="lastupdate"><span>{{ lastupdateStr }}</span><br>({{(60000 / 1000)}}秒毎に自動更新)</div>
            <div class="btn-update" @click="manualUpdate">更新</div>
        </div>
    </myHeader>

    <div class="timesettings">
        <select class="date" @change="changeDay">
            <option v-if="$route.query.day" :value="$route.query.day" selected>{{ moment($route.query.day).format('YYYY-MM-DD (ddd)') }}</option>
            <option v-for="day in dayMomentArray" :key="day.unix()" :value="day.format('YYYYMMDD')">{{ day.format('YYYY-MM-DD (ddd)') }}</option>
        </select>
        <div v-if="isToday" class="time">
            <clock></clock>
            <div class="option"><label><input type="checkbox" v-model="bool_hidepasthours"> 過ぎた時間帯を隠す</label></div>
        </div>
    </div>

    <errorOneline v-if="$store.state.errorMsgStr" :errorMsgStr="`データ取得エラーが発生しています ${$store.state.errorMsgStr}`"></errorOneline>

    <transition name="fadeup" appear>
        <main v-if="hourArray[0]" :key="`${selectedDay}hours`">
            <div v-for="hour in hourArray" :key="`${selectedDay}${hour}`"
                :class="['hour',
                    {
                        'hour-active': (isToday && $store.state.moment.format('HH') === hour),
                        'hour-hidden': (isToday && bool_hidepasthours && $store.state.moment.isAfter(moment(`${selectedDay} ${parseInt(hour, 10)}:59:59`, 'YYYYMMDD H:mm:ss'))),
                    }
                ]">
                <div class="items">
                    <div v-for="performance in performancesByHour[hour]" :key="`${performance.day}${performance.start_time}`"
                        :class="['item', (isToday) ? getStatusClassNameByPerformance($store.state.moment, performance, 10) : 'item-capable']">
                        <p class="time">{{ performance.start_time }}～ ({{ performance.tour_number }})</p>
                        <div class="wrapper-status">
                            <p class="status-inner">
                                <span class="status status-normal">{{ performance.seat_status }}</span>
                                <span class="status status-wheelchair">{{ performance.wheelchair_available }}</span>
                            </p>
                            <p class="exstatus">
                                <span class="exstatus-sales_textstatus">{{ performance.sales_textstatus }}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </transition>
</div>
</template>


<script>
/*
  在庫状況確認用画面
  ・現場のPOS横などに配置したタブレットから参照するのがメインだがStaffページからもリンクしてくる
*/
import * as moment from 'moment';
import 'twix';
import { getNextTickUnixtime, getStatusClassNameByPerformance, fetchScheduleStatus } from '../mixins/';

export default {
    components: {
        Clock: require('../components/Clock.vue').default,
    },
    data() {
        return {
            lastupdateStr: '未取得',
            moment,
            dayMomentArray: [],
            selectedDay: this.$route.query.day || moment().format('YYYYMMDD'),
            hourArray: [],
            performancesByHour: {},
            timeoutInstance_IntervalFetch: null,
            bool_hidepasthours: true,
        };
    },
    computed: {
        dayparam() {
            return this.$route.query.day;
        },
        isToday() {
            return (this.selectedDay === this.$store.state.moment.format('YYYYMMDD'));
        },
    },
    created() {
        this.createDaySelect();
        this.manualUpdate();
    },
    beforeDestroy() {
        clearTimeout(this.timeoutInstance_IntervalFetch);
    },
    methods: {
        fetchScheduleStatus,
        getStatusClassNameByPerformance,
        // 日付選択肢を用意(7日先まで)
        createDaySelect() {
            this.dayMomentArray = moment.twix(moment(), moment().add(7, 'days')).toArray('days');
        },
        changeDay(e) {
            this.selectedDay = e.target.value;
            this.manualUpdate();
        },
        // APIが返してくるJSONを実際に使える形に整形する
        manipulateScheduleData(scheduleArray) {
            return scheduleArray.map((schedule) => {
                let sales_textstatus = 'オンライン販売中';
                if (schedule.onlineSalesStatus === 'Suspended') {
                    sales_textstatus = (schedule.evServiceStatus === 'Slowdown') ? 'オンライン販売休止' : 'オンライン販売中止';
                }
                return {
                    id: schedule.id,
                    hour: moment(schedule.startDate).format('HH'),
                    start_time: moment(schedule.startDate).format('HH:mm'),
                    end_time: moment(schedule.endDate).format('HH:mm'),
                    seat_status: schedule.remainingAttendeeCapacity,
                    wheelchair_available: schedule.remainingAttendeeCapacityForWheelchair,
                    tourNumber: schedule.tourNumber,
                    online_sales_status: schedule.onlineSalesStatus,
                    ev_status: schedule.evServiceStatus,
                    tour_number: schedule.tourNumber,
                    capacity: schedule.maximumAttendeeCapacity,
                    sales_textstatus,
                };
            });
        },
        async updateStatus() {
            // 選択した日の全パフォーマンスを取得
            const scheduleArray = await this.fetchScheduleStatus({
                startFrom: moment(`${this.selectedDay} 000000`, 'YYYYMMDD HHmmss').toISOString(),
                startThrough: moment(`${this.selectedDay} 235959`, 'YYYYMMDD HHmmss').toISOString(),
            });
            if (typeof scheduleArray[0] !== 'object') { return false; }

            // hour ごとでまとめる
            const hourArray = [];
            const performancesByHour = {};
            this.manipulateScheduleData(scheduleArray).forEach((performance) => {
                try {
                    const hour = performance.hour;
                    if (!performancesByHour[hour]) {
                        hourArray.push(hour);
                        performancesByHour[hour] = [];
                    }
                    performancesByHour[hour].push(performance);
                } catch (e) {
                    console.log(e);
                    return true;
                }
                return true;
            });

            this.hourArray = hourArray;
            this.performancesByHour = performancesByHour;
            this.lastupdateStr = `${this.$store.state.moment.format('HH:mm:ss')}時点データ表示中`;

            return true;
        },
        setFetchDataInterval() {
            this.timeoutInstance_IntervalFetch = setTimeout(() => {
                this.updateStatus().then(() => {
                    this.setFetchDataInterval();
                });
            }, getNextTickUnixtime());
        },
        manualUpdate() {
            if (this.$store.state.loadingMsg) { return false; }
            this.$store.commit('SET_LOADINGMSG', '予約状況を取得中...');
            clearTimeout(this.timeoutInstance_IntervalFetch);
            return this.updateStatus().catch((err) => {
                console.log(err);
            }).then(() => {
                this.$store.commit('CLEAR_LOADINGMSG');
                this.setFetchDataInterval();
            });
        },
        watch: {
            dayparam() {
                this.manualUpdate();
            },
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
            padding: 0 0.5em;
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
                display: block;
                font-size: 36px;
                &::before {
                    content: '　';
                    width: 28px;
                    height: 28px;
                    margin-right: 10px;
                    background-repeat: no-repeat;
                    background-size: contain;
                    background-position: center;
                }
                &.status-normal {
                    &::before {
                        background-image: url('../assets/icon-standing.svg');
                    }
                }
                &.status-wheelchair {
                    &::before {
                        background-image: url('../assets/icon-Wheelchair.svg');
                    }
                }
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
                background-color: #ddd;
                color: #9a9a9b;
            }
        }
        .item-supenpeded {
            .time {
                background-color: #bcbcbc;
            }
            .wrapper-status {
                background-color: #333;
                color: #9a9a9b;
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
