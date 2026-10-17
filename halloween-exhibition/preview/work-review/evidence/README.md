# Canvas比較動画・素材評価の証拠

コードと資料の正本はGitHubの[作業ブランチ](https://github.com/mumei-s/mumei-adventure-creators/tree/work/atelier-rebuild-20261017)。このフォルダーに比較動画・原画シート・計測JSONをまとめる。実装レビューの起点は `7924aabf93b3a1a2a61d44cef28e65af81522de9`、比較基準は `e989cd523efec7a1eb72685d94ad9912ee53e06e`。ライブのGitHub Pages比較URLはまだない。動くアプリはブランチを取得し、`../OPERATIONS_JA.md` の静的HTTPサーバー手順で起動する。

- `exploration-comparison.mp4`：実際のcreateStageRenderer。基準/作業版それぞれ390×420、同じ方向入力と速度上限、12秒。
- `special-move-comparison.mp4`：実際のbattle-sceneと必殺技の経過、6秒。
- `castle-cast-comparison.mp4`：同梱宮殿画像と実際のdrawCastleCast、8秒。ブラウザーの門やCSS演出ではない。
- `all-cast-review.mp4`：18キャスト＋架空住人2＋敵10、各8秒、計240秒。個別動画は再生成時に`cast-clips/`へ出力する（GitHubには全体動画を収録）。
- `contacts/`：各アトラスの方向・歩行4姿勢・計測した接地点。`all-cast-overview.png`は全体一覧。
- `measurements.json`：ソース/画像/動画のhash、ファイルbytes、RGBA換算、native Canvas CPU時間、全34動画の最終ffprobe検査。

**全キャストの動作合格ではない。** 4姿勢の歩行原画と方向転換不足をそのまま示している。ブラウザー、iPhone/iPad/Android、DOM/CSS、WebGL/GPU、音、端末fpsをこの動画で検証したとは扱わない。

上側の人物は、390px幅のゲーム描画に合わせた75pxの体高。下側は明示した2倍の詳細表示。原画は変更せず、中間動作の捏造や二重体の補間を入れていない。日本語表示には公式notofontsのNoto Sans CJK JP（SIL OFL 1.1）を証拠生成時だけ使用し、runtimeには同梱していない。取得元・hash・ライセンス出典は計測JSONに記録した。

## 再生成

Node.js、`@napi-rs/canvas`、ffmpeg、基準コミットをcheckoutした別worktreeを用意する。`CODEX_PRIMARY_RUNTIME_NODE_MODULES`はcanvasを含むnode_modules、`EVIDENCE_CJK_FONT`は公式NotoSansCJKjp-Regular.otfを指す。リポジトリ直下で実行する。

```bash
node --expose-gc halloween-exhibition/preview/work-review/tools/render-evidence.mjs /path/to/baseline-repo
```

生成器は `../tools/render-evidence.mjs`。全18人物を一括デコードせず、探索では近傍3役＋主人公＋猫、各素材の評価では1役ずつ処理する。Canvas CPU時間には画像decode、encoder、DOM、GPUを含めない。単一経路の数値から、実端末の60fpsや統計的な高速化を断定しない。
