<template>
<header>
    <div class="inner">
        <h1><img src="../assets/logo.png"></h1>
        <nav><slot name="headerMenu"></slot></nav>
    </div>
</header>
</template>

<script>
export default {
};
</script>

<style lang="scss">
header {
    position: fixed;
    z-index: 999;
    top: 0;
    left: 0;
    display: table;
    min-width: 768px;
    width: 100%;
    height: 60px;
    background-color:#f9f9f9;
    border-bottom: 2px solid #c00;
    .inner {
        margin: auto;
        user-select: none;
        >h1 {
            float: left;
            width: 160px;
            margin: 0 4px;
            >img {
                vertical-align: middle;
            }
        }
        >nav {
            float: right;
            height: 60px;
        }
        &:before,
        &:after {
            content: ' ';
            display: table;
        }
        &:after {
            clear: both;
        }
    }
}

.statheadermenu {
    display: table;
    width: 100%;
    height: 100%;
    >div {
        display: table-cell;
        vertical-align: middle;
    }
    .lastupdate {
        padding: 0 1em;
        background-color: #f9fafa;
        border-left: 1px solid #bcbcbc;
        >span {
            font-weight: bold;
        }
    }
    .btn-update {
        cursor: pointer;
        background-color: #727272;
        color: #fff;
        user-select: none;
        width: 130px;
        text-align: center;
        &:hover {
            background-color: #828282;
        }
        &::before {
            content: '';
            display: inline-block;
            vertical-align: middle;
            margin-right: 10px;
            width: 36px;
            height: 36px;
            background: url('../assets/icon-refresh.svg') no-repeat;
            background-size: cover;
        }
    }
}

</style>
