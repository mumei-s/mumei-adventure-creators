# 主人公の分割原画・動作確認

正面寄りの新しい分割原画と `createOwnerRig` / `drawOwnerPose` を、native Canvasで実際に組み立てた確認資料です。ブラウザー・DOM・WebGL/GPU・端末の録画ではありません。全方向・全キャストの合格証明にも使用しません。

- [76px / 86px の動作一覧](owner-rig-contact-sheet.png)
- [動作動画 MP4](owner-rig-native-review.mp4) / [GIF](owner-rig-native-review.gif)
- [入力・計測・出典ハッシュ](native-review-method.json)
- [ブラウザーで操作する確認ページ](../../rig-check.html)

約11.5秒の決められた入力で、正面の歩行、急停止、停止したまま右を向く操作、右への歩行、正面へ戻る操作、攻撃の準備から復帰までを並べます。原画がない向きは `MISSING VIEW` と明記します。正面絵を表示し続けることを向き直り原画の完成とは扱いません。

大きさはゲームと同じ `contentHeight` に対する76px / 86px指定です。透過画素を除いた実際の描画範囲もJSONに記録します。現在の正面待機では75px / 85pxで、床の基準に対して靴底は約1px上です。緑の点は接地、輪の点は移動中の足です。床の目印と合わせて支持足の位置を確認できます。

最初の組み立てでは膝が外に張り、靴が中央で交差していました。骨盤の高さ、3Dの膝曲げ、靴底の端点、前髪の取付位置を調整した後、76px / 86pxの正面歩行・停止・攻撃では目立つ肩・腰・膝の隙間がなく、支持足の交替とランタンの保持を確認しました。正面試作として別方向の作画へ進むための確認であり、右・左・後ろや全員への展開を承認したという意味ではありません。

支持足が両方なくなる向き直りから攻撃への切り替えも、共有した入力列で検査します。最新の数値、元画像・manifest・runtimeのSHA256は `native-review-method.json` を正とします。runtimeを変更した後の古い動画を、変更後の証拠に流用しません。

再生成は `work-review/tools/render-rig-proof.mjs` に、絶対パスの `--runtime`、`--manifest`、`--atlas`、`--output` を指定します。ゲームの統合検査は `work-review/tools/verify-town-app.mjs` です。後者は実際のappイベント・controller・画像decode・Canvas描画・Threeの場面計算を使いますが、DOM・dialog・寸法・時計・GPU描画部分は模擬しています。
