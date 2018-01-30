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
        <p><span class="iconBefore icon-clock">{{ $store.state.moment.format('YYYY/MM/DD (dd)') }}</span><clock class="hhmm"></clock></p>
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
                                    <span class="personNum iconBefore icon-standing">{{ schedule.normalReservedNum }}</span>
                                </p>
                                <p v-for="concernedReservation in schedule.concernedReservationArray" :key="`${schedule.id}${concernedReservation.name}`">
                                    <span :class="['personNum iconBefore', `icon-${concernedReservation.name}`]">{{ concernedReservation.reservedNum }}</span>
                                </p>
                            </td>
                        </tr>
                        <tr v-for="checkpoint in schedule.checkpointStatusArray" :class="['checkpoint', `checkpoint-${checkpoint.id}`]" :key="`${schedule.performanceId}_${checkpoint.id}`">
                            <th>{{ checkpoint.name }}<br>未通過</th>
                            <td>
                                <p>
                                    <span class="personNum iconBefore icon-standing">{{ checkpoint.normalUnarrivedNum }}</span>
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
/*
  来塔状況確認用画面(通称:現場のおばちゃん画面)
  ・パフォーマンスごとの来塔予定者数とチェックポイントごとの未到着者数を表示する
  ・車椅子の相手は注意が必要なので表示とカウントの枠を分ける
  →(現状は車椅子だけだが他に要注意カテゴリが発生する可能性はあるので APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY で注意対象の券種カテゴリを定義する)
*/
import { swiper, swiperSlide } from 'vue-awesome-swiper';
import * as axios from 'axios';
import * as moment from 'moment';
import { fetchScheduleStatus, getNextTickUnixtime } from '../mixins/';

require('moment/locale/ja'); // 軽量化のためja以外のlocaleはwebpackビルド時に消す

moment.locale('ja');

