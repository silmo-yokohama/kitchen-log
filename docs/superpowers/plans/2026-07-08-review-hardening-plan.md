# レビュー指摘修正（スキーマ強化・ワークフロー整備）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026-07-08の全体レビューで見つかった指摘（`{{id}}`参照の未検証、コミット前スキーマ検証の脱落、マージ後処理の未定義、編集フローの未定義、unit enum不足、CIのテスト範囲不足、未知プロパティの黙認、日付検証の甘さ、ほか低優先項目）をすべて修正する。

**Architecture:** `viewer/src/schemas/recipe.ts` のZodスキーマを強化（`.strict()`・`z.string().date()`・`{{id}}`参照検証・unit enum拡張・source相関制約・`astro/zod`への統一）し、CIをフルテスト実行に変更、運用ドキュメント（merge-recipe / authoring-workflow / naming-conventions / viewer CLAUDE.md）と `.claude/settings.json` を整合させる。スキーマ変更はすべてTDD（失敗するテストを先に書く）。

**Tech Stack:** Zod 3（`astro/zod` 経由）, Vitest 2, Astro 5, GitHub Actions（変更なしの範囲）

## Global Constraints

- Node.js >= 20 が必要（`viewer/package.json` の `engines` どおり）
- テスト実行はリポジトリルートから `npm run test --prefix viewer`（vitestの全テスト）
- 型チェックは `viewer/` ディレクトリ内で `npx astro check`
- コミットメッセージは日本語で書く（`docs/workflows/language-policy.md`）。末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける
- ドキュメントのユーザー向け記述は日本語（`docs/workflows/language-policy.md`）
- スキーマの単一情報源は `viewer/src/schemas/recipe.ts`（`viewer/CLAUDE.md`）
- 既存レシピデータは0件（`recipes/` は `.gitkeep` のみ）なので、スキーマ強化によるデータ移行は不要
- このプランは `viewer/src` を意図的に変更する開発作業である。`/merge-recipe` の「viewer/srcの変更があれば止める」ガードはレシピ登録作業向けの規定なので、最終タスクでは手動でPRフローを実行する

---

### Task 1: ブランチ作成と `astro/zod` へのimport統一

Astro Content Collectionsに渡すスキーマを、スタンドアロンの `zod` パッケージではなくAstro同梱の `astro/zod` で構築するように統一する（zodの二重インスタンス問題の予防）。`zod` 直接依存は削除する。

**Files:**
- Modify: `viewer/src/schemas/recipe.ts:1`
- Modify: `viewer/package.json`（`dependencies` から `zod` を削除）
- Modify: `viewer/package-lock.json`（`npm uninstall` が自動更新）

**Interfaces:**
- Consumes: なし
- Produces: `recipeSchema`・`Recipe` 型のexport名/形状は不変。以降の全タスクは `import { z } from 'astro/zod'` 前提でコードを書く

- [ ] **Step 1: ブランチ作成**

Run: `git checkout master && git pull && git checkout -b fix/review-hardening`
Expected: 最新のmasterから新ブランチ `fix/review-hardening` が作成される

- [ ] **Step 2: importを差し替える**

`viewer/src/schemas/recipe.ts` の1行目を変更:

```ts
// 変更前
import { z } from 'zod';
// 変更後
import { z } from 'astro/zod';
```

- [ ] **Step 3: zod直接依存を削除する**

`viewer/` ディレクトリ内で実行:

Run: `npm uninstall zod`
Expected: `package.json` の `dependencies` から `zod` が消え、`package-lock.json` が更新される

- [ ] **Step 4: テストと型チェックで退行がないことを確認**

Run: `npm run test --prefix viewer`（リポジトリルートから）
Expected: 11 tests passed（既存テストが全部通る）

Run: `viewer/` 内で `npx astro check`
Expected: 0 errors, 0 warnings

- [ ] **Step 5: コミット**

```bash
git add viewer/src/schemas/recipe.ts viewer/package.json viewer/package-lock.json
git commit -m "スキーマのzodをastro/zodに統一し二重インスタンスを防ぐ"
```

---

### Task 2: スキーマ強化（strict化・実在日付検証・source相関制約）

未知プロパティ（プロパティ名のtypo）を検知する `.strict()`、`2026-13-99` のような非実在日付を弾く `z.string().date()`、「`source.type` が `url` なら `source.url` 必須」の相関制約を追加する。

**Files:**
- Modify: `viewer/src/schemas/recipe.ts`
- Test: `viewer/src/schemas/recipe.test.ts`

