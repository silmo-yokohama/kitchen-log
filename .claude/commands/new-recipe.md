---
description: 4つの入口（CookGo/URL/テキスト/ゼロベース）のいずれかからレシピを登録する
---

以下の手順を、省略せず順番通りに実行すること。詳細ルールは `docs/workflows/authoring-workflow.md` を参照。

1. 新規登録か既存レシピの編集かを確認する。編集の場合は `docs/workflows/authoring-workflow.md` の「既存レシピの編集」の流れに切り替える。新規登録の場合、ユーザーに入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
2. `profile.md` を読み、好みを確認する
3. `recipes/*.json` をGrepし、食材名・タグの表記を既存のものに合わせる
4. 新規レシピは `docs/workflows/recipe-template.json` をコピーして作成する（既存の別レシピファイルのコピーは禁止）
5. `ingredientSections`（フェーズ別・id付き）と `stepSections`（下ごしらえ／調理／盛り付け等のフェーズ別、`{{id}}`参照、`docs/workflows/step-writing-guidelines.md`準拠）を組み立てる
6. `docs/workflows/nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance`を記述する
7. ユーザーに確定前レビューを提示し、承認を得る
8. 承認後、`recipes/<id>.json` に保存する
9. `/merge-recipe` を呼び出し、ブランチ作成からmasterへのマージまでを行う
