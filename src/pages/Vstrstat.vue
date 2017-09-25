<template>
    <div class="content">
        <myHeader>
            <div slot="headerMenu" class="statheadermenu">
                <div class="lastupdate"><span>{{ lastupdateStr }}</span><br>({{(APPCONFIG.UPDATEINTERVAL / 1000)}}秒毎に自動更新)</div>
                <div class="btn-update" @click="manualUpdate">更新</div>
            </div>
        </myHeader>

        <errorOneline v-if="errorMsgStr" :errorMsgStr="`データ取得エラーが発生しています ${errorMsgStr}`"></errorOneline>

        <div class="clockwrapper" @click="focusCurrentSchedule"><p><span class="iconBefore icon-clock">{{ momentObj.format('YYYY/MM/DD (dd)') }}</span><span class="hhmm">{{ momentObj.format('HH:mm') }}</span></p></div>

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
            </swiper>
        </main>
    </div>
</template>


<script>
import { swiper, swiperSlide } from 'vue-awesome-swiper';
import * as axios from 'axios';
import * as moment from 'moment';

require('moment/locale/ja'); // 軽量化のためja以外のlocaleはwebpackビルド時に消す
const APPCONFIG = require('../config').default.VSTRSTAT;

export default {
    components: {
        swiper,
        swiperSlide,
    },
    data() {
        return {
            APPCONFIG,
            flg_loaded: false,
            errorMsgStr: '',
            lastupdateStr: '未取得',
            momentObj: moment(),
            scheduleArray: [],
            currentScheduleIndex: null,
            timeoutInstance_IntervalFetch: null,
            swiperOption: {
                autoplay: false,
                centeredSlides: true,
                paginationClickable: false,
                slidesPerView: 3,
                spaceBetween: 30,
            },
        };
    },
    created() {
        moment.locale('ja');
        // データ初期化後に自動取得開始
        this.$store.commit('SET_LOADINGMSG', '画面初期化中...');
        this.fetchData().then(() => {
            this.flg_loaded = true;
            this.setFetchDataInterval();
            this.$store.commit('CLEAR_LOADINGMSG');
        });
    },
    methods: {
        // 文字列整形用 (Stringのidx文字目にstrを差し込む)
        spliceStr(targetStr, idx, str) {
            let ret = targetStr;
            try {
                ret = (targetStr.slice(0, idx) + str + targetStr.slice(idx));
            } catch (e) {
                console.log(e);
            }
            return ret || targetStr;
        },
        focusCurrentSchedule() {
            // 現在時刻とstart_time～end_timeでisBetweenしてtrueのscheduleをcurrentScheduleIndexとする
            // ※通信が途絶していても表示更新するためfetchData()と切り分けている
            if (this.scheduleArray.length < 2) {
                return false;
            }
            const ymd = this.momentObj.format('YYYY-MM-DD');
            let currentIndex = null; // 現在受付中のschedule
            this.scheduleArray.forEach((schedule, index) => {
                if (this.momentObj.isBetween(`${ymd} ${schedule.start_time}:00`, `${ymd} ${schedule.end_time}:59`)) {
                    currentIndex = index;
                    return false;
                }
                return true;
            });
            // 受付中のscheduleが無かった場合は全て終了済みかチェック
            if (!currentIndex && this.momentObj.isAfter(`${ymd} ${this.scheduleArray[this.scheduleArray.length - 1].end_time}:59`)) {
                // 全て終了済みにするためカンスト
                currentIndex = Number.MAX_VALUE;
            }
            this.currentScheduleIndex = currentIndex;
            // swiperのフォーカスを移動する
            return this.$refs.scheduleSwiper.swiper.slideTo(currentIndex);
        },
        fetchData() {
            return new Promise((resolve) => {
                axios.get(APPCONFIG.API_ENDPOINT, {
                    timeout: APPCONFIG.API_TIMEOUT,
                }).then((res) => {
                    this.momentObj = moment();
                    if (res.data.error) {
                        this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [${res.data.error}]`;
                        return false;
                    }
                    if (!res.data || !res.data.data || !Array.isArray(res.data.data.schedules)) {
                        this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [取得データが異常です]`;
                        return false;
                    }
                    if (!res.data.data.schedules[0]) {
                        this.errorMsgStr = `(${this.momentObj.format('HH:mm:ss')}) [スケジュールデータが空です]`;
                        return false;
                    }
                    // start_timeでソート
                    res.data.data.schedules.sort((a, b) => {
                        if (a.start_time < b.start_time) return -1;
                        if (a.start_time > b.start_time) return 1;
                        return 0;
                    });
                    // 整形処理
                    const requiredCheckpointIdArray = Object.keys(res.data.data.checkpoints); // チェックポイント定義
                    res.data.data.schedules.forEach((schedule, index) => {
                        // 時刻に : を入れる
                        res.data.data.schedules[index].start_time = this.spliceStr(schedule.start_time, 2, ':');
                        res.data.data.schedules[index].end_time = this.spliceStr(schedule.end_time, 2, ':');

                        // totalReservedNumからconcernedReservedArrayの総人数を引く
                        res.data.data.schedules[index].totalReservedNum -= schedule.concernedReservedArray.reduce((a, b) => {
                            return ((a.reservedNum || 0) + (b.reservedNum || 0));
                        }, {});

                        // checkpointArrayを確認 (APIの仕様でチェックインが発生するまでcheckpointはJSONに生えないので、定義と照らして無かったら作って足す)
                        const checkpointIdArray = schedule.checkpointArray.map((cp) => { return cp.id; });
                        requiredCheckpointIdArray.forEach((requiredCheckpointId) => {
                            if (checkpointIdArray.indexOf(requiredCheckpointId) !== -1) {
                                return true;
                            }
                            // schedule.checkpointArrayに無かった = まだ誰も来てない = unarrivedNumはreservedNumと同じ
                            res.data.data.schedules[index].checkpointArray.push({
                                id: requiredCheckpointId,
                                name: res.data.data.checkpoints[requiredCheckpointId],
                                unarrivedNum: res.data.data.schedules[index].totalReservedNum,
                                concernedUnarrivedArray: schedule.concernedReservedArray.map((concerned) => {
                                    return {
                                        id: concerned.id,
                                        name: concerned.name,
                                        unarrivedNum: concerned.reservedNum,
                                    };
                                }),
                            });
                            return true;
                        });
                    });
                    this.scheduleArray = res.data.data.schedules;
                    this.lastupdateStr = `${this.momentObj.format('HH:mm:ss')}時点データ表示中`;
                    this.errorMsgStr = '';
                    return true;
                }).catch((err) => {
                    this.momentObj = moment();
                    this.errorMsgStr = `(${moment().format('HH:mm:ss')}) [${err.message}]`;
                }).then(() => {
                    this.focusCurrentSchedule();
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