**Interfaces:**
- Consumes: Task 1の `import { z } from 'astro/zod'`
- Produces: `recipeSchema` は未知キーを含む入力・非実在日付・url無しの `type: 'url'` を`safeParse`失敗にする。`sourceSchema` は `.strict().refine(...)` のZodEffectsになる（Task 3はこの形を前提に全体コードを書く）

- [ ] **Step 1: 失敗するテストを書く**

`viewer/src/schemas/recipe.test.ts` の `describe('recipeSchema', ...)` 内の末尾に追加:

```ts
  it('rejects an unknown top-level property', () => {
    const broken = { ...validRecipe, memo: '未知のプロパティ' };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown property inside an ingredient item', () => {
    const broken = {
      ...validRecipe,
      ingredientSections: [
        {
          section: '材料',
          items: [
            { id: 'flour', name: '小麦粉', amount: 100, unit: 'g', note: 'ふるっておく' },
          ],
        },
      ],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown property inside source', () => {
    const broken = { ...validRecipe, source: { type: 'cookgo', memo: 'x' } };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects a calendar-invalid date', () => {
    const broken = { ...validRecipe, createdAt: '2026-13-99' };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects source.type 'url' without source.url", () => {
    const broken = { ...validRecipe, source: { type: 'url' } };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test --prefix viewer`
Expected: 上記5件がFAIL（現状は未知キーがstripされ、正規表現のみの日付検証で、url相関制約が無いため全部successになってしまう）。既存11件はPASSのまま

- [ ] **Step 3: スキーマを実装する**

`viewer/src/schemas/recipe.ts` を以下のとおり変更する。

`ingredientItemSchema`（`.object({...})` の直後に `.strict()` を挟む）:

```ts
const ingredientItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    amount: z.number().positive().nullable(),
    unit: z.enum(UNIT_VALUES),
  })
  .strict()
  .refine(
    (item) =>
      QUALITATIVE_UNITS.includes(item.unit) ? item.amount === null : item.amount !== null,
    { message: 'amount must be null when unit is 少々/適量/ひとつまみ, and required otherwise', path: ['amount'] },
  );
```

`ingredientSectionSchema`・`stepSectionSchema`・`nutritionSchema` はそれぞれ `.object({...})` の直後に `.strict()` を追加（フィールド定義は変更しない）:

```ts
const ingredientSectionSchema = z
  .object({
    section: z.string().min(1),
    items: z.array(ingredientItemSchema).min(1),
  })
  .strict();

const stepSectionSchema = z
  .object({
    section: z.string().min(1),
    steps: z.array(z.string().min(1)).min(1),
  })
  .strict();

const nutritionSchema = z
  .object({
    energyKcal: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
    carbohydrateG: z.number().nonnegative(),
    saltG: z.number().nonnegative(),
  })
  .strict();
```

`sourceSchema` は `.strict()` と相関refineを追加:

```ts
const sourceSchema = z
  .object({
    type: z.enum(['cookgo', 'url', 'text', 'zero']),
    url: z.string().url().optional(),
    note: z.string().optional(),
  })
  .strict()
  .refine((source) => source.type !== 'url' || source.url !== undefined, {
    message: "source.url is required when source.type is 'url'",
    path: ['url'],
  });
```

`recipeSchema` 本体は `.strict()` を追加し、日付を `z.string().date()` に差し替える（`DATE_PATTERN` 定数と `.regex(DATE_PATTERN)` は削除）:

```ts
export const recipeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    dish: z.string().min(1),
    tags: z.array(z.string().min(1)),
    servings: z.number().int().positive(),
    ingredientSections: z.array(ingredientSectionSchema).min(1),
    stepSections: z.array(stepSectionSchema).min(1),
    nutrition: nutritionSchema,
    benefits: z.array(z.string()),
    cautions: z.array(z.string()),
    balance: z.string(),
    source: sourceSchema,
    createdAt: z.string().date(),
    updatedAt: z.string().date(),
  })
  .strict()
  .refine(
    (recipe) => {
      const ids = recipe.ingredientSections.flatMap((section) => section.items.map((item) => item.id));
      return new Set(ids).size === ids.length;
    },
    { message: 'ingredient ids must be unique across all sections', path: ['ingredientSections'] },
  );
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test --prefix viewer`
Expected: 16 tests passed（既存11＋新規5）

- [ ] **Step 5: コミット**

```bash
git add viewer/src/schemas/recipe.ts viewer/src/schemas/recipe.test.ts
git commit -m "スキーマをstrict化し実在日付検証とsource.url相関制約を追加"
```

