<template>
<div class="content">
    <myHeader>
        <div slot="headerMenu" class="statheadermenu">
            <div class="lastupdate"><span>{{ lastupdateStr }}</span><br>(1分毎に自動更新)</div>
            <div class="btn-update" @click="manualUpdate">更新</div>
        </div>
    </myHeader>

    <errorOneline v-if="$store.state.errorMsgStr" :errorMsgStr="`データ取得エラーが発生しています ${$store.state.errorMsgStr}`"></errorOneline>

    <div class="clockwrapper" @click="focusCurrentSchedule">
        <p><span class="iconBefore icon-clock">{{ $store.state.moment.format('YYYY/MM/DD (dd)') }}</span><span class="hhmm">{{ $store.state.moment.format('HH:mm') }}</span></p>
    </div>

    <main>
        <swiper :options="swiperOption" ref="scheduleSwiper">
            <swiper-slide v-for="(schedule, index) in scheduleArray" :key="schedule.performanceId"
                :class="['schedule', {
                    'schedule-active': currentScheduleIndex === index,
                    'schedule-past': currentScheduleIndex > index
                }]">
                <div class="scheduleheader">
                    <div class="status"></div>
                    <div class="time">{{ `${schedule.start_time}～${schedule.end_time}` }}</div>
                </div>
                <table>
                    <tbody>
                        <tr>
                            <th>来塔予定</th>
                            <td>
                                <p>
                                    <span class="personNum iconBefore icon-standing">{{ schedule.totalReservedNum }}</span>
                                </p>
                                <p v-for="concernedReserved in schedule.concernedReservedArray" :key="`${schedule.id}${concernedReserved.name}`">
                                    <span :class="['personNum iconBefore', `icon-${concernedReserved.name}`]">{{ concernedReserved.reservedNum }}</span>
                                </p>
                            </td>
                        </tr>
                        <tr v-for="checkpoint in schedule.checkpointArray" :class="['checkpoint', `checkpoint-${checkpoint.id}`]" :key="`${schedule.performanceId}_${checkpoint.id}`">
                            <th>{{ checkpoint.name }}<br>未通過</th>
                            <td>
                                <p>
                                    <span class="personNum iconBefore icon-standing">{{ checkpoint.unarrivedNum }}</span>
                                </p>
                                <p v-for="concernedUnarrived in checkpoint.concernedUnarrivedArray" :key="`${checkpoint.id}${concernedUnarrived.name}`">
                                    <span :class="['personNum iconBefore', `icon-${concernedUnarrived.name}`]">{{ concernedUnarrived.unarrivedNum }}</span>
                                </p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </swiper-slide>
            <div class="swiper-scrollbar" slot="scrollbar"></div>
        </swiper>
    </main>
</div>
</template>


<script>
import { swiper, swiperSlide, ScrollBar } from 'vue-awesome-swiper';
import * as axios from 'axios';
import * as moment from 'moment';

require('moment/locale/ja'); // 軽量化のためja以外のlocaleはwebpackビルド時に消す

moment.locale('ja');
const APPCONFIG = require('../config').default.VSTRSTAT;

