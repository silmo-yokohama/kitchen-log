# レシピ登録ワークフロー

このリポジトリでレシピを登録する際は、必ず `/new-recipe` コマンドを使う。手作業でJSONを書かない。

## 4つの入口

レシピの元情報は次の4種類のいずれかから得る。どの入口でも、最終的には同じ `recipeSchema`（`viewer/src/schemas/recipe.ts`）に準拠したJSONに変換する。

1. **cookgo**: CookGoアプリの共有機能で得られる共有URL（`cookgo.life/ja/share/...`）を標準とする。WebFetchでレシピ名・人前・材料（分量・単位）・手順全文・栄養表示までテキストとして取得できる（検証実績は`docs/workflows/recipe-site-compatibility.md`参照。栄養価は表示値に依存せず`nutrition-rules.md`で自前算出する）。取得したURLは`source.url`に記録する。共有URLが使えない場合のみ、従来の共有→PDF出力（画像ベースのPDF）にフォールバックし、内容を読み上げてもらうか画像を直接解析して材料・手順を復元する
2. **url**: レシピサイトのURL。WebFetchで取得できる範囲の情報を元にする。取得可否の実績は`docs/workflows/recipe-site-compatibility.md`を参照。YouTube等の動画プラットフォームは概要欄・字幕がWebFetchで取得できないため対象外とし、動画ベースのレシピは最初からテキスト貼り付け（type: text）に切り替えるようユーザーに伝える（ログイン必須のInstagram等も同様に対象外）。取得したURLは`source.url`に記録する
3. **text**: ユーザーが貼り付けた生のテキスト（材料・手順の書き出し等）
4. **zero**: 冷蔵庫の中身や気分等から、ゼロベースで相談しながら組み立てる。ヒアリング・提案の詳細な流れは後述の「zero入口のヒアリングと提案」を参照

## zero入口のヒアリングと提案

1. まず、その料理特有の分岐軸（辛さ・本格度・系統・食感の好み等、料理によって異なる）についてユーザーにヒアリングする
2. ヒアリングの回答だけで組み立てに十分な情報が揃っていれば、そのまま組み立てに進む
3. 回答が曖昧、またはユーザーが決めきれない事柄がある場合は、ユーザーからの明示的な依頼（「提案して」等）を待たず、Claude自身の判断で調べる。`WebSearch`（`allowed_domains`に`recipe-site-compatibility.md`記載のドメインを指定）や一般知識を組み合わせ、`profile.md`の好みに沿った具体的な提案を行う
4. 特定の1件を強く参考にした場合でも`source.type`は`zero`のままとし、参考にしたレシピのURLは`source.url`に記録する

## `source`フィールドの使い分け

- `source.url`: 出典となる1つのURL（`url`入口・`cookgo`入口で取得したページ、または`zero`入口で強く参考にしたページ）。ビューアでリンクを張れるよう、URL単体で機械可読な形にしておく
- `source.note`: そのレシピがどのようなやり取りで生まれたか（相談の内容、アレンジの経緯、CookGoからの補足情報等）を書く自由記述。URLを書く場所ではない

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
5. `ingredientSections`（フェーズ別・id付き）と `stepSections`（下ごしらえ／調理／盛り付け等のフェーズ別、`{{id}}` 参照）を組み立てる。手順文は `step-writing-guidelines.md` に従う
6. `nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance` を記述する
7. ユーザーに確定前レビューを提示する
8. 確定後、`recipes/<id>.json` として保存する
9. `/merge-recipe` を呼び出し、ブランチ作成からmasterへのマージまでを行う（手順の詳細は `.claude/commands/merge-recipe.md` 参照）

> **決定事項（Step1実地検証より）**: push後の運用は「ブランチ＋PR経由」に確定した。`master`には保護ルールがなく直接pushも技術的には可能だが、Step0・Step1双方の実運用でブランチ＋PR方式に収束したため、これを正式ルールとする。マージまでの具体的な手順は `/merge-recipe` コマンドに切り出し、レシピ登録以外の変更（ドキュメント修正等）でも再利用できるようにしている。

## 既存レシピの編集

登録済みレシピの内容を変更する（アレンジの反映・分量調整・誤記修正等）ときは、次の流れで行う。新規登録と違い、テンプレートのコピーは行わない。

1. 対象の `recipes/<id>.json` を読み込み、変更内容をユーザーと確認する
2. `profile.md` と `naming-conventions.md` に沿って編集する。`id`・ファイル名・`createdAt` は変更しない
3. `updatedAt` を編集当日の日付（YYYY-MM-DD）に更新する
4. ユーザーに確定前レビューを提示する
5. 確定後、`/merge-recipe` を呼び出す（スキーマ検証は `/merge-recipe` の手順に含まれる）