---

### Task 3: 手順文の `{{id}}` 参照検証を追加

手順文中の `{{id}}` プレースホルダーが実在する材料idを指していることをスキーマで検証する。id参照のtypoがCIで検知できるようになる。

**Files:**
- Modify: `viewer/src/schemas/recipe.ts`（`recipeSchema` 末尾の `.refine` を `.superRefine` に統合）
- Test: `viewer/src/schemas/recipe.test.ts`

**Interfaces:**
- Consumes: Task 2完了時点の `recipeSchema`（`.strict().refine(id重複チェック)` の形）
- Produces: `recipeSchema` は「id重複」と「未知の `{{id}}` 参照」の両方を1つの `.superRefine` で検証する。export名・型は不変

- [ ] **Step 1: 失敗するテストを書く**

`viewer/src/schemas/recipe.test.ts` の `describe` 内末尾に追加:

```ts
  it('rejects a step referencing an unknown ingredient id', () => {
    const broken = {
      ...validRecipe,
      stepSections: [
        { section: '調理', steps: ['{{no_such_id}}を加えて中火で3分ほど炒める。'] },
      ],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('accepts steps that contain no placeholders at all', () => {
    const noPlaceholders = {
      ...validRecipe,
      stepSections: [
        { section: '調理', steps: ['フライパンを中火で1分ほど温める。'] },
      ],
    };
    const result = recipeSchema.safeParse(noPlaceholders);
    expect(result.success).toBe(true);
  });
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test --prefix viewer`
Expected: 「rejects a step referencing an unknown ingredient id」がFAIL（現状は参照チェックが無いためsuccessになる）。「accepts steps that contain no placeholders」はこの時点でもPASSする（退行防止用）

- [ ] **Step 3: `.refine` を `.superRefine` に置き換える**

`viewer/src/schemas/recipe.ts` の `recipeSchema` 末尾、

```ts
  .refine(
    (recipe) => {
      const ids = recipe.ingredientSections.flatMap((section) => section.items.map((item) => item.id));
      return new Set(ids).size === ids.length;
    },
    { message: 'ingredient ids must be unique across all sections', path: ['ingredientSections'] },
  );
```

を以下に置き換える:

```ts
  .superRefine((recipe, ctx) => {
    const ids = recipe.ingredientSections.flatMap((section) => section.items.map((item) => item.id));
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ingredientSections'],
        message: 'ingredient ids must be unique across all sections',
      });
    }
    const idSet = new Set(ids);
    recipe.stepSections.forEach((section, sectionIndex) => {
      section.steps.forEach((step, stepIndex) => {
        for (const match of step.matchAll(/\{\{([^{}]+)\}\}/g)) {
          if (!idSet.has(match[1])) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['stepSections', sectionIndex, 'steps', stepIndex],
              message: `unknown ingredient id "${match[1]}" referenced in step`,
            });
          }
        }
      });
    });
  });
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test --prefix viewer`
Expected: 18 tests passed（id重複テスト・`{{id}}`参照テストを含め全部PASS）

- [ ] **Step 5: コミット**

```bash
git add viewer/src/schemas/recipe.ts viewer/src/schemas/recipe.test.ts
git commit -m "手順文の{{id}}参照が実在する材料idを指すことを検証"
```

---

### Task 4: unit enumに頻出単位を追加

日本の家庭料理で頻出する単位（丁・パック・株・袋・缶・かけ・尾）をenumに追加する。クラウド環境（レシピ作成用途）は `viewer/` を編集できないため、登録セッション中に単位不足で詰まるのを予防する。

**Files:**
- Modify: `viewer/src/schemas/recipe.ts:3-7`（`UNIT_VALUES`）
- Test: `viewer/src/schemas/recipe.test.ts`

**Interfaces:**
- Consumes: Task 2/3完了時点の `recipeSchema`
- Produces: `UNIT_VALUES` に7単位が追加される。定性的単位（少々/適量/ひとつまみ）の扱いは不変

- [ ] **Step 1: 失敗するテストを書く**

`viewer/src/schemas/recipe.test.ts` の `describe` 内末尾に追加:

