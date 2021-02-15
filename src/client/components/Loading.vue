<template>
  <transition name="loading">
    <div class="loading-mask">
      <div class="loading-wrapper">
        <div class="loading-container">
          <div class="loading-header">
            <h3>{{ $store.state.loadingMsg }}</h3>
          </div>
          <div class="loading-body">
            <div class="v-spinner">
              <div class="v-ring v-ring1">
                <div class="v-ring v-ring2"></div>
                <div class="v-ring v-ring3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>


<script lang="ts">
import Vue from 'vue';

export default Vue.extend({});
</script>


<style lang="scss" scoped>
.loading-mask {
  position: fixed;
  z-index: 997;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: table;
  transition: opacity 0.3s ease;
}

.loading-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.loading-container {
  width: 80%;
  margin: 0px auto;
  padding: 20px 30px;
  transition: all 0.3s ease;
  font-family: Helvetica, Arial, sans-serif;
  text-align: center;
}

.loading-header h3 {
  margin-top: 0;
  font-size: 30px;
  color: #fff;
}

.loading-body {
  margin: 20px 0;
  font-size: 20px;
}

.loading-enter,
.loading-leave-active {
  opacity: 0;
}

.loading-enter .loading-container,
.loading-leave-active .loading-container {
  transform: scale(1.1);
}

.v-spinner {
  width: 128px;
  height: 128px;
  margin: auto;
  .v-ring1 {
    height: 100%;
    width: 100%;
    position: relative;
  }
  .v-ring2,
  .v-ring3 {
    height: 100%;
    width: 100%;
    border: 12px solid #fff;
    border-radius: 100%;
    animation-fill-mode: forwards;
    perspective: 800px;
    position: absolute;
    top: 0;
    left: 0;
  }
  .v-ring2 {
    animation: v-ringRightRotate 2s 0s infinite linear;
  }
  .v-ring3 {
    animation: v-ringLeftRotate 2s 0s infinite linear;
  }
}
@keyframes v-ringRightRotate {
  0% {
    opacity: 0.2;
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  100% {
    opacity: 0.8;
    transform: rotateX(180deg) rotateY(360deg) rotateZ(360deg);
  }
}
@keyframes v-ringLeftRotate {
  0% {
    opacity: 0.8;
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  100% {
    opacity: 0.2;
    transform: rotateX(360deg) rotateY(180deg) rotateZ(360deg);
  }
}
</style>