export default {
    components: {
        swiper,
        swiperSlide,
        ScrollBar,
    },
    data() {
        return {
            APPCONFIG,
            flg_loaded: false,
            lastupdateStr: '未取得',
            scheduleArray: [],
            currentScheduleIndex: null,
            timeoutInstance_IntervalFetch: null,
            swiperOption: {
                autoplay: false,
                centeredSlides: true,
                grabCursor: true,
                mousewheelControl: true,
                paginationClickable: false,
                scrollbar: '.swiper-scrollbar',
                slidesPerView: 3,
                spaceBetween: 30,
            },
        };
    },
    created() {
        // データ初期化後に自動取得開始
        this.$store.commit('SET_LOADINGMSG', '画面初期化中...');
        this.fetchData().then(() => {
            this.flg_loaded = true;
            this.setFetchDataInterval();
            this.$store.commit('CLEAR_LOADINGMSG');
        });
    },
    methods: {
        // 現在時刻とパフォーマンスのstart_time～end_timeでisBetweenしてtrueだったscheduleをcurrentScheduleIndexとする
        focusCurrentSchedule() {
            // パフォーマンスが1つしか無いので無用
            if (this.scheduleArray.length < 2) { return false; }

            const ymd = this.$store.state.moment.format('YYYY-MM-DD');
            // 現在受付中のschedule
            let currentIndex = this.scheduleArray.findIndex((schedule) => {
                return (this.$store.state.moment.isBetween(`${ymd} ${schedule.start_time}:00`, `${ymd} ${schedule.end_time}:59`));
            });
            // 受付中のscheduleが無かった場合全て終了済みなのかチェック
            if (!currentIndex && this.$store.state.moment.isAfter(`${ymd} ${this.scheduleArray[this.scheduleArray.length - 1].end_time}:59`)) {
                // 全て終了済みの表示にするためカンスト
                currentIndex = Number.MAX_VALUE;
            }

            // アクティブなパフォーマンスへswiperのフォーカスを移動する
            if (currentIndex <= this.scheduleArray.length) {
                this.$refs.scheduleSwiper.swiper.slideTo(currentIndex);
            }
            this.currentScheduleIndex = currentIndex;
            return true;
        },
        manipulateScheduleData(checkpoints, scheduleArray) {
            // チェックポイント定義
            const requiredCheckpointIdArray = Object.keys(checkpoints);
            scheduleArray.forEach((schedule) => {
                // 時刻に : を入れる
                schedule.start_time = moment(schedule.start_time, 'hmm').format('HH:mm');
                schedule.end_time = moment(schedule.end_time, 'hmm').format('HH:mm');

                // totalReservedNumからconcernedReservedArrayの総人数を引く
                schedule.totalReservedNum -= schedule.concernedReservedArray.reduce((a, b) => {
                    return ((a.reservedNum || 0) + (b.reservedNum || 0));
                }, {});

                // scheduleオブジェクト内のcheckpointArrayを分解
                const existingCheckpointsById = schedule.checkpointArray.reduce((o, c) => Object.assign(o, { [c.id]: c }), {});
                const existingCheckpointIdArray = Object.keys(existingCheckpointsById);

                // APIの仕様でチェックインが発生するまでschedule.checkpointArrayにcheckpointは生えないので、定義と照らして無かったら作って足す処理をする
                // requiredCheckpointIdArrayの順でcheckpointArrayを構築していく (唯一のチェックインがイレギュラーな順番でのチェックインだった時に表示の並び順がそれに引っ張られないように)
                schedule.checkpointArray = requiredCheckpointIdArray.map((requiredCheckpointId) => {
                    // 既にあるものはそのまま返す
                    if (existingCheckpointIdArray.indexOf(requiredCheckpointId) !== -1) {
                        return existingCheckpointsById[requiredCheckpointId];
                    }
                    // schedule.checkpointArrayに無かった = まだ誰も来てない = unarrivedNumはreservedNumと同じ
                    return {
                        id: requiredCheckpointId,
                        name: checkpoints[requiredCheckpointId],
                        unarrivedNum: schedule.totalReservedNum,
                        concernedUnarrivedArray: schedule.concernedReservedArray.map((concerned) => {
                            return {
                                id: concerned.id,
                                name: concerned.name,
                                unarrivedNum: concerned.reservedNum,
                            };
                        }),
                    };
                });
            });
            return scheduleArray;
        },
        fetchData() {
            return new Promise((resolve) => {
                axios.get(APPCONFIG.API_ENDPOINT, {
                    timeout: APPCONFIG.API_TIMEOUT,
                    auth: APPCONFIG.API_BASICAUTH,
                }).then((res) => {
                    this.$store.commit('UPDATE_MOMENTOBJ');
                    let errorMsg = '';
                    if (res.data.error) {
                        errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [${res.data.error}]`;
                    } else if (!res.data || !res.data.data || !Array.isArray(res.data.data.schedules)) {
                        errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [取得データが異常です]`;
                    } else if (!res.data.data.schedules[0]) {
                        errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [スケジュールデータが見つかりませんでした]`;
                    } else if (!res.data.data.checkpoints || !Object.keys(res.data.data.checkpoints).length) {
                        errorMsg = `(${this.$store.state.moment.format('HH:mm:ss')}) [チェックポイントの定義が読み込めませんでした]`;
                    }
                    if (errorMsg) {
                        return this.$store.commit('SET_ERRORMSG', errorMsg);
                    }
                    this.$store.commit('CLEAR_ERRORMSG');
                    this.scheduleArray = this.manipulateScheduleData(res.data.data.checkpoints, res.data.data.schedules);
                    this.lastupdateStr = `${this.$store.state.moment.format('HH:mm:ss')}時点データ表示中`;
                    return true;
                }).catch((err) => {
                    this.$store.commit('UPDATE_MOMENTOBJ');
                    this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [通信エラー][来島状況取得] [${err.message}]`);
                }).then(() => {
                    this.focusCurrentSchedule();
                    resolve();
                });
            });
        },
        getNextTickUnixtime() {
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), (now.getMinutes() + 1), 0, 0) - now;
        },
        setFetchDataInterval() {
            this.timeoutInstance_IntervalFetch = setTimeout(() => {
                this.fetchData().then(() => {
                    this.setFetchDataInterval();
                });
            }, this.getNextTickUnixtime());
        },
        manualUpdate() {
            if (this.$store.state.loadingMsg) { return false; }
            this.$store.commit('SET_LOADINGMSG', '来塔状況を取得中...');
            clearTimeout(this.timeoutInstance_IntervalFetch);
            return this.fetchData().catch((err) => {
                console.log(err);
            }).then(() => {
                this.setFetchDataInterval();
                this.$store.commit('CLEAR_LOADINGMSG');
            });
        },
    },
};
</script>

