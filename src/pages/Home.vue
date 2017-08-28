<template>
<div class="content">
    <myHeader></myHeader>
    <div class="menu">
        <ul>
            <li>[現場スタッフ用]
                <ul>
                    <li><router-link to="/rsrvstat"><span>予約状況確認画面</span></router-link></li>
                    <li><router-link to="/vstrstat"><span>来塔状況確認画面</span></router-link></li>
                </ul>
            </li>
            <li>[サイネージ]<br>
                <ul>
                </ul>
            </li>
        </ul>
    </div>
</div>
</template>

<script>
export default {
};
</script>

<style lang="scss" scoped>
    .menu{
        padding: 20px;
    }
    ul {
        font-size: 2em;
        margin-bottom: 1em;
        li {
            list-style-type: square;
            a {
                color: #a3bad2;
                text-decoration: none;
                &:hover {
                    text-decoration: underline;
                }
            }
            ul {
                font-size: 1em;
            }
        }
    }
</style>
