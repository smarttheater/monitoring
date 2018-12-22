# frontend_tttsutil
> 東京電波塔-現場スタッフ用画面フロントエンド
- Vue-Cliのwebpackテンプレートを元に作成したSPA
- 使用領域 = 
-- POS横設置端末での予約状況照会
-- 案内スタッフ支給iPadでの来塔客通過状況確認

### アプリ設定
configを設置先の環境変数から変えられた方がよいということで
buildされたアプリはPHPファイル (`/static/config/prd.php`) 経由で必要な環境変数を読み込む
(開発時はローカルのjson (`/static/config/dev.json`) が読まれる。(この処理は `/src/store` 内で分岐している)
※値は全て必須で空のものがあるとエラー終了
| Name                                   | Required | Purpose                               |
| -------------------------------------  | -------- | ------------------------------------- |
| `API_STATUS_ENDPOINT`                  | true     | 現況APIエンドポイント                      |
| `API_CHECKPOINTDIFINITION_ENDPOINT`    | true     | チェックイン場所定義APIエンドポイント         |
| `API_TIMEOUT`                          | true     | APIタイムアウト時間(ms)                   |
| `VSTRSTAT_CONCERNED_CATEGORYCODE_ARRAY`| true     | 来塔状況画面で一般と分けて表示する`ticketType`を記述 (カンマ区切り、クォーテーション無し)  |
| `VSTRSTAT_CHECKPOINT_TARGETWHERE_ARRAY`| true     | 来塔状況画面で表示するチェックイン場所の`where`を記述 (カンマ区切り、クォーテーション無し)  |

### その他
`/toRootDir`に入れたファイルはドキュメントルートになる`dist`にそのままコピーされる (Web.configなどはここに入れる)

## Build Setup
precommitで`npm run build && git add --all`させることで`dist`は常に最新の状態にする

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
