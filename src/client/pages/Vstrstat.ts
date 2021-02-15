
/*
  来塔状況確認用画面(通称:現場のおばちゃん画面)
  ・パフォーマンスごとの来塔予定者数とチェックポイントごとの未到着者数を表示する
  ・車椅子の相手は注意が必要なので表示とカウントの枠を分ける
  →(現状は車椅子だけだが他に要注意カテゴリが発生する可能性はあるので APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY で注意対象の券種カテゴリを定義する)
*/
import { swiper, swiperSlide } from 'vue-awesome-swiper';
import * as axios from 'axios';
import * as moment from 'moment';
import * as factory from '../factory';
import * as mixins from '../mixins';
import Vue from 'vue';

require('moment/locale/ja'); // 軽量化のためja以外のlocaleはwebpackビルド時に消す

moment.locale('ja');

export default Vue.extend({
    components: {
        swiper,
        swiperSlide,
        // Clock: require('../components/Clock.vue').default,
    },
    data() {
        return {
            APPCONFIG: this.$store.state.APPCONFIG,
            flg_loaded: false,
            lastupdateStr: '未取得',
            chekpointDefinition: <{ [key: string]: string }>{},
            scheduleArray: <{
                performanceId: any;
                start_time: string;
                end_time: string;
                normalReservedNum: any;
                concernedReservationArray: any;
                checkpointStatusArray: any;
            }[]>[],
            currentScheduleIndex: <number | null>null,
            timeoutInstance_IntervalFetch: <NodeJS.Timeout | null>null,
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
        if (this.timeoutInstance_IntervalFetch !== null) {
            clearTimeout(this.timeoutInstance_IntervalFetch);
        }
    },
    methods: {
        fetchScheduleStatus: mixins.schedule.fetchScheduleStatus,
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
            if (currentIndex < 0 && this.$store.state.moment.isAfter(`${ymd} ${this.scheduleArray[this.scheduleArray.length - 1].end_time}:59`)) {
                // 全て終了済みの表示にするためカンスト
                currentIndex = Number.MAX_VALUE;
            }

            // アクティブなパフォーマンスへswiperのフォーカスを移動する
            if (currentIndex >= 0 && currentIndex <= this.scheduleArray.length) {
                (<any>this.$refs.scheduleSwiper).swiper.slideTo(currentIndex);
            }
            this.currentScheduleIndex = currentIndex;
            return true;
        },
        // APIが返してくるJSONを実際に使える形に整形する
        manipulateScheduleData(scheduleArray: factory.schedule.IPerformance[]) {
            // カテゴリ別で予約数をカウントするが reservationCountsByTicketType には ticketCategory が入っていないので辞書を作っておく
            const ticketCategoryByCode: any = {};
            if (scheduleArray[0].checkinCountsByWhere !== undefined) {
                scheduleArray[0].checkinCountsByWhere[0].checkinCountsByTicketType.forEach((ticketType: any) => {
                    ticketCategoryByCode[ticketType.ticketType] = ticketType.ticketCategory;
                });
            }


            return scheduleArray.map((schedule) => {
                // ticketCategory ごとの予約総数を求める。同時に平常(concerned)と要注意(notConcerned)の括りでも数える。
                const totalReservedNumByCategory: any = {
                    notConcerned: 0,
                    concerned: 0,
                };
                if (schedule.reservationCountsByTicketType !== undefined) {
                    schedule.reservationCountsByTicketType.forEach((ticketType: any) => {
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
                }

                return {
                    performanceId: schedule.id,
                    start_time: moment(schedule.startDate).format('HH:mm'),
                    end_time: moment(schedule.endDate).format('HH:mm'),
                    normalReservedNum: totalReservedNumByCategory.notConcerned,
                    concernedReservationArray: this.APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY
                        .filter((code: string) => { return (typeof totalReservedNumByCategory[code] === 'number'); })
                        .map((code: string) => {
                            return {
                                name: code,
                                reservedNum: totalReservedNumByCategory[code],
                            };
                        }),
                    checkpointStatusArray: (schedule.checkinCountsByWhere === undefined) ? [] : schedule.checkinCountsByWhere
                        .filter((c: any) => { return (this.APPCONFIG.VSTRSTAT_CHECKPOINT_TARGETWHERE_ARRAY.indexOf(c.where) !== -1); })
                        .map((countData: any) => {
                            // ticketCategory ごとのチェックイン済み数を求める。同時に平常(concerned)と要注意(notConcerned)の括りでも数える。
                            const totalCheckinNumByCategory: any = {
                                notConcerned: 0,
                                concerned: 0,
                            };
                            countData.checkinCountsByTicketType.forEach((ticketType: any) => {
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
                                name: (<any>this.chekpointDefinition)[countData.where],
                                normalUnarrivedNum: (totalReservedNumByCategory.notConcerned - totalCheckinNumByCategory.notConcerned),
                                concernedUnarrivedArray: this.APPCONFIG.VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY
                                    .filter((code: string) => { return (typeof totalReservedNumByCategory[code] === 'number'); })
                                    .map((code: string) => {
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
        /**
         * APIから入場ゲート取得
         * @deprecated
         */
        legacyRefreshCheckpointsData() {
            return new Promise<void>((resolve) => {
                axios.default.get(this.APPCONFIG.API_CHECKPOINTDIFINITION_ENDPOINT, {
                    timeout: this.APPCONFIG.API_TIMEOUT,
                }).then((res) => {
                    if (!Array.isArray(res.data) || !res.data.length) {
                        return this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [チェックポイントの定義が読み込めませんでした][/places/checkinGate]`);
                    }
                    res.data.forEach((checkpoint) => {
                        (<any>this.chekpointDefinition)[checkpoint.identifier] = checkpoint.name;
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
        /**
         * 施設取得APIから入場ゲート取得
         */
        refreshCheckpointsData() {
            return new Promise<void>((resolve) => {
                mixins.schedule.fetchMovieTheater(this.$store).then((movieTheaters) => {
                    if (movieTheaters.length === 0
                        || movieTheaters[0].hasEntranceGate === undefined) {
                        return this.$store.commit('SET_ERRORMSG', `(${this.$store.state.moment.format('HH:mm:ss')}) [チェックポイントの定義が読み込めませんでした][/places/checkinGate]`);
                    }
                    movieTheaters[0].hasEntranceGate.forEach((g) => {
                        if (g.identifier === undefined
                            || typeof (g.identifier) !== 'string') {
                            return;
                        }
                        this.chekpointDefinition[g.identifier] = (typeof g.name === 'string') ? g.name : String(g.name?.ja);
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
            return new Promise<void>(async (resolve) => {
                // 今日一日の全パフォーマンスを取得対象にする
                const params = {
                    startFrom: new Date(),
                    startThrough: new Date(),
                };
                params.startFrom.setHours(0, 0, 0, 0);
                params.startThrough.setHours(23, 59, 59, 999);

                const scheduleArray = await this.fetchScheduleStatus(this.$store, params);
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
            }, mixins.schedule.getNextTickUnixtime());
        },
        manualUpdate() {
            if (this.$store.state.loadingMsg) { return false; }
            this.$store.commit('SET_LOADINGMSG', '来塔状況を取得中...');
            if (this.timeoutInstance_IntervalFetch !== null) {
                clearTimeout(this.timeoutInstance_IntervalFetch);
            }
            return this.fetchData().catch((err) => {
                console.log(err);
            }).then(() => {
                this.setFetchDataInterval();
                this.$store.commit('CLEAR_LOADINGMSG');
            });
        },
    },
});
