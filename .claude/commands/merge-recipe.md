---
description: 確定済みの変更（レシピJSON・ドキュメント等）をブランチ作成からmasterへのマージまで一貫して処理する
---

`/new-recipe` でレシピが確定した直後、またはその他のドキュメント変更が確定した直後に呼び出される。以下の手順を省略せず順番通りに実行すること。

1. `git status` で変更内容を確認する
2. 変更が `recipes/**` / `masters/**` / `profile.md` / `docs/**` / `.claude/**` など想定範囲に収まっているか確認する（レシピ登録で新しいカテゴリー・素材・タグを使う場合、`masters/taxonomy.json` の変更は正常な範囲）。`viewer/src` 等のAstroアプリのコードに意図しない変更が含まれていたら、そこで止めてユーザーに報告する（レシピ確定作業でアプリのコードが変わることは想定されていない）
3. レシピJSONまたは `masters/taxonomy.json` に変更があれば、`npm run validate:recipes --prefix viewer` を実行してスキーマ検証する（マスタの値を改名・削除すると既存レシピの検証が壊れるため、マスタのみの変更でも必ず実行する）。`viewer/node_modules` の存在確認は `test -d viewer/node_modules && echo exists || echo missing` のように結果が明示的に出力される形で行う（`ls` の出力が空なだけでは有無を判定できないため）。無い場合は `npm ci --prefix viewer` で依存を導入してから実行する（`npm install` は `package-lock.json` を書き換えて無関係な差分を生むことがあるため使わない）。それも難しい環境では、各ファイルを読み込んでJSONとしてパースできるか確認した上で、スキーマ検証はCIに委ねる。検証・パースに失敗したら、そこで止めてユーザーに報告する
4. 内容が分かるブランチ名を作成する（レシピ登録なら `recipe/<id>`、それ以外の変更なら内容が分かる名前）。ただし、セッション用の作業ブランチが既に指定されている場合はそのブランチをそのまま使い、新規ブランチは作らない
5. 変更をステージし、内容が分かる短いコミットメッセージでコミットする
6. ブランチをpushする
7. `gh pr create` でPRを作成する
8. `gh pr checks <PR番号> --watch` でCIの完了を待つ。失敗したらそこで止めて、失敗内容をユーザーに報告する（マージしない）
9. CIが成功したら、ユーザーに「CIが通ったのでmasterにマージしてよいか」と確認する
10. 承認を得たら `gh pr merge --merge --delete-branch` でマージする。承認を得るまでは絶対にマージしない
11. マージ後、`git checkout master` と `git pull` でローカルのmasterを最新化する（次の作業ブランチが古いmasterから分岐してコンフリクトの温床になるのを防ぐため）

> **gh CLIが使えない環境での読み替え**: Claude Code on the web等、`gh` CLIが無い環境では次のように代替する。手順7は `mcp__github__create_pull_request`、手順8は `mcp__github__pull_request_read`（`get_check_runs` を用いたポーリング）、手順10は `mcp__github__merge_pull_request`。マージ後のブランチ削除に対応するMCPツールは無いため `git push origin --delete <ブランチ名>` を試み、権限エラー等で失敗した場合はブランチを削除せずその旨をユーザーに報告する（マージ済みブランチは後でローカル環境から安全に削除できる）。

> **注記**: `gh pr merge` は意図的に `.claude/settings.json` の許可リストに入れていない。マージ実行のたびにハーネスの許可プロンプトを挟むことで、手順10の「ユーザー承認を得るまで絶対にマージしない」を仕組みとしても担保するためであり、許可漏れではない。
