# レシピ登録ワークフロー

このリポジトリでレシピを登録する際は、必ず `/new-recipe` コマンドを使う。手作業でJSONを書かない。

## 4つの入口

レシピの元情報は次の4種類のいずれかから得る。どの入口でも、最終的には同じ `recipeSchema`（`viewer/src/schemas/recipe.ts`）に準拠したJSONに変換する。

1. **cookgo**: CookGoアプリの共有→PDF出力を経由して渡された画像ベースのPDF。文字として読み取れないため、内容を読み上げてもらうか、画像を直接解析して材料・手順を復元する
2. **url**: レシピサイトやYouTube等のURL。WebFetchで取得できる範囲の情報を元にする。ログイン必須のプラットフォーム（Instagram等)は直接読めないため、その場合はテキスト貼り付け（type: text）に切り替えるようユーザーに伝える
3. **text**: ユーザーが貼り付けた生のテキスト（材料・手順の書き出し等）
4. **zero**: 冷蔵庫の中身や気分等から、ゼロベースで相談しながら組み立てる

## 登録の流れ

1. 入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
2. `profile.md` を読み、清水・パートナー・共通の好みを確認する
3. `recipes/*.json` を Grep し、食材名・タグの表記を既存のものに合わせる（`naming-conventions.md` 参照）
4. `ingredientSections`（フェーズ別・id付き）と `steps`（`{{id}}` 参照）を組み立てる。手順文は `step-writing-guidelines.md` に従う
5. `nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance` を記述する
6. `npm run validate:recipes --prefix viewer` を実行し、スキーマ検証を通す
7. ユーザーに確定前レビューを提示する
8. 確定後、`recipes/<id>.json` として保存し、`git add` / `git commit` する
