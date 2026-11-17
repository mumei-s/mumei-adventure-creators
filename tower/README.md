# Atelier Tower

無名S noteの参加型マンション。サイトは既存のGitHub Pagesの `/tower/` で公開されます。星灯りの街と相互に移動できます。

- 12階×12室。IDで内装を下見し、任意の空室か先着の空室へ入居します。
- noteの自己紹介に一時コードを入れて公開します。確認用コードとブラウザの鍵は別々に発行します。本人確認済みの鍵でのみ改装、ゲスト先への訪問スタンプ、退去ができます。
- 鍵を再発行すると旧鍵が失効します。退去は部屋・画像・スタンプを削除し、空室を戻します。
- 公開記事の一覧は入居、鍵の再発行、改装時の明示的な更新で取得します。

## 運用

Pagesの公開対象はルートの `scripts/stage-pages.mjs` で管理します。`tower/supabase/` は公開サイトに含まれません。既存のAtelierのSupabaseプロジェクトで `supabase/migrations/` のマイグレーションを適用し、`creator-tower` Edge Functionを `verify_jwt = false` でデプロイします。公開閲覧以外のアクセスはEdge Functionが目的別に判定し、データベースではROOM IDと鍵のハッシュを検証します。サービス用の鍵にはEdge Functionの環境変数を使用します。

ローカルで画面を見るには、リポジトリのルートで `python3 -m http.server 8000` を実行し、`http://localhost:8000/tower/` を開きます。APIは本番につながります。

公開プロフィールと本棚の取得にはnoteの公開エンドポイントを使用しています。仕様が変わった場合はEdge Functionの `publicAccount` と `profileWithArticles` を確認してください。