<style lang="scss" scoped>
    main {
        max-width: 960px;
        margin: auto;
        padding: 0 20px;
    }
    .clockwrapper {
        text-align: center;
        padding: 10px;
        background-color: #ededed;
        margin-bottom: 20px;
        cursor: pointer;
        >p {
            margin: 0;
            >span {
                user-select: none;
            }
        }
        .icon-clock {
            font-size: 20px;
            &::before {
                margin-right: 10px;
                width: 32px;
                height: 32px;
                vertical-align: middle;
            }
        }
        .hhmm {
            font-size: 28px;
            margin-left: 10px;
            vertical-align: sub;
        }
    }
    .swiper-container {
        max-width: 960px;
    }
    .swiper-button-disabled {
        display: none;
    }
    .schedule {
        display: inline-block;
        cursor: pointer;
        border: 1px solid #999;
        border-radius: 6px;
        overflow: hidden;
        user-select: none;
        .scheduleheader {
            margin: 0;
            padding: 0;
            text-align: center;
            >div {
                padding: 10px;
            }
            >.status {
                border-bottom: 1px solid #999;
                &::before {
                    content: '　';
                }
            }
            >.time {
                font-size: 28px;
            }
        }
        th {
            background-color: #ededed;
            color: #5b5b5b;
            width: 110px;
        }
        p {
            margin: 0;
            border-bottom: 1px dashed #999;
            &:last-child {
                border-bottom: none;
            }
        }
        .personNum {
            font-size: 48px;
            &.icon-standing::before {
                width: 28px;
                height: 28px;
                margin-right: 10px;
                background-image: url('../assets/icon-standing.svg');
            }
            &.icon-wheelchair::before {
                width: 24px;
                height: 24px;
                margin-right: 14px;
                background-image: url('../assets/icon-wheelchair.svg');
            }
        }
    }
    .schedule-active {
        color: #5190cc;
        .scheduleheader {
            .status {
                background-color: #5190cc;
                color: #fff;
                &::before {
                    content: '受付中';
                }
            }
        }
        th {
            color: #5190cc;
            background-color: #e2f0f7;
        }
    }
    .schedule-past {
        background-color: #ccc;
        color: #515151;
        .scheduleheader {
            .status {
                background-color: #a8a8a8;
                &::before {
                    content: '終了';
                }
            }
        }
        th {
            background-color: #a8a8a8;
        }
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    td,th {
        border-top: 1px solid #999;
        text-align: center;
    }
</style>
