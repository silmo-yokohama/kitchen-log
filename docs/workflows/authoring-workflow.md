# レシピ登録ワークフロー

このリポジトリでレシピを登録する際は、必ず `/new-recipe` コマンドを使う。手作業でJSONを書かない。

## 4つの入口

レシピの元情報は次の4種類のいずれかから得る。どの入口でも、最終的には同じ `recipeSchema`（`viewer/src/schemas/recipe.ts`）に準拠したJSONに変換する。

1. **cookgo**: CookGoアプリの共有→PDF出力を経由して渡された画像ベースのPDF。文字として読み取れないため、内容を読み上げてもらうか、画像を直接解析して材料・手順を復元する
2. **url**: レシピサイトやYouTube等のURL。WebFetchで取得できる範囲の情報を元にする。ログイン必須のプラットフォーム（Instagram等)は直接読めないため、その場合はテキスト貼り付け（type: text）に切り替えるようユーザーに伝える
3. **text**: ユーザーが貼り付けた生のテキスト（材料・手順の書き出し等）
4. **zero**: 冷蔵庫の中身や気分等から、ゼロベースで相談しながら組み立てる

## ユーザーとの会話ルール

レシピ内容についてユーザーに質問・説明・確認を行う際は、常に料理の言葉（味・分量・食材・呼び方）に翻訳して伝える。`dish`/`tags`/`id`/`ingredientSections`等のJSONプロパティ名やスキーマ上の識別子・値をそのままユーザーに見せて判断を求めない。

- 悪い例:「`dish`は`butamaki`でよいか、`shin-shoga-butamaki`にするか」
- 良い例:「今後『えのき豚巻き』のような同じ系統の料理が増えたときにまとめて探せるようにしたいので、これは“豚巻き”という大きなくくりにしますね」

id・ファイル名・スキーマ上の型などの実装上の詳細はClaude Codeが判断し、ユーザーには結果や理由だけを料理の言葉で伝える。

## 登録の流れ

1. 入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
2. `profile.md` を読み、清水・パートナー・共通の好みを確認する
3. `recipes/*.json` を Grep し、食材名・タグの表記を既存のものに合わせる（`naming-conventions.md` 参照）
4. 新規レシピは `docs/workflows/recipe-template.json` をコピーして作成する（既存の別レシピファイルのコピーは禁止。`naming-conventions.md` 参照）
5. `ingredientSections`（フェーズ別・id付き）と `steps`（`{{id}}` 参照）を組み立てる。手順文は `step-writing-guidelines.md` に従う
6. `nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance` を記述する
7. ユーザーに確定前レビューを提示する
8. 確定後、`recipes/<id>.json` として保存し、`git add` / `git commit` する。`master` に直接pushせず、`recipe/<id>` のような新規ブランチへpushしてPRを作成する（クラウド環境が自動でPRを作成しない場合は `gh pr create` を使う）
9. スキーマ検証はGitHub ActionsのCIがPR上で自動的に行う（ローカルでの検証実行は行わない）。CIがgreenになったことを確認する
10. ユーザーに最終承認を得た上で、`gh pr merge` でマージする。自動マージはせず、マージの都度ユーザーの確認を経る

> **決定事項（Step1実地検証より）**: push後の運用は「ブランチ＋PR経由」に確定した。`master`には保護ルールがなく直接pushも技術的には可能だが、Step0・Step1双方の実運用でブランチ＋PR方式に収束したため、これを正式ルールとする。
