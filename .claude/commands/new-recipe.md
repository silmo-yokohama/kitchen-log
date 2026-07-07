---
description: 4つの入口（CookGo/URL/テキスト/ゼロベース）のいずれかからレシピを登録する
---

以下の手順を、省略せず順番通りに実行すること。詳細ルールは `docs/workflows/authoring-workflow.md` を参照。

1. ユーザーに入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
2. `profile.md` を読み、好みを確認する
3. `recipes/*.json` をGrepし、食材名・タグの表記を既存のものに合わせる
4. `ingredientSections`（フェーズ別・id付き）と `steps`（`{{id}}`参照、`docs/workflows/step-writing-guidelines.md`準拠）を組み立てる
5. `docs/workflows/nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance`を記述する
6. `npm run validate:recipes --prefix viewer` を実行し、失敗した場合は修正して再実行する
7. ユーザーに確定前レビューを提示し、承認を得る
8. 承認後、`recipes/<id>.json` に保存し、`git add` と `git commit` を行う
