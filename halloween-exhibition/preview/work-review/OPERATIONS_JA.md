# 比較・再開・公開・復旧

## 起点

- 基準 / 作業開始main: `e989cd523efec7a1eb72685d94ad9912ee53e06e`
- 作業ブランチ: `work/atelier-rebuild-20261017`
- 比較用Site: https://mumei-atelier-work-review.sabosan0404.chatgpt.site/
- 既存のGitHub Pages、main、本番RPC、登録記事JSONはこの作業では更新しない。

比較Siteの `baseline/halloween-exhibition/preview/` が基準版、`current/halloween-exhibition/preview/` が作業版。管理画面はそれぞれの `admin/`、ゲームは `maze/`。制作ツールへのリンクは元のGitHub Pagesへ案内する。外部note/共同マガジンリンクは実URLのまま。

比較Siteは別originであり、公開版のブラウザー保存を読むことはできない。基準版と作業版は同じ比較origin内で既存保存キーを使うため、進行・設定を共有する。完全に別のテスト進行で比較したい場合は別ブラウザープロファイルを使う。公開版の進行が自動移行されるとは案内しない。比較Siteは本番訪問カウンターの許可originと一致しないため訪問を送信しない。既存カウンターの仕様や値を移行しない。

## ローカル起動

リポジトリをこのブランチで開き、静的HTTPサーバーのルートにする。例: `python3 -m http.server 8000`。`http://localhost:8000/halloween-exhibition/preview/`、`maze/`、`admin/` を開く。比較用mediaは比較Siteに保存され、アプリ本体の起動には不要。native Canvas証拠の再生成方法は `evidence/README.md` を参照。

## 保存と移行

進行・設定・下書き・クリア記録の既存キーとv1 schemaを維持し、リセット/再集計/自動移行は行わない。管理画面の削除記録には、復元先の年度が後から消された場合に備え年度metadataを追加する。旧削除記録の年度がない場合は消さずに復元エラーを出す。壊れた下書きは検証済みの置き換えと保存成功まで保護する。

将来公開前には、管理画面で既存下書きのbackupを取得し、ブラウザーの保存領域も別途backupする。本番値を比較サイトへ投入する操作は今回実施していない。

## キャッシュ

公開shell cacheを `mumei-atelier-shell-v31-20261017-review1:<scope>` へ更新。更新対象のJS/CSSのみ新しい厳密なrelease queryを指定する。archive・admin・maze・外部API・未知queryをshell cacheへ追加しない。既存の `skipWaiting` / `clients.claim` を使わない方針とscopeごとの旧cache削除を維持。INSIGHTや他アプリのService Workerを削除/登録/操作しない。

## 公開前の残条件

主人公原画の連続動作が不合格で、全キャストへの展開・実ブラウザー・iPhone/iPad/Android・WebGL負荷・safe areaと200%文字・通信失敗の実UI確認が未完了。この段階でmainへmergeしない。公開の承認は比較評価と別に行う。

合格後はその時点の最新mainを再取得し、追加の正式変更を取り込んで同じ回帰検査を実行する。公開は本番データ/カウンター変更なしのcode変更だけに限定して段階確認する。問題時は採用した改修コミットをrevertして直前の正式版を再配信する。強制pushやstorage.clearでは戻さない。下書きの追加metadataは旧版が読めるが、復元前にbackupを保持する。
