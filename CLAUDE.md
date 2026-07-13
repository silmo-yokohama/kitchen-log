# kitchen-log

料理レシピを構造化データ（JSON）として蓄積し、Claude Codeが好み・過去レシピ・公的栄養データを参照しながらアレンジ・評価するリポジトリ。

- `recipes/`: レシピ本体（JSON、1レシピ1ファイル、フラット構成）
- `profile.md`: 好みプロファイル（共通・清水・パートナー）
- `masters/`: ビューアの絞り込みに使う許可値マスタ（カテゴリー・素材・タグ）
- `viewer/`: Astro製PWAビューア「陽平のレシピ帳」（一覧・詳細を実装済み。調理モードは作らない決定・2026-07）
- `mockups/`: Step2のビジュアル仕様として合意した静的HTMLモックアップ（実装の正はviewer側）

将来の機能計画（やる・やらない）は `docs/roadmap.md` を正とする。日付付き設計書のロードマップ記述は参照しない。**開発作業中に、機能についてユーザーが意思決定したとき（やる・やらない・保留）、Claudeの機能提案が判断されないまま会話が先へ進んだとき、または機能が完成したときは、その場で `/roadmap` を実行して反映する**（後でまとめてやらない。チャットログは記録として残らない前提で動く）。レシピ登録・編集などの運用作業ではロードマップを更新しない（運用中に出たアイデアは、ユーザーが「ロードマップに入れて」と明示したときだけ例外で反映する）。

すべての作業において、以下のルールを常に守る。

@docs/workflows/language-policy.md

レシピを登録・編集する際は、必ず `/new-recipe` コマンドを使うこと。以下のルールも常に守る。

@docs/workflows/authoring-workflow.md
@docs/workflows/nutrition-rules.md
@docs/workflows/naming-conventions.md
@docs/workflows/data-boundary.md
@docs/workflows/step-writing-guidelines.md