```ts
  it('accepts newly added count units like 丁 and パック', () => {
    const withNewUnits = {
      ...validRecipe,
      ingredientSections: [
        {
          section: '材料',
          items: [
            { id: 'tofu', name: '木綿豆腐', amount: 1, unit: '丁' },
            { id: 'natto', name: '納豆', amount: 1, unit: 'パック' },
          ],
        },
      ],
      stepSections: [
        { section: '調理', steps: ['{{tofu}}と{{natto}}を混ぜる。'] },
      ],
    };
    const result = recipeSchema.safeParse(withNewUnits);
    expect(result.success).toBe(true);
  });
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test --prefix viewer`
Expected: 上記1件がFAIL（`丁`・`パック` がenum外のため）

- [ ] **Step 3: enumに単位を追加**

`viewer/src/schemas/recipe.ts` の `UNIT_VALUES` を変更:

```ts
const UNIT_VALUES = [
  'g', 'ml', '大さじ', '小さじ', 'カップ',
  '個', '本', '枚', '束', '片', '玉',
  '丁', 'パック', '株', '袋', '缶', 'かけ', '尾',
  '少々', '適量', 'ひとつまみ',
] as const;
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test --prefix viewer`
Expected: 19 tests passed

- [ ] **Step 5: 型チェックで全体の退行がないことを確認**

Run: `viewer/` 内で `npx astro check`
Expected: 0 errors, 0 warnings

- [ ] **Step 6: コミット**

```bash
git add viewer/src/schemas/recipe.ts viewer/src/schemas/recipe.test.ts
git commit -m "unit enumに丁・パック・株・袋・缶・かけ・尾を追加"
```

---

### Task 5: CIをフルテスト実行に変更

CIでスキーマ自体のユニットテストも回るようにし（現在はレシピ実データの検証のみ）、PRブランチでの二重実行を解消し、npmキャッシュで高速化する。

**Files:**
- Modify: `.github/workflows/validate-recipes.yml`

**Interfaces:**
- Consumes: `viewer/package.json` の `test` スクリプト（`vitest run`。`validate:recipes` の対象ファイルを包含する）
- Produces: master push と全PRで `npm run test --prefix viewer` が実行されるCI

- [ ] **Step 1: ワークフローを書き換える**

`.github/workflows/validate-recipes.yml` の全内容を以下に置き換える:

```yaml
name: Validate recipes

on:
  push:
    branches: [master]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: viewer/package-lock.json
      - run: npm ci --prefix viewer
      - run: npm run test --prefix viewer
```

- [ ] **Step 2: ローカルで同じコマンドが通ることを確認**

Run: `npm run test --prefix viewer`
Expected: 19 tests passed（CIで実行されるのと同一コマンド）

- [ ] **Step 3: コミット**

```bash
git add .github/workflows/validate-recipes.yml
git commit -m "CIをスキーマテスト込みのフルテスト実行に変更し二重実行を解消"
```

---

### Task 6: merge-recipeワークフローの穴を塞ぐ（検証ステップ・マージ後処理・権限）

コミット前スキーマ検証の実行指示、マージ後にローカルmasterを最新化する手順、`gh pr merge` を意図的に許可リスト外にしている旨の注記を `merge-recipe.md` に追加し、`settings.json` に必要なBash許可を足す。

**Files:**
- Modify: `.claude/commands/merge-recipe.md`
- Modify: `.claude/settings.json`

**Interfaces:**
- Consumes: `viewer/package.json` の `validate:recipes` スクリプト
- Produces: `/merge-recipe` の手順1〜11＋注記。Task 7の編集フローはこの `/merge-recipe` を呼び出す前提

- [ ] **Step 1: merge-recipe.mdの手順3を差し替える**

`.claude/commands/merge-recipe.md` の手順3

```
3. 変更されたレシピJSONファイルがあれば、すべて読み込んでJSONとして壊れていないか確認する。パースに失敗するものがあれば、そこで止めてユーザーに報告する
```

を以下に置き換える:

```
3. 変更されたレシピJSONファイルがあれば、`npm run validate:recipes --prefix viewer` を実行してスキーマ検証する。実行できない環境（`viewer/node_modules` が無い等）では、各ファイルを読み込んでJSONとしてパースできるか確認した上で、スキーマ検証はCIに委ねる。検証・パースに失敗したら、そこで止めてユーザーに報告する
```

- [ ] **Step 2: merge-recipe.mdに手順11と注記を追加する**

手順10の後に以下を追加:

```
11. マージ後、`git checkout master` と `git pull` でローカルのmasterを最新化する（次の作業ブランチが古いmasterから分岐してコンフリクトの温床になるのを防ぐため）

> **注記**: `gh pr merge` は意図的に `.claude/settings.json` の許可リストに入れていない。マージ実行のたびにハーネスの許可プロンプトを挟むことで、手順10の「ユーザー承認を得るまで絶対にマージしない」を仕組みとしても担保するためであり、許可漏れではない。
```

