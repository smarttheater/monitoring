# frontend_tttsutil

> 東京電波塔-現場スタッフ用画面フロントエンド
- Vue-Cliのwebpackテンプレートを元に作成したSPA(デプロイするのはdistに生成される完全な静的ファイルのみ)
- 使用領域 = 
-- POS横設置端末での予約状況照会
-- 案内スタッフ支給iPadでの来塔客通過状況確認
-- サイネージその他汎用？
- ※設置パスはドメインルート前提だが変更する場合は/config/index.jsの"assetsPublicPath"を変更してbuild

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
