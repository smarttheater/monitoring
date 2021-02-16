
/*
  在庫状況確認用画面
  ・現場のPOS横などに配置したタブレットから参照するのがメインだがStaffページからもリンクしてくる
*/
import * as moment from 'moment';
import 'twix';
import * as mixins from '../mixins';
import * as factory from '../factory';
import Vue from 'vue';

export default Vue.extend({
    components: {
        // Clock: require('../components/Clock.vue').default,
    },
    data() {
        return {
            lastupdateStr: '未取得',
            moment,
            dayMomentArray: <moment.Moment[]>[],
            selectedDay: (<string>this.$route.query.day) || moment().format('YYYYMMDD'),
            hourArray: <string[]>[],
            performancesByHour: {},
            timeoutInstance_IntervalFetch: <NodeJS.Timeout | null>null,
            bool_hidepasthours: true,
        };
    },
    computed: {
        dayparam() {
            return this.$route.query.day;
        },
        isToday() {
            return (this.$data.selectedDay === this.$store.state.moment.format('YYYYMMDD'));
        },
    },
    methods: {
        fetchScheduleStatus: mixins.schedule.fetchScheduleStatus,
        getStatusClassNameByPerformance: mixins.schedule.getStatusClassNameByPerformance,
        // 日付選択肢を用意(7日先まで)
        createDaySelect() {
            this.dayMomentArray = (<any>moment).twix(moment(), moment().add(7, 'days')).toArray('days');
        },
        changeDay(e: Event) {
            if (e.target === null) {
                return;
            }
            this.selectedDay = (<HTMLSelectElement>e.target).value;
            this.manualUpdate();
        },
        // APIが返してくるJSONを実際に使える形に整形する
        manipulateScheduleData(scheduleArray: factory.schedule.IPerformance[]) {
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
            const scheduleArray = await this.fetchScheduleStatus(this.$store, {
                startFrom: moment(`${this.selectedDay} 000000`, 'YYYYMMDD HHmmss').toDate(),
                startThrough: moment(`${this.selectedDay} 235959`, 'YYYYMMDD HHmmss').toDate(),
            });
            if (typeof scheduleArray[0] !== 'object') { return false; }
            // hour ごとでまとめる
            const hourArray: string[] =[];
            const performancesByHour: any = {};
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
            }, mixins.schedule.getNextTickUnixtime());
        },
        manualUpdate() {
            if (this.$store.state.loadingMsg) { return false; }
            this.$store.commit('SET_LOADINGMSG', '予約状況を取得中...');
            if (this.timeoutInstance_IntervalFetch !== null) {
                clearTimeout(this.timeoutInstance_IntervalFetch);
            }
            return this.updateStatus().catch((err) => {
                console.log(err);
            }).then(() => {
                this.$store.commit('CLEAR_LOADINGMSG');
                this.setFetchDataInterval();
            });
        },
    },
    watch: {
        dayparam() {
            this.manualUpdate();
        },
    },
    created() {
        this.createDaySelect();
        this.manualUpdate();
    },
    beforeDestroy() {
        if (this.timeoutInstance_IntervalFetch !== null) {
            clearTimeout(this.timeoutInstance_IntervalFetch);
        }
    },
});
