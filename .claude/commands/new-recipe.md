---
description: 4つの入口（CookGo/URL/テキスト/ゼロベース）のいずれかからレシピを登録する
---

以下の手順を、省略せず順番通りに実行すること。作業を始める前に、これから何をどう進めるかを一言ユーザーに伝えてからツールを使い始める（無言でツール実行から入らない）。詳細ルールは `docs/workflows/authoring-workflow.md` を参照。

1. 新規登録か既存レシピの編集かを確認する。編集の場合は `docs/workflows/authoring-workflow.md` の「既存レシピの編集」の流れに切り替える。新規登録の場合、ユーザーに入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
2. `profile.md` を読み、好みを確認する
3. 組み立て・栄養計算に入る前に中間確認を行う（`docs/workflows/authoring-workflow.md` の「中間確認（組み立て前のサニティチェック）」参照）。元レシピの人前表記を鵜呑みにせず具材総量から実質の人前を確認し、料理の常識に合わない点は質問で解消し、食材を差し替える場合はその波及（下味・調理法）も点検して、分量・構成の方針についてユーザーの合意を得る
4. `recipes/*.json` をGrepし、食材名・タグの表記を既存のものに合わせる
5. 新規レシピは `docs/workflows/recipe-template.json` をコピーして作成する（既存の別レシピファイルのコピーは禁止）
6. `ingredientSections`（フェーズ別・id付き）と `stepSections`（下ごしらえ／調理／盛り付け等のフェーズ別、`{{id}}`参照、`docs/workflows/step-writing-guidelines.md`準拠）を組み立てる
7. `docs/workflows/nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance`を記述する
8. ユーザーに確定前レビューを提示し、承認を得る
9. 承認後、`recipes/<id>.json` に保存する
10. `/merge-recipe` を呼び出し、ブランチ作成からmasterへのマージまでを行う
