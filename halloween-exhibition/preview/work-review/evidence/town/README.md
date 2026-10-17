# 城下町の描画検証

PNG 6 枚は、実装した Canvas レンダラーを `@napi-rs/canvas` で直接描画したものです。スマホの CSS 寸法は 390 × 600、PC は 1280 × 720 です。城門はゲームの実際の開始位置、市場・庭園・書庫は指定座標で確認しています。

`native-town-validation.mp4` は同じ実装の移動コントローラー・当たり判定・距離に応じた仲間の画像読み込みを使った 18 秒の映像です。30 fps・540 フレームを `ffprobe` で確認後にファイルを確定しました。灯守との会話 1 回と、その後の市場通りまでの歩行を収録しています。会話枠はゲームの実際の文章を検証用 Canvas に重ねたものです。ブラウザーの画面録画ではありません。

建物の前後関係・前景の透過・地面の奥行き投影を確認できます。人物の画像自体の高さは投影でつぶしていません。10 名の町の住民はそれぞれ固有の静止画で、全身の歩行・振り向きの新しいコマはありません。既存の主人公・参加者のスプライトにも、従来からのアニメーション上の制約が残ります。

再生成には Node.js、`@napi-rs/canvas`、日本語フォントを用意します。映像には `ffmpeg` と `ffprobe` も必要です。フォントは実行時のアプリには追加しません。

```sh
TOWN_PROOF_FONT=/absolute/path/to/NotoSansCJKjp-Regular.otf node halloween-exhibition/preview/work-review/tools/render-town-proof.mjs
TOWN_PROOF_FONT=/absolute/path/to/NotoSansCJKjp-Regular.otf node halloween-exhibition/preview/work-review/tools/record-town-proof.mjs
```

`@napi-rs/canvas` が通常の Node.js 検索先にない場合は `CODEX_PRIMARY_RUNTIME_NODE_MODULES` にその依存パッケージがあるディレクトリを指定できます。出力先は `TOWN_PROOF_OUTPUT`、映像の描画倍率は `TOWN_PROOF_DPR`（1～2、既定 2）で変更できます。

これは Canvas 描画とモデルの検証です。実機ブラウザーの入力、CSS、フォーカス、音声、実際の描画速度の合格判定には使っていません。詳細は `render-method.json` と `record-method.json` に記録しています。
