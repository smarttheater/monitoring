<template>
    <div class="error-oneline">
        <div><p>{{ errorMsgStr }}</p></div>
    </div>
</template>

<script>
export default {
    props: {
        errorMsgStr: {
            type: String,
            required: true,
        },
    },
};
</script>

<style lang="scss">
    .error-oneline {
        background-color: yellow;
        border:1px solid #ccc;
        padding: 0 1em;
        font-weight: bold;
        font-size: 0.9em;
    }
</style>

