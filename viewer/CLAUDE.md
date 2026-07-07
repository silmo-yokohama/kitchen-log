# viewer/ 開発規約

このディレクトリはAstro製のPWAビューア（Step2以降で画面実装）。

- Astro Content Collections（`src/content.config.ts`）が `recipes/*.json` を読み込む。スキーマは `src/schemas/recipe.ts` を単一の情報源とする
- 開発サーバー: `npm run dev --prefix viewer`
- テスト: `npm run test --prefix viewer`（スキーマ・ロジックのユニットテスト）、`npm run validate:recipes --prefix viewer`（全レシピのスキーマ検証）
- 型チェック: `npx astro check`（`--prefix viewer` から実行、またはこのディレクトリ内で直接実行）
- コンポーネントを追加する場合、対話的な機能（お気に入り等のSupabase連携、v2以降）は個別のIslandとして実装し、静的なページ・コンポーネントと混在させすぎない
