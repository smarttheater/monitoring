<template>
<span class="clock"><span>{{ $store.state.moment.format('HH') }}<span class="colon">:</span>{{ $store.state.moment.format('mm') }}</span></span>
</template>

<script>
export default {};
</script>

<style>
@keyframes blink {
    0% {
        opacity: 0;
    }
    50% {
        opacity: 0;
    }
    51% {
        opacity: 1;
    }
    100% {
        opacity: 1;
    }
}
.colon {
    animation-name: blink;
    animation-duration: 1s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
}


</style>
