# 南海トラッカー Ver 1.3.1 — Cloudflare常時監視版

## 現在の構成

- 既存の南海トラッカー：これまでのフロントエンドを利用。
- Render：列車詳細APIのみ。南海線の閲覧認証を廃止。監視・SQLiteを起動しないので永続ディスク不要。
- Cloudflare Worker `nankai-tracker-logger`：毎分の列車監視・ログ認証・ログ画面。
- D1 `nankai-tracker-log`：ログと照合待ちを永続保存。
- ログ画面：https://nankai-tracker-logger.youdai-tracker.workers.dev/logs.html
- ログ閲覧パスワードはCloudflareのSecretで管理します。リポジトリには保存しません。

Worker・D1・毎分Cronは今回Cloudflareへ作成・設定しています。ローカルのGit・既存フロント・Renderのコードは、下記の更新をpushして反映してください。

## 今回ユーザー側で行うこと

1. ZIPを展開し、`nankai-tracker-v1.3.1` の中身を既存 `nankai-tracker` へ追加・上書き。
2. `constants.js`・`assets`・`style.css`・`ui.js`・`train-kind.js` 等の既存ファイルは削除しない。
3. `.gitignore` に独自設定がある場合は上書きではなく項目を統合。
4. 既存フォルダでPowerShellを開いて以下を実行。

```powershell
git add .
git commit -m "Cloudflareで定期外ログを常時監視"
git push
```

前回のコミットは取り消さず、新しいコミットを重ねます。今回のserver.jsはRenderの保存先設定を要求しません。RenderのBuild Commandは `npm ci`、Start Commandは `npm start` です。Node.js 22以上が必要です（既にそれ以上なら変更不要）。

`LOG_WORKER_URL` は任意です。未設定でも今回のCloudflare URLへ転送します。古い `NANKAI_ACCESS_PASSWORD`、`LOGGER_DATA_DIR`、`LOGGER_ENABLED` は新server.jsでは使用しません。

以前の `logger/` と `test/` は残っていても動作に影響しません。今回の監視処理は `cloudflare/` にあり、Renderから旧loggerは読み込まれません。

## ログ画面

- 初回・最終確認時刻、列番、系統、最後に検証できた編成を表示。
- 日付・系統・列番・編成番号で検索。
- 各確認時刻の元データ（位置・編成など）を展開して確認。
- 検索結果と確認履歴をJSON保存。
- ログ一覧・履歴・監視状況のAPIすべてに認証が必要。ページのHTML自体にはログを含めない。

「クラウドで監視中」と最終取得時刻が更新されることを確認してください。Cronの新規設定は反映まで最大15分程度かかる場合があります。PC・ブラウザを閉じても、Cloudflare側のCronで処理します。

## 判定と保存

- 南海アプリの列車位置APIを毎分取得。30秒間隔だった旧版から1分間隔に変更。
- Hubの南海本線系統・高野線系統の平日 `weekday` と休日 `holiday` 両方と照合。
- 空港線・高師浜線・多奈川線・加太線・和歌山港線・汐見橋線・泉北線も対象。
- 通常ダイヤのどちらにもない列番を「定期外候補」として保存。試運転・臨時回送の確定判定ではない。
- 04:00 JSTを日付境界にして、運行日・系統・列番で1件にまとめる。
- `car_numbers` は編成代表番号。全車両の車番一覧とは扱わない。両数整合を確認できない値は未確認表示にし、元データは保存。
- `回` 接頭辞、数字の先頭0を正規化。運用表の内部レコード（`_`・`.`）は比較から除外。
- 同じ配信時刻は重複保存しない。編成変更・位置の履歴は各確認時刻で保存。
- 5分以上古い配信は新規記録しない。
- 運用表が利用できない場合は照合待ちとして保存し、基準が復旧してから分類。
- 大量の候補は1回最大10件、キューは最大6スナップショットずつ処理。残りを次回へ持ち越す。
- 運用表更新は15分ごとに4表のうち1表ずつ。各表は約1時間ごとに更新し、2時間以上古い基準での当日判定は保留。
- 改正日の一覧から対象日以前の最新ダイヤを選択。過去改正の取得済み基準は残す。
- 通常ダイヤと同じ列番を臨時列車が再利用した場合は検出できない。APIに出ない列車、毎分の取得の間に出現して消えた列車、障害中に取得できなかった列車は記録できない。

## 無料枠と運用

課金プランへの変更は行っていません。Cloudflareの無料枠にはCPU時間・リクエスト・D1読み書き・容量の上限があります。上限に達すると処理が失敗し、監視に欠落が生じる場合があります。

通常運用での件数だけでなく、異常な列番が大量発生した場合やHub障害で照合待ちが増えた場合も、Cloudflareの利用量を確認してください。ログ・照合待ちの自動削除は行いません。

## 将来コードを更新する場合

CloudflareへのCLI公開は、既に今回のプラグイン経由で公開したものを更新するための手段です。初回に再作成する必要はありません。

```powershell
cd cloudflare
npm ci
npx wrangler login
npm run deploy
```

`wrangler.jsonc` には今回のアカウントID・D1 IDを設定済みで、Git管理からは除外しています。共有用テンプレートは `wrangler.example.jsonc`。

`npm run deploy` は公開Workerを更新し、D1データは残します。Secretはwranglerの通常更新で保持されます。パスワードを変更する場合だけ：

```powershell
npx wrangler secret put LOG_ACCESS_PASSWORD
```

初期基準を手動で再取得する場合：

```powershell
node prepare-baseline.mjs
npx wrangler d1 execute nankai-tracker-log --remote --file baseline-seed.sql
```

この操作は基準テーブルを更新するだけで、列車ログは削除しません。

## 検証

- 自動テスト11件：正常列番除外、系統分離、重複抑止、編成変更・欠損、照合障害と復旧、古い配信、処理分割、キュー追いつき、DB書込み失敗の原子性、認証、定期実行の二重処理抑止、Render公開API。
- workerd＋ローカルD1：テスト列車・実取得した通常ダイヤを用いて、定期実行→保存→認証→一覧→履歴→監視状況まで確認。
- Wrangler公開用ビルド確認。
- 本番にテスト列車は投入していません。
- ブラウザ画面の見た目・クリック操作はこの環境では未確認です。

## 公式資料

https://developers.cloudflare.com/workers/configuration/cron-triggers/
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/d1/platform/pricing/
https://developers.cloudflare.com/d1/get-started/
