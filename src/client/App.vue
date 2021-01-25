<template>

<div id="app" :class="{ noscroll: ($route.meta.noscroll) }">
    <loading v-if="$store.state.loadingMsg"></loading>

    <transition name="fadeup">
        <router-view></router-view>
    </transition>
</div>

</template>

<script>
export default {
    components: {
        Loading: require('./components/Loading.vue').default,
    },
};

</script>

<style lang="scss">
* {
    box-sizing: border-box;
    font-family: sans-serif;
}

.iconBefore {
    &::before {
        content: '';
        display: inline-block;
        background-size: cover;
        background-repeat: no-repeat;
    }
}

img {
    max-width: 100%;
}

html {
    overflow: auto;
}

html,
body {
    min-width: 768px;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    background-color: #fff;
}

#app {
    position: relative;
    height: 100%;
    &.noscroll {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }
}

.content {
    position: relative;
    padding-top: 62px;
}

.clock {
    display: inline-block;
    vertical-align: sub;
    font-weight: bold;
    margin: 0 10px;
}
.icon-clock {
    &::before {
        background-image: url('./assets/icon-clock.svg');
    }
}
.fade-leave-to {
    display: none;
}
.fade-enter-active, .fade-leave-active {
    transition: all 1s;
}
.fade-enter, .fade-leave-active {
    opacity: 0;
}

.fadeup-leave-to {
    display: none;
}
.fadeup-enter-active, .fadeup-leave-active {
    transition: all 0.4s;
}
.fadeup-enter, .fadeup-leave-active {
    opacity: 0;
    transform: translateY(25px);
}

</style>
