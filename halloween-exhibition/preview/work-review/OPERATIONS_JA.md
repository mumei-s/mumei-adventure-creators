# 比較・再開・公開・復旧

今回の継続分の公開GitHub作業ブランチへの保存は、2026年10月17日にユーザーの明示許可を得ました。mainと既存GitHub Pagesは更新せず、比較用の作業ブランチへ保存します。

## 起点

- 基準 / 作業開始main: `e989cd523efec7a1eb72685d94ad9912ee53e06e`
- 作業ブランチ: `work/atelier-rebuild-20261017`
- GitHubリポジトリ: https://github.com/mumei-s/mumei-adventure-creators
- 作業ブランチ: https://github.com/mumei-s/mumei-adventure-creators/tree/work/atelier-rebuild-20261017
- 初回基盤コミット: `7924aabf93b3a1a2a61d44cef28e65af81522de9`。町・CNA・照合ページ追加後の最終コミットではない。最新状態は作業ブランチと `CHANGESET.json` を参照する。
- GitHub上の差分: https://github.com/mumei-s/mumei-adventure-creators/compare/e989cd523efec7a1eb72685d94ad9912ee53e06e...work%2Fatelier-rebuild-20261017
- 分離したSites作業先: https://mumei-atelier-work-review.sabosan0404.chatgpt.site
- 最新の星灯りの街: https://mumei-atelier-work-review.sabosan0404.chatgpt.site/current/halloween-exhibition/preview/town/
- 作業版の入口: https://mumei-atelier-work-review.sabosan0404.chatgpt.site/current/halloween-exhibition/preview/
- 基準版の入口: https://mumei-atelier-work-review.sabosan0404.chatgpt.site/baseline/halloween-exhibition/preview/
- ブランチURLはソースの閲覧先。上記Sitesへの配信は既存GitHub Pagesへの反映とは別。
- 既存のGitHub Pages、main、本番RPC、登録記事JSONはこの作業では更新しない。

コード・仕様書・比較動画・原画候補をローカルの作業コミットへまとめ、非公開比較版に保存する。GitHubの作業ブランチへ保存する。作業版の入口は `halloween-exhibition/preview/`。既存の宮殿探索は `maze/`、新しい星灯りの街は `town/index.html`、管理画面は `admin/`。全参加者の公式アイコンと採用画像の照合は `work-review/cast-check.html`。比較動画・全キャストのシート・計測JSONは `work-review/evidence/`。主人公の不採用v1〜v4とpromptは `work-review/assets/`、追加v3/v4の判定は `assets/OWNER_ANIMATION_V3_V4_REVIEW_JA.md`、承認されたCNAの参照と原本は `work-review/assets/cna-originals/`。主人公の不採用候補はruntimeへ採用していない。CNAは承認済み三人の配信WebPとmanifestを使用する。制作ツールと外部note/共同マガジンは既存URLを維持する。

GitHubのソース閲覧と動画再生はアプリの進行を操作しない。作業Siteは既存公開版と別originなので、既存公開版のブラウザー保存を読むことはできない。一方、作業Site内の `/baseline/` と `/current/` は同じoriginであり、既存宮殿・展示の同一保存キーを共有する。URLのパスだけでは保存は分かれない。独立した比較には別ブラウザープロファイルを使うか、以下のローカル起動で別ポートを使う。公開版の進行は自動移行しない。作業Siteとlocalhostは本番訪問カウンターの許可originに一致せず、訪問を送信しない。既存カウンターの仕様や値は変更しない。

## 作業Siteでの表示

星灯りの街の保存された表示設定がなければ3Dを選択する。`town/world-3d.js` は55度の見下ろしカメラと立体的な建物・屋根・地形・室内を描き、人物は承認済み画像のスプライトを使う。3D準備中もCanvas側で歩ける。3Dを利用できない場合やcontext loss時は2Dへ戻り、町メニューの表示設定で2D/3Dの選択と3Dの再試行を行う。2つの表示は同じsessionと町の保存を使う。

任意の景色画像の準備を、Canvasで街歩きを開始するための待機対象から外した。3D表示は期限・キャンセル・古い結果の破棄を持つ。これらは実ブラウザー/GPUでの描画や端末性能の確認済みという意味ではない。

画面フィット、枠サイズ、操作ボタン、左右位置は宮殿と町のメニューで変更できる。宮殿のボタン重なり、縮小した短い横画面の表示幅、拡大文字の行高も修正した。詳細は `SCREEN_FIT_JA.md`。

## ローカル起動

GitHubからこの作業ブランチを取得するか、冒頭の非公開比較版を使用する。リポジトリ直下で静的HTTPサーバーを起動する。

```bash
git clone --branch work/atelier-rebuild-20261017 https://github.com/mumei-s/mumei-adventure-creators.git
cd mumei-adventure-creators
python3 -m http.server 8000
```

作業版の入口は `http://localhost:8000/halloween-exhibition/preview/`。宮殿の「星灯りの街へ」から町へ、「宮殿の奥に進む…」から従来の探索へ移動する。直接開く場合は以下を使う。

