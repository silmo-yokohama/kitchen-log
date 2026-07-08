# レシピ手順（steps）のセクション分割 設計

> 作成日: 2026-07-08
> 関連ドキュメント: `docs/superpowers/specs/2026-07-07-step0-foundation-design.md`（Step0設計）、Step1実地検証中の会話

## 背景・目的

Step2で作るビューア（Webサイト）上で、レシピの手順を「作り方」として一括表示するのではなく、【下ごしらえ】【調理】【盛り付け】のようなセクションに分けて表示したい。

あわせて、調理中にユーザー（清水・パートナー）が慌てないよう、同じタイミングで加える調味料は下ごしらえの段階で先に混ぜ合わせておく（合わせ調味料化する）ことをレシピ作成時のルールとして明文化したい。ただし、加えるタイミングが異なる等の理由でまとめられない調味料については、その理由を手順文に明記する。

現行スキーマ（`viewer/src/schemas/recipe.ts`）の`steps`はフラットな文字列配列であり、セクション分割の情報を持てない。既存の`ingredientSections`（フェーズ別・自由記述のセクション名）と同様の構造を`steps`側にも導入する。

## 決定事項

### A. スキーマ変更: `steps` → `stepSections`

`steps`（フラットな文字列配列）を廃止し、`ingredientSections`と同型の`stepSections`に置き換える。

```jsonc
"stepSections": [
  {
    "section": "下ごしらえ",
    "steps": [
      "{{sauce_soy}}・{{sauce_vinegar}}・{{sauce_sugar}}を混ぜ合わせ、合わせ調味料を作る。",
      "{{cucumber}}と{{ham}}を細切りにする。"
    ]
  },
  {
    "section": "調理",
    "steps": ["{{noodle}}を茹でて冷水で締める。"]
  },
  {
    "section": "盛り付け",
    "steps": ["器に麺を盛り、具材と合わせ調味料をのせる。"]
  }
]
```

`viewer/src/schemas/recipe.ts`に`stepSectionSchema`（`ingredientSectionSchema`と同型: `section: z.string().min(1)`, `steps: z.array(z.string().min(1)).min(1)`）を追加し、`recipeSchema`の`steps`フィールドを`stepSections: z.array(stepSectionSchema).min(1)`に差し替える。

steps側には`id`を持たせない（`{{id}}`参照は引き続きingredient側のidのみで解決するため、steps側の一意性制約は不要）。

**Step3（調理モード）との関係**: Step3で1ステップずつ表示する際は、ビューア側で`stepSections.flatMap(s => s.steps)`のように平坦化すればよい。本設計はスキーマ変更のみを対象とし、ビューアの表示実装はStep2/Step3のスコープとする。

### B. セクション名の運用ルール

`ingredientSections`の`section`や`tags`と同じ「固定enumにせず自由記述＋Grep再利用」方針を踏襲する。

- 推奨の初期セット: **下ごしらえ／調理／盛り付け**
- 料理の性質に応じて増減してよい（例: 漬け込みが必要な料理は「漬け込み」、パン系なら「発酵」「成形」「焼成」等）
- `docs/workflows/naming-conventions.md`のGrep再利用ルールの対象に`stepSections[].section`を追加する

### C. 調味料の下ごしらえ集約ルール

`docs/workflows/step-writing-guidelines.md`に新しい項目（6番目）として追加する:

> **6. 同じタイミングで加える調味料は下ごしらえでまとめる**: 複数の調味料を同時に加える場合、下ごしらえフェーズの手順で先に混ぜ合わせて「合わせ調味料」を作っておく（調理中に慌てて計量・混合しなくて済むようにするため）。加えるタイミングが異なる、混ぜると風味や食感が損なわれる等の理由でまとめられない場合は、下ごしらえでまとめず個別に調理フェーズの手順で加え、その手順文に理由を一言添える（例:「酒は焼く直前に加えることで香りを飛ばさない」）。

材料側（`ingredientSections`）で、まとめる調味料を「合わせ調味料」等のセクションに分けておく既存の運用は変わらない。今回追加するのは「実際に混ぜ合わせる動作を、下ごしらえフェーズの手順として明示的に書く」という手順文側のルールである。

### D. 移行対象ファイル

| ファイル | 内容 |
|---|---|
| `viewer/src/schemas/recipe.ts` | `steps`を`stepSections`（新設の`stepSectionSchema`）に置き換え |
| `viewer/src/schemas/recipe.test.ts` | テスト用フィクスチャを`stepSections`形式に更新 |
| `recipes/hiyashi-chuka-marutai.json` | 削除（Step0の動作確認用プロトタイプであり、本運用のレシピではないため） |
| `viewer/tests/recipes.validate.test.ts` | 「レシピが最低1件存在すること」を確認するテストを削除する（製品要件ではなくStep0の動作確認用だったため。`recipes/`が空の間もCIはgreenのままとする） |
| `docs/workflows/recipe-template.json` | `steps`を`stepSections`に更新 |
| `docs/workflows/authoring-workflow.md` | 手順組み立てステップの記述を更新 |
| `docs/workflows/naming-conventions.md` | Grep再利用ルールの対象に`stepSections[].section`を追加 |
| `docs/workflows/step-writing-guidelines.md` | ルール6（調味料の下ごしらえ集約）を追加 |
| `.claude/commands/new-recipe.md` | 手順組み立てステップの記述を更新 |

## スコープ外

- Step2ビューアでの`stepSections`の実際の表示実装（セクション見出し・レイアウト等）
- Step3調理モードでの`stepSections`の平坦化・1ステップ表示実装
- 下ごしらえ集約ルール（C）の自動検証（Zodスキーマでの機械的な強制）。判断が伴うルールのため、`step-writing-guidelines.md`によるドキュメントベースの運用とする
