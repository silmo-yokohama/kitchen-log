# kitchen-log

料理レシピを構造化データ（JSON）として蓄積し、Claude Codeが好み・過去レシピ・公的栄養データを参照しながらアレンジ・評価するリポジトリ。

- `recipes/`: レシピ本体（JSON、1レシピ1ファイル、フラット構成）
- `profile.md`: 好みプロファイル（共通・清水・パートナー）
- `viewer/`: Astro製PWAビューア（Step2以降）

すべての作業において、以下のルールを常に守る。

@docs/workflows/language-policy.md

レシピを登録・編集する際は、必ず `/new-recipe` コマンドを使うこと。以下のルールも常に守る。

@docs/workflows/authoring-workflow.md
@docs/workflows/nutrition-rules.md
@docs/workflows/naming-conventions.md
@docs/workflows/data-boundary.md
@docs/workflows/step-writing-guidelines.md
