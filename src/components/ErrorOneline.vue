<template>
    <div class="error-oneline">
        <div><pre>{{ errorMsgStr }}</pre></div>
    </div>
</template>

<script>
export default {
    props: {
        errorMsgStr: {
            type: String,
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
        >div {
            overflow-x: scroll; 
            &::-webkit-scrollbar {
                display: none;
            }
        }
    }
</style>

