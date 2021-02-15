import * as cinerino from '@cinerino/sdk';
import * as axios from 'axios';
import * as moment from 'moment';
import * as factory from '../factory';
import { IAppConfig } from '../store';
import { createOption } from './authorize';
import { sleep } from './util';



// 現在時刻から次の更新時刻までのsetTimeout用msを得る
export function getNextTickUnixtime() {
    const now = moment();
    return moment(now.format('YYYYMMDD HHmm'), 'YYYYMMDD HHmm').add(1, 'minutes').diff(now, 'milliseconds');
}

// パフォーマンス情報を見てCSSクラス付与
export function getStatusClassNameByPerformance(
    momentObj: moment.Moment,
    performance: {
        is_avg: boolean;
        start_time: string;
        end_time: string;
        online_sales_status: 'Normal' | string;
        seat_status: string;
    },
    STATUS_THRESHOLD_RED: number
) {
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

/**
 * 旧APIからステータス取得 
 */
export function legacyFetchScheduleStatus(store: any, params: {
    startFrom: string;
    startThrough: string;
}) {
    const APPCONFIG = store.state.APPCONFIG;
    return new Promise<cinerino.factory.chevre.event.screeningEvent.IEvent[]>((resolve) => {
        axios.default.get<cinerino.factory.chevre.event.screeningEvent.IEvent[]>(APPCONFIG.API_STATUS_ENDPOINT, {
            params,
            timeout: APPCONFIG.API_TIMEOUT,
        }).then((res) => {
            store.commit('UPDATE_MOMENTOBJ');
            let errorMsg = '';
            if (!Array.isArray(res.data)) {
                errorMsg = `(${store.state.moment.format('HH:mm:ss')})[取得データが異常です]`;
            } else if (!res.data[0]) {
                errorMsg = `(${store.state.moment.format('HH:mm:ss')})[スケジュールデータが見つかりませんでした]`;
            }
            if (errorMsg) {
                store.commit('SET_ERRORMSG', errorMsg);
            } else {
                store.commit('CLEAR_ERRORMSG');
            }
            return resolve(res.data.sort((
                a: cinerino.factory.chevre.event.screeningEvent.IEvent,
                b: cinerino.factory.chevre.event.screeningEvent.IEvent
            ) => {
                if (a.startDate < b.startDate) { return -1; }
                if (a.startDate > b.startDate) { return 1; }
                return 0;
            }));
        }).catch((err) => {
            console.log(err);
            store.commit('UPDATE_MOMENTOBJ');
            store.commit('SET_ERRORMSG', `(${store.state.moment.format('HH:mm:ss')})[通信エラー][ステータス取得] ${err.message} `);
            return resolve([]);
        });
    });
}

/**
 * APIからステータス取得
 */
export async function fetchScheduleStatus(store: any, params: {
    startFrom: Date;
    startThrough: Date;
}) {
    try {
        const APPCONFIG: IAppConfig = store.state.APPCONFIG;
        if (APPCONFIG.API_STATUS_ENDPOINT === undefined) {
            new Error('API_STATUS_ENDPOINT undefined');
        }
        const eventService = new cinerino.service.Event(await createOption(APPCONFIG));
        const limit = 100;
        let page = 1;
        let roop = true;
        let result: cinerino.factory.chevre.event.screeningEvent.IEvent[] = [];
        while (roop) {
            const searchResult = await eventService.search({
                page,
                limit,
                typeOf: cinerino.factory.chevre.eventType.ScreeningEvent,
                startFrom: params.startFrom,
                startThrough: params.startThrough,
                sort: { startDate: 1 },
                ...{
                    $projection: {
                        checkInCount: 0,
                        maximumAttendeeCapacity: 0,
                        remainingAttendeeCapacity: 0
                    }
                }
            });
            result = [...result, ...searchResult.data];
            page++;
            roop = searchResult.data.length === limit;
            if (roop) {
                await sleep(1000);
            }
        }
        store.commit('UPDATE_MOMENTOBJ');
        let errorMsg = '';
        if (!Array.isArray(result)) {
            errorMsg = `(${store.state.moment.format('HH:mm:ss')}) [取得データ異常]`;
            store.commit('SET_ERRORMSG', errorMsg);
            return [];
        } else if (result.length === 0) {
            errorMsg = `(${store.state.moment.format('HH:mm:ss')})[スケジュールデータが見つかりませんでした]`;
            store.commit('SET_ERRORMSG', errorMsg);
            return [];
        }
        store.commit('CLEAR_ERRORMSG');
        const sortResult = result.sort((a, b) => {
            if (a.startDate < b.startDate) { return -1; }
            if (a.startDate > b.startDate) { return 1; }
            return 0;
        });

        const convertResult = sortResult.map(s => performance2result(s));
        return convertResult;

    } catch (error) {
        console.log(error);
        store.commit('UPDATE_MOMENTOBJ');
        store.commit('SET_ERRORMSG', `(${store.state.moment.format('HH:mm:ss')}) [通信エラー][ステータス取得] ${error.message}`);
        return [];
    }
}

// tslint:disable-next-line:max-func-body-length
export function performance2result(performance: cinerino.factory.event.screeningEvent.IEvent): factory.schedule.IPerformance {
    const tourNumber = performance.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    let evServiceStatus = factory.schedule.EvServiceStatus.Normal;
    let onlineSalesStatus = factory.schedule.OnlineSalesStatus.Normal;

    switch (performance.eventStatus) {
        case cinerino.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = factory.schedule.EvServiceStatus.Suspended;
            onlineSalesStatus = factory.schedule.OnlineSalesStatus.Suspended;
            break;
        case cinerino.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = factory.schedule.EvServiceStatus.Slowdown;
            onlineSalesStatus = factory.schedule.OnlineSalesStatus.Suspended;
            break;
        case cinerino.factory.chevre.eventStatusType.EventScheduled:
            break;

        default:
    }

    const offers = performance.aggregateOffer?.offers;

    let maximumAttendeeCapacity: number | undefined;
    let remainingAttendeeCapacity: number | undefined;
    let remainingAttendeeCapacityForWheelchair: number | undefined;
    let reservationCount: number | undefined;
    let reservationCountsByTicketType: factory.schedule.IReservationCountByTicketType[] | undefined;
    const defaultCheckinCountsByTicketType: factory.schedule.ICheckinCountsByTicketType[] = (Array.isArray(offers))
        ? offers.map((offer) => {
            return {
                ticketType: <string>offer.id,
                ticketCategory: <string>offer.category?.codeValue,
                count: 0
            };
        })
        : [];
    let checkinCountsByWhere: factory.schedule.ICheckinCountByWhere[] = [
        {
            where: 'DAITEN_AUTH',
            checkinCountsByTicketType: defaultCheckinCountsByTicketType
        },
        {
            where: 'TOPDECK_AUTH',
            checkinCountsByTicketType: defaultCheckinCountsByTicketType
        }
    ];
    let checkinCount: number = 0;

    // aggregateOffer,aggregateReservationから算出する
    maximumAttendeeCapacity = performance.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.maximumAttendeeCapacity;
    remainingAttendeeCapacity = performance.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
    remainingAttendeeCapacityForWheelchair
        = performance.aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

    reservationCount = performance.aggregateReservation?.reservationCount;
    reservationCountsByTicketType = performance.aggregateOffer?.offers?.map((offer) => {
        return {
            ticketType: <string>offer.id,
            count: offer.aggregateReservation?.reservationCount
        };
    });

    const places = performance.aggregateEntranceGate?.places;
    if (Array.isArray(places)) {
        checkinCountsByWhere = places.map((entranceGate) => {
            return {
                where: <string>entranceGate.identifier,
                checkinCountsByTicketType: <factory.schedule.ICheckinCountsByTicketType[]>
                    entranceGate.aggregateOffer?.offers?.map((offer) => {
                        return {
                            ticketType: offer.id,
                            ticketCategory: offer.category?.codeValue,
                            count: offer.aggregateReservation?.useActionCount
                        };
                    })
            };
        });

        checkinCount = places.reduce<number>(
            (a, b) => {
                let useActionCount = a;

                const offers4b = b.aggregateOffer?.offers;
                if (Array.isArray(offers4b)) {
                    useActionCount += offers4b.reduce<number>(
                        (a2, b2) => {
                            return a2 + Number(b2.aggregateReservation?.useActionCount);
                        },
                        0
                    );

                }

                return useActionCount;
            },
            0
        );

    }

    return {
        ...performance,
        ...{
            evServiceStatus: evServiceStatus,
            onlineSalesStatus: onlineSalesStatus,
            tourNumber: tourNumber
        },

        ...(typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined,
        ...(typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined,
        ...(typeof remainingAttendeeCapacityForWheelchair === 'number') ? { remainingAttendeeCapacityForWheelchair } : undefined,
        ...(typeof reservationCount === 'number') ? { reservationCount } : undefined,
        ...(Array.isArray(reservationCountsByTicketType)) ? { reservationCountsByTicketType } : undefined,
        // ...(Array.isArray(checkinCountsByWhere)) ? { checkinCountsByWherePreview: checkinCountsByWhere } : undefined,
        // ...(typeof checkinCount === 'number') ? { checkinCountPreview: checkinCount } : undefined,
        ...{ checkinCountsByWhere, checkinCount }
    };
}

/**
 * APIから施設取得
 */
export async function fetchMovieTheater(store: any) {
    const APPCONFIG: IAppConfig = store.state.APPCONFIG;
    if (APPCONFIG.API_STATUS_ENDPOINT === undefined) {
        new Error('API_STATUS_ENDPOINT undefined');
    }
    const placeService = new cinerino.service.Place(await createOption(APPCONFIG));
    const limit = 100;
    let page = 1;
    let roop = true;
    let result: cinerino.factory.chevre.place.movieTheater.IPlaceWithoutScreeningRoom[] = [];
    while (roop) {
        const searchResult = await placeService.searchMovieTheaters({
            page,
            limit,
        });
        result = [...result, ...searchResult.data];
        page++;
        roop = searchResult.data.length === limit;
        if (roop) {
            await sleep(1000);
        }
    }
    return result;
}