- [ ] **Step 3: settings.jsonにBash許可を追加する**

`.claude/settings.json` の `allow` 配列の `"Bash(git status)"` の直後に2行追加:

```json
      "Bash(git status)",
      "Bash(git checkout master)",
      "Bash(git pull)",
```

（既存の他の行は変更しない。JSONとして妥当なままであることを保存後にRead等で確認する）

- [ ] **Step 4: コミット**

```bash
git add .claude/commands/merge-recipe.md .claude/settings.json
git commit -m "merge-recipeにスキーマ検証とマージ後のmaster最新化手順を追加"
```

---

### Task 7: 既存レシピの編集フローと updatedAt 更新ルールを定義

CLAUDE.mdは「登録・編集は必ず `/new-recipe`」とするが、`/new-recipe` はテンプレートコピー前提の新規登録フローで編集に適用できず、`updatedAt` の更新タイミングもどこにも規定されていない。編集フローを明文化する。

**Files:**
- Modify: `docs/workflows/authoring-workflow.md`
- Modify: `.claude/commands/new-recipe.md`

**Interfaces:**
- Consumes: Task 6完了時点の `/merge-recipe`（検証ステップ入り）
- Produces: authoring-workflow.mdの「既存レシピの編集」節。new-recipe.mdは編集時にこの節へ分岐する

- [ ] **Step 1: authoring-workflow.mdに編集フローの節を追加する**

「## 登録の流れ」の節の後（末尾の決定事項ブロックの前）に以下を追加:

```markdown
## 既存レシピの編集

登録済みレシピの内容を変更する（アレンジの反映・分量調整・誤記修正等）ときは、次の流れで行う。新規登録と違い、テンプレートのコピーは行わない。

1. 対象の `recipes/<id>.json` を読み込み、変更内容をユーザーと確認する
2. `profile.md` と `naming-conventions.md` に沿って編集する。`id`・ファイル名・`createdAt` は変更しない
3. `updatedAt` を編集当日の日付（YYYY-MM-DD）に更新する
4. ユーザーに確定前レビューを提示する
5. 確定後、`/merge-recipe` を呼び出す（スキーマ検証は `/merge-recipe` の手順に含まれる）
```

- [ ] **Step 2: new-recipe.mdの手順1に編集への分岐を追加する**

`.claude/commands/new-recipe.md` の手順1

```
1. ユーザーに入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
```

を以下に置き換える:

```
1. 新規登録か既存レシピの編集かを確認する。編集の場合は `docs/workflows/authoring-workflow.md` の「既存レシピの編集」の流れに切り替える。新規登録の場合、ユーザーに入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
```

- [ ] **Step 3: コミット**

```bash
git add docs/workflows/authoring-workflow.md .claude/commands/new-recipe.md
git commit -m "既存レシピの編集フローとupdatedAt更新ルールを明文化"
```

---

### Task 8: 命名規約の補完とviewer/CLAUDE.mdの記述修正

`dish` とid/ファイル名のslug形式を命名規約に追加し、enum外の単位に遭遇したときのフォールバックを明文化し、viewer/CLAUDE.mdの型チェックの誤記を直す。

**Files:**
- Modify: `docs/workflows/naming-conventions.md`
- Modify: `viewer/CLAUDE.md`

**Interfaces:**
- Consumes: Task 4完了時点の `UNIT_VALUES`（丁・パック等を含む）
- Produces: なし（ドキュメントのみ）

- [ ] **Step 1: naming-conventions.mdの表記ゆれ防止節に `dish` を含める**

見出しと本文の対象列挙を変更:

```
## 食材名・タグ・手順セクション名の表記ゆれ防止
```
→
```
## 食材名・タグ・dish・手順セクション名の表記ゆれ防止
```

本文の