| 対象 | ローカルURL |
|---|---|
| 星灯りの街 | `http://localhost:8000/halloween-exhibition/preview/town/index.html` |
| 宮殿の奥 | `http://localhost:8000/halloween-exhibition/preview/maze/` |
| 公式アイコンと採用画像 | `http://localhost:8000/halloween-exhibition/preview/work-review/cast-check.html` |
| 記事管理 | `http://localhost:8000/halloween-exhibition/preview/admin/` |

Python 3が必要で、アプリにビルドや新しいAPI設定は不要。基準コミットには新しい町とCNA三人はないため、それらは追加機能として確認し、旧版に存在したと扱わない。

基準版を同時に比較する場合は、別の端末ウィンドウでリポジトリ直下から `git worktree add ../mumei-atelier-baseline e989cd523efec7a1eb72685d94ad9912ee53e06e` を実行し、そのworktree直下で `python3 -m http.server 8001` を起動する。基準版は `http://localhost:8001/halloween-exhibition/preview/`。両方で同じ移動経路と戦闘を選ぶ。別ポートの保存は共有されない。

比較用mediaはローカルコミットと非公開比較版の `work-review/evidence/` に含め、アプリ起動時には先読みしない。native Canvas証拠の再生成は `evidence/README.md` を参照。分離したSites作業先は冒頭のURL。既存公開URLは従来の正式版のままである。

## 保存と移行

星灯りの街は `mumei:lantern-town:rpg:v1` の独立した進行、同キー末尾の `:ui` 設定、`:recovery` バックアップを使う。町の2D/3Dを切り替えても同じ記録を使い、別保存への移行や再集計は行わない。宮殿・展示・管理の保存を読替え・移行・消去しない。既存宮殿の必須6体とクリア記録を、町の2戦闘や新しい三幕の進行に置き換えない。

枠サイズ・操作ボタン倍率・左右配置は `halloween-exhibition:preview:game-display:v1` に独立して保存し、宮殿と町で共有する。保存不能時も現在の画面には反映する。町の表示方式は町の`:ui`設定に保存する。音の自動再生設定としては使用しない。

進行・設定・下書き・クリア記録の既存キーとv1 schemaを維持し、リセット/再集計/自動移行は行わない。管理画面の削除記録には、復元先の年度が後から消された場合に備え年度metadataを追加する。旧削除記録の年度がない場合は消さずに復元エラーを出す。壊れた下書きは検証済みの置き換えと保存成功まで保護する。

CNAは今回の明示承認により、記事なしの三人のプロフィールゲストを人物manifestへ追加した。登録15名・提出済み14名・未提出1名を変えず、記事URLを捏造しない。既存のarchive、catalog、住人JSON、モンスターmetadataは保持する。採用画像との照合結果は `evidence/cast-comparison/REPORT_JA.md`。

将来公開前には、管理画面で既存下書きのbackupを取得し、ブラウザーの保存領域も別途backupする。本番の保存データを比較用環境へ投入する操作は今回実施していない。

## キャッシュ

ブランチの公開shell cache定義は `mumei-atelier-shell-v36-20261018-street1:<scope>`。既存公開版へ適用したという意味ではない。更新対象のJS/CSSのみ新しい厳密なrelease queryを指定する。archive・admin・maze・町のゲーム本体と3D module・外部API・未知queryをshell cacheへ追加しない。町への入口のshellファイルと町本体のオフライン対応を混同しない。既存の `skipWaiting` / `clients.claim` を使わない方針とscopeごとの旧cache削除を維持。INSIGHTや他アプリのService Workerを削除/登録/操作しない。

## 公開前の残条件

新しい町は64×48の屋外、5屋内、三幕と2寄り道・2戦闘を持つ。全登録15名は主人公と14組の来訪者として扱う。人物画像はCNAを含め21アトラス・25実体、町の架空住人10体は別の専用静止画である。単一姿勢の住民絵を、完成した歩行アニメーションと呼ばない。

追加で指定された参考サイトは、本体の3D操作をこの環境で実行できていない。提供された19.49秒の動画の見た目は確認し、前景の遮蔽、強い光の白飛び、文字・ボタンの圧迫を踏まえて、視点の考え方を参照した。参考サイト本体の操作・性能や、町の実ブラウザー画面の合格を意味しない。

主人公原画の連続動作は、追加したv3/v4も不合格。CNAを含む全人物と町の住民への作画展開・実ブラウザー・iPhone/iPad/Android・WebGL負荷・safe areaと200%文字・通信失敗の実UI確認が未完了。Sitesの管理された実行環境の制約に従い、未提供のブラウザーを別手段で操作・追加して検証済みとすることは行っていない。この段階でmainへmergeせず、分離した作業Siteの配信と既存本番への切り替えを区別する。

最終テストの件数・合否は `test-results.txt` を参照する。旧30描画役の比較動画はCNAと町の追加前の証拠で、現在の全員を検証した記録ではない。

合格後はその時点の最新mainを再取得し、追加の正式変更を取り込んで同じ回帰検査を実行する。公開は本番データ/カウンター変更なしのcode変更だけに限定して段階確認する。問題時は採用した改修コミットをrevertして直前の正式版を再配信する。強制pushやstorage.clearでは戻さない。下書きの追加metadataは旧版が読めるが、復元前にbackupを保持する。