export default {
    components: {
        swiper,
        swiperSlide,
        Clock: require('../components/Clock.vue').default,
    },
    data() {
        return {
            APPCONFIG: this.$store.state.APPCONFIG,
            flg_loaded: false,
            lastupdateStr: '未取得',
            chekpointDefinition: {},
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
        this.$store.commit('SET_LOADINGMSG', '認証場所の一覧を取得中...');
        this.refreshCheckpointsData().then(() => {
            this.$store.commit('SET_LOADINGMSG', '来塔状況を取得中...');
            this.fetchData().then(() => {
                this.flg_loaded = true;
                this.setFetchDataInterval();
                this.$store.commit('CLEAR_LOADINGMSG');
            });
        });
    },
    beforeDestroy() {
        clearTimeout(this.timeoutInstance_IntervalFetch);
    },
    methods: {
        fetchScheduleStatus,
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
        // APIが返してくるJSONを実際に使える形に整形する
        manipulateScheduleData(scheduleArray) {
            // カテゴリ別で予約数をカウントするが reservationCountsByTicketType には ticketCategory が入っていないので辞書を作っておく
            const ticketCategoryByCode = {};
            scheduleArray[0].checkinCountsByWhere[0].checkinCountsByTicketType.forEach((ticketType) => {
                ticketCategoryByCode[ticketType.ticketType] = ticketType.ticketCategory;
            });

            return scheduleArray.map((schedule) => {
                // ticketCategory ごとの予約総数を求める。同時に平常(concerned)と要注意(notConcerned)の括りでも数える。
                const totalReservedNumByCategory = {
                    notConcerned: 0,
                    concerned: 0,
                };
                schedule.reservationCountsByTicketType.forEach((ticketType) => {
                    if (typeof totalReservedNumByCategory[ticketCategoryByCode[ticketType.ticketType]] !== 'number') {
                        totalReservedNumByCategory[ticketCategoryByCode[ticketType.ticketType]] = 0;
                    }
                    totalReservedNumByCategory[ticketCategoryByCode[ticketType.ticketType]] += ticketType.count;

                    if (this.APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY.indexOf(ticketCategoryByCode[ticketType.ticketType]) === -1) {
                        totalReservedNumByCategory.notConcerned += ticketType.count;
                    } else {
                        totalReservedNumByCategory.concerned += ticketType.count;
                    }
                });

                return {
                    performanceId: schedule.id,
                    start_time: moment(schedule.startDate).format('HH:mm'),
                    end_time: moment(schedule.endDate).format('HH:mm'),
                    normalReservedNum: totalReservedNumByCategory.notConcerned,
                    concernedReservationArray: this.APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY.filter((code) => { return (typeof totalReservedNumByCategory[code] === 'number'); }).map((code) => {
                        return {
                            name: code,
                            reservedNum: totalReservedNumByCategory[code],
                        };
                    }),
                    checkpointStatusArray: schedule.checkinCountsByWhere.filter((c) => { return (this.APPCONFIG.VSTRSTAT_CHECKPOINT_TARGETWHERE_ARRAY.indexOf(c.where) !== -1); }).map((countData) => {
                        // ticketCategory ごとのチェックイン済み数を求める。同時に平常(concerned)と要注意(notConcerned)の括りでも数える。
                        const totalCheckinNumByCategory = {
                            notConcerned: 0,
                            concerned: 0,
                        };
                        countData.checkinCountsByTicketType.forEach((ticketType) => {
                            // ※こちらの ticketType には ticketCategory が入っている
                            if (typeof totalCheckinNumByCategory[ticketType.ticketCategory] !== 'number') {
                                totalCheckinNumByCategory[ticketType.ticketCategory] = 0;
                            }
                            totalCheckinNumByCategory[ticketType.ticketCategory] += ticketType.count;

                            if (this.APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY.indexOf(ticketType.ticketCategory) === -1) {
                                totalCheckinNumByCategory.notConcerned += ticketType.count;
                            } else {
                                totalCheckinNumByCategory.concerned += ticketType.count;
                            }
                        });

                        return {
                            id: countData.where,
                            name: this.chekpointDefinition[countData.where],
                            normalUnarrivedNum: (totalReservedNumByCategory.notConcerned - totalCheckinNumByCategory.notConcerned),
                            concernedUnarrivedArray: this.APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY.filter((code) => { return (typeof totalReservedNumByCategory[code] === 'number'); }).map((code) => {
                                return {
                                    name: code,
                                    unarrivedNum: (totalReservedNumByCategory[code] - totalCheckinNumByCategory[code]),
                                };
                            }),
                        };
                    }),
                };
            });
        },
        refreshCheckpointsData() {
            return new Promise((resolve) => {
                axios.get(this.APPCONFIG.API_CHECKPOINTDIFINITION_ENDPOINT, {
                    timeout: this.APPCONFIG.API_TIMEOUT,
                }).then((res) => {
                    if (!Array.isArray(res.data) || !res.data.length) {
                        return this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [チェックポイントの定義が読み込めませんでした][/places/checkinGate]`);
                    }
                    res.data.forEach((checkpoint) => {
                        this.chekpointDefinition[checkpoint.identifier] = checkpoint.name;
                    });
                    this.$store.commit('CLEAR_ERRORMSG');
                    return true;
                }).catch((err) => {
                    this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [通信エラー][チェックポイント一覧取得] [${err.message}]`);
                }).then(() => {
                    resolve();
                });
            });
        },
        fetchData() {
            return new Promise(async (resolve) => {
                // 今日一日の全パフォーマンスを取得対象にする
                const params = {
                    startFrom: new Date(),
                    startThrough: new Date(),
                };
                params.startFrom.setHours(0, 0, 0, 0);
                params.startThrough.setHours(23, 59, 59, 999);

                const scheduleArray = await this.fetchScheduleStatus(params);
                if (typeof scheduleArray[0] === 'object') {
                    this.scheduleArray = this.manipulateScheduleData(scheduleArray);
                    this.lastupdateStr = `${this.$store.state.moment.format('HH:mm:ss')}時点データ表示中`;
                }
                this.focusCurrentSchedule();
                resolve();
            });
        },
        setFetchDataInterval() {
            this.timeoutInstance_IntervalFetch = setTimeout(() => {
                this.fetchData().then(() => {
                    this.setFetchDataInterval();
                });
            }, getNextTickUnixtime());
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
        padding-left: 1px; // slideのborder-leftが見切れないように
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
            &.icon-Wheelchair::before {
                width: 24px;
                height: 24px;
                margin-right: 14px;
                background-image: url('../assets/icon-Wheelchair.svg');
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