```
新しい食材名・タグ・`stepSections`のセクション名（下ごしらえ／調理／盛り付け等、固定enumではなく自由記述）を追加する前に、必ず `recipes/*.json` をGrepし、既存の表記があればそれを再利用する。
```

を以下に置き換える:

```
新しい食材名・タグ・`dish`・`stepSections`のセクション名（下ごしらえ／調理／盛り付け等、固定enumではなく自由記述）を追加する前に、必ず `recipes/*.json` をGrepし、既存の表記があればそれを再利用する（例: `karaage` が既にあるのに `kara-age` を新設しない）。
```

- [ ] **Step 2: naming-conventions.mdにslug形式と単位フォールバックの節を追加する**

ファイル末尾に以下を追加:

```markdown
## id・ファイル名・`dish` のslug形式

`id`（＝ファイル名）と `dish` は、小文字ローマ字のケバブケースで書く（例: `enoki-butamaki`、`hiyashi-chuka`）。日本語・大文字・アンダースコアは使わない。`id` はファイル名（拡張子除く）と完全一致させる。

## スキーマにない単位に遭遇したとき

`unit` は固定enumであり、レシピ作成環境（クラウド）からはenumを拡張できない。enumにない単位（例: 「1房」「1切れ」）が必要になったら、その場でenum追加を試みず、次のように登録する。

- 可能なら `g`・`ml`・`個` 等の既存単位に換算する
- 元の表記が調理上重要な場合は `name` に併記する（例: `name: "ぶどう（1房分）", amount: 300, unit: "g"`）
- 頻出しそうな単位であれば、ローカル開発環境で `viewer/src/schemas/recipe.ts` の `UNIT_VALUES` に追加する作業を別途行う（ユーザーに提案する）
```

- [ ] **Step 3: viewer/CLAUDE.mdの型チェックの記述を修正する**

`viewer/CLAUDE.md` の

```
- 型チェック: `npx astro check`（`--prefix viewer` から実行、またはこのディレクトリ内で直接実行）
```

を以下に置き換える（`npx` に `--prefix` は効かないため）:

```
- 型チェック: `viewer/` ディレクトリ内で `npx astro check` を実行する
```

- [ ] **Step 4: コミット**

```bash
git add docs/workflows/naming-conventions.md viewer/CLAUDE.md
git commit -m "dish・slug形式・単位フォールバックの規約を追加し型チェックの記述を修正"
```

---

### Task 9: 最終検証とPR作成

全変更をまとめて検証し、PRを作成してCIを確認する。このブランチは `viewer/src` を意図的に変更する開発作業なので、`/merge-recipe` は使わず手動でPRフローを実行する（`/merge-recipe` のviewer/src変更ガードはレシピ登録作業向けの規定のため）。

**Files:**
- なし（検証とgit操作のみ）

**Interfaces:**
- Consumes: Task 1〜8の全コミット
- Produces: レビュー可能なPR

- [ ] **Step 1: フルテストと型チェック**

Run: `npm run test --prefix viewer`
Expected: 19 tests passed

Run: `viewer/` 内で `npx astro check`
Expected: 0 errors, 0 warnings

- [ ] **Step 2: 変更範囲の確認**

Run: `git status` と `git diff master --stat`
Expected: 変更ファイルが以下のみであること:
`viewer/src/schemas/recipe.ts` / `viewer/src/schemas/recipe.test.ts` / `viewer/package.json` / `viewer/package-lock.json` / `.github/workflows/validate-recipes.yml` / `.claude/commands/merge-recipe.md` / `.claude/commands/new-recipe.md` / `.claude/settings.json` / `docs/workflows/authoring-workflow.md` / `docs/workflows/naming-conventions.md` / `viewer/CLAUDE.md` / `docs/superpowers/plans/2026-07-08-review-hardening-plan.md`

- [ ] **Step 3: push・PR作成**

```bash
git push -u origin fix/review-hardening
gh pr create --title "レビュー指摘の修正: スキーマ強化とワークフロー整備" --body "$(cat <<'EOF'
## 概要
2026-07-08の全体レビューで見つかった指摘の修正。

- 手順文の `{{id}}` 参照が実在する材料idを指すことをスキーマで検証
- スキーマのstrict化（未知プロパティ＝typoの検知）、実在日付検証、source.url相関制約
- unit enumに丁・パック・株・袋・缶・かけ・尾を追加
- zodをastro/zodに統一
- CIをスキーマテスト込みのフルテスト実行に変更
- /merge-recipeにスキーマ検証・マージ後のmaster最新化手順を追加
- 既存レシピの編集フローとupdatedAt更新ルールを明文化
- dish・slug形式・単位フォールバックの命名規約を追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: CIの完了を待つ**

Run: `gh pr checks --watch`
Expected: Validate recipes がpass（このPR自体が新CI定義で走る）

- [ ] **Step 5: ユーザーにマージ可否を確認する**

CIが通ったら、ユーザーに「CIが通ったのでmasterにマージしてよいか」を確認する。承認を得るまでマージしない。承認後:

```bash
gh pr merge --merge --delete-branch
git checkout master
git pull
```
