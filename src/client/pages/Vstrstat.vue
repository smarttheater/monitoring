<template>
  <div class="content">
    <myHeader>
      <div slot="headerMenu" class="statheadermenu">
        <div class="lastupdate">
          <span>{{ lastupdateStr }}</span
          ><br />(1分毎に自動更新)
        </div>
        <div class="btn-update" @click="manualUpdate">更新</div>
      </div>
    </myHeader>

    <errorOneline
      v-if="$store.state.errorMsgStr"
      :errorMsgStr="`データ取得エラーが発生しています ${$store.state.errorMsgStr}`"
    ></errorOneline>

    <div class="clockwrapper" @click="focusCurrentSchedule">
      <p>
        <span class="iconBefore icon-clock">{{
          $store.state.moment.format("YYYY/MM/DD (dd)")
        }}</span
        ><clock class="hhmm"></clock>
      </p>
    </div>

    <main>
      <swiper :options="swiperOption" ref="scheduleSwiper">
        <swiper-slide
          v-for="(schedule, index) in scheduleArray"
          :key="schedule.performanceId"
          :class="[
            'schedule',
            {
              'schedule-active': currentScheduleIndex === index,
              'schedule-past': currentScheduleIndex > index,
            },
          ]"
        >
          <div class="scheduleheader">
            <div class="status"></div>
            <div class="time">
              {{ `${schedule.start_time}～${schedule.end_time}` }}
            </div>
          </div>
          <table>
            <tbody>
              <tr>
                <th>来塔予定</th>
                <td>
                  <p>
                    <span class="personNum iconBefore icon-standing">{{
                      schedule.normalReservedNum
                    }}</span>
                  </p>
                  <p
                    v-for="concernedReservation in schedule.concernedReservationArray"
                    :key="`${schedule.id}${concernedReservation.name}`"
                  >
                    <span
                      :class="[
                        'personNum iconBefore',
                        `icon-${concernedReservation.name}`,
                      ]"
                      >{{ concernedReservation.reservedNum }}</span
                    >
                  </p>
                </td>
              </tr>
              <tr
                v-for="checkpoint in schedule.checkpointStatusArray"
                :class="['checkpoint', `checkpoint-${checkpoint.id}`]"
                :key="`${schedule.performanceId}_${checkpoint.id}`"
              >
                <th>{{ checkpoint.name }}<br />未通過</th>
                <td>
                  <p>
                    <span class="personNum iconBefore icon-standing">{{
                      checkpoint.normalUnarrivedNum
                    }}</span>
                  </p>
                  <p
                    v-for="concernedUnarrived in checkpoint.concernedUnarrivedArray"
                    :key="`${checkpoint.id}${concernedUnarrived.name}`"
                  >
                    <span
                      :class="[
                        'personNum iconBefore',
                        `icon-${concernedUnarrived.name}`,
                      ]"
                      >{{ concernedUnarrived.unarrivedNum }}</span
                    >
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


<script lang="ts">
import Vstrstat from './Vstrstat';

export default Vstrstat;
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
  > p {
    margin: 0;
    > span {
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
    > div {
      padding: 10px;
    }
    > .status {
      border-bottom: 1px solid #999;
      &::before {
        content: '\3000';
      }
    }
    > .time {
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
      background-image: url("../assets/icon-standing.svg");
    }
    &.icon-Wheelchair::before {
      width: 24px;
      height: 24px;
      margin-right: 14px;
      background-image: url("../assets/icon-Wheelchair.svg");
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
        content: "受付中";
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
        content: "終了";
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
td,
th {
  border-top: 1px solid #999;
  text-align: center;
}
</style>
