# Step0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Step0 foundation for the kitchen-log recipe app: a minimal Astro project scaffold with a validated recipe JSON schema, the repo-root data files (`recipes/`, `profile.md`), the AI operating rules (`CLAUDE.md`, `docs/workflows/*.md`, `.claude/commands/new-recipe.md`), the permission guardrails (`.claude/settings.json` / `.claude/settings.local.json.example`), and CI validation.

**Architecture:** A git repository with two data roots (`recipes/*.json`, `profile.md`) read by both an Astro Content Collection (`viewer/`) and a reusable Zod schema. The same schema backs three consumers: Astro's build-time validation, a vitest suite that validates every recipe file, and (implicitly) the `/new-recipe` authoring workflow described in `CLAUDE.md`. No UI/pages are built in this plan — that is Step2.

**Tech Stack:** Astro 5 (Islands architecture, not used yet in this plan), Zod 3, Vitest 2, Node.js >= 20, GitHub Actions.

## Global Constraints

- Node.js >= 20 required for all `viewer/` commands.
- Recipe data files are always JSON, never YAML (see design doc rationale: AI-generated data, avoid YAML implicit-typing footguns).
- `unit` values are restricted to exactly: `g`, `ml`, `大さじ`, `小さじ`, `カップ`, `個`, `本`, `枚`, `束`, `片`, `玉`, `少々`, `適量`, `ひとつまみ`.
- `amount` must be a positive number, EXCEPT when `unit` is `少々`, `適量`, or `ひとつまみ`, in which case `amount` must be `null`.
- `source.type` is restricted to exactly: `cookgo`, `url`, `text`, `zero`.
- `ingredientSections[].items[].id` must be unique across the ENTIRE recipe (not just within one section).
- `.claude/settings.local.json` must never be committed to git (enforced via `.gitignore`; `.claude/settings.local.json.example` is the committed template).
- All prose written in this plan (CLAUDE.md, docs/workflows/*.md, profile.md, commands) is in Japanese, matching the project's language.
- Design reference: `docs/superpowers/specs/2026-07-07-step0-foundation-design.md`. Every task below implements a section of that document — do not re-derive decisions already made there.

---

### Task 1: Scaffold the Astro project skeleton

**Files:**
- Create: `viewer/package.json`
- Create: `viewer/astro.config.mjs`
- Create: `viewer/tsconfig.json`
- Create: `viewer/.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working `npm install` / `npx astro` environment in `viewer/` that Task 2 builds on. No exported code symbols yet.

- [ ] **Step 1: Create `viewer/package.json`**

```json
{
  "name": "kitchen-log-viewer",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `viewer/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({});
```

- [ ] **Step 3: Create `viewer/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

- [ ] **Step 4: Create `viewer/.gitignore`**

```
node_modules/
dist/
.astro/
```

- [ ] **Step 5: Install dependencies**

Run: `npm install --prefix viewer`
Expected: exits with code 0, creates `viewer/node_modules/` and `viewer/package-lock.json`.

- [ ] **Step 6: Verify the Astro CLI works**

Run: `npx --prefix viewer astro --version`
Expected: prints a version string starting with `astro` (no errors).

- [ ] **Step 7: Commit**

```bash
git add viewer/package.json viewer/package-lock.json viewer/astro.config.mjs viewer/tsconfig.json viewer/.gitignore
git commit -m "Scaffold minimal Astro project in viewer/"
```

---

### Task 2: Recipe Zod schema with unit tests

**Files:**
- Modify: `viewer/package.json` (add `zod`, `vitest`, `typescript` dependencies and a `test` script)
- Create: `viewer/vitest.config.ts`
- Create: `viewer/src/schemas/recipe.ts`
- Test: `viewer/src/schemas/recipe.test.ts`

**Interfaces:**
- Consumes: the `viewer/` npm environment from Task 1.
- Produces: `export const recipeSchema` (a `ZodType`) and `export type Recipe = z.infer<typeof recipeSchema>` from `viewer/src/schemas/recipe.ts`. Task 3 and Task 4 import `recipeSchema` from this exact path.

- [ ] **Step 1: Add test/schema dependencies to `viewer/package.json`**

Modify the `scripts`, `dependencies`, and add `devDependencies`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.6.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "vitest": "^2.1.4",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Run install**

Run: `npm install --prefix viewer`
Expected: exits with code 0.

- [ ] **Step 3: Create `viewer/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `viewer/src/schemas/recipe.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recipeSchema } from './recipe';

const validRecipe = {
  id: 'test-recipe',
  title: 'テストレシピ',
  dish: 'test-dish',
  tags: ['タグ1'],
  servings: 2,
  ingredientSections: [
    {
      section: '合わせ調味料',
      items: [{ id: 'sauce_sake', name: '酒', amount: 1, unit: '大さじ' }],
    },
    {
      section: '炒めるとき',
      items: [
        { id: 'stirfry_sake', name: '酒', amount: 1, unit: '小さじ' },
        { id: 'salt', name: '塩', amount: null, unit: '少々' },
      ],
    },
  ],
  steps: ['{{sauce_sake}}を混ぜて合わせ調味料を作る。', '{{stirfry_sake}}を加え、{{salt}}で味を調える。'],
  nutrition: {
    energyKcal: 420,
    proteinG: 18.2,
    fatG: 12.5,
    carbohydrateG: 58.0,
    saltG: 3.1,
  },
  benefits: [],
  cautions: [],
  balance: '野菜量が控えめ。',
  source: { type: 'cookgo' },
  createdAt: '2026-07-07',
  updatedAt: '2026-07-07',
};

describe('recipeSchema', () => {
  it('accepts a valid recipe', () => {
    const result = recipeSchema.safeParse(validRecipe);
    expect(result.success).toBe(true);
  });

  it('rejects duplicate ingredient ids across different sections', () => {
    const broken = {
      ...validRecipe,
      ingredientSections: [
        validRecipe.ingredientSections[0],
        {
          section: '炒めるとき',
          items: [{ id: 'sauce_sake', name: '酒', amount: 1, unit: '小さじ' }],
        },
      ],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects a non-qualitative unit with a null amount', () => {
    const broken = {
      ...validRecipe,
      ingredientSections: [
        {
          section: '材料',
          items: [{ id: 'flour', name: '小麦粉', amount: null, unit: 'g' }],
        },
      ],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects a unit outside the fixed enum', () => {
    const broken = {
      ...validRecipe,
      ingredientSections: [
        {
          section: '材料',
          items: [{ id: 'flour', name: '小麦粉', amount: 100, unit: 'カップ半分' }],
        },
      ],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid source.type', () => {
    const broken = { ...validRecipe, source: { type: 'instagram' } };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects a qualitative unit paired with a non-null amount', () => {
    const broken = {
      ...validRecipe,
      ingredientSections: [
        {
          section: '材料',
          items: [{ id: 'salt2', name: '塩', amount: 1, unit: '少々' }],
        },
      ],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm run test --prefix viewer`
Expected: FAIL — `viewer/src/schemas/recipe.ts` does not exist yet, so the import fails to resolve.

- [ ] **Step 6: Implement the schema**

Create `viewer/src/schemas/recipe.ts`:

```ts
import { z } from 'zod';

const UNIT_VALUES = [
  'g', 'ml', '大さじ', '小さじ', 'カップ',
  '個', '本', '枚', '束', '片', '玉',
  '少々', '適量', 'ひとつまみ',
] as const;

const QUALITATIVE_UNITS: readonly string[] = ['少々', '適量', 'ひとつまみ'];

const ingredientItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    amount: z.number().positive().nullable(),
    unit: z.enum(UNIT_VALUES),
  })
  .refine(
    (item) =>
      QUALITATIVE_UNITS.includes(item.unit) ? item.amount === null : item.amount !== null,
    { message: 'amount must be null when unit is 少々/適量/ひとつまみ, and required otherwise', path: ['amount'] },
  );

const ingredientSectionSchema = z.object({
  section: z.string().min(1),
  items: z.array(ingredientItemSchema).min(1),
});

const nutritionSchema = z.object({
  energyKcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  carbohydrateG: z.number().nonnegative(),
  saltG: z.number().nonnegative(),
});

const sourceSchema = z.object({
  type: z.enum(['cookgo', 'url', 'text', 'zero']),
  note: z.string().optional(),
});

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const recipeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    dish: z.string().min(1),
    tags: z.array(z.string().min(1)),
    servings: z.number().int().positive(),
    ingredientSections: z.array(ingredientSectionSchema).min(1),
    steps: z.array(z.string().min(1)).min(1),
    nutrition: nutritionSchema,
    benefits: z.array(z.string()),
    cautions: z.array(z.string()),
    balance: z.string(),
    source: sourceSchema,
    createdAt: z.string().regex(DATE_PATTERN),
    updatedAt: z.string().regex(DATE_PATTERN),
  })
  .refine(
    (recipe) => {
      const ids = recipe.ingredientSections.flatMap((section) => section.items.map((item) => item.id));
      return new Set(ids).size === ids.length;
    },
    { message: 'ingredient ids must be unique across all sections', path: ['ingredientSections'] },
  );

export type Recipe = z.infer<typeof recipeSchema>;
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test --prefix viewer`
Expected: PASS — all 6 tests green.

- [ ] **Step 8: Commit**

```bash
git add viewer/package.json viewer/package-lock.json viewer/vitest.config.ts viewer/src/schemas/recipe.ts viewer/src/schemas/recipe.test.ts
git commit -m "Add recipe Zod schema with unit tests"
```

---

### Task 3: Wire the schema into Astro Content Collections

**Files:**
- Modify: `viewer/package.json` (add `@astrojs/check` devDependency, required by `astro check`)
- Create: `viewer/src/content.config.ts`
- Create: `recipes/hiyashi-chuka-marutai.json`

**Interfaces:**
- Consumes: `recipeSchema` from `viewer/src/schemas/recipe.ts` (Task 2).
- Produces: an Astro `recipes` content collection (`export const collections = { recipes }`) that Step2 will later query via `getCollection('recipes')`.

- [ ] **Step 1: Add `@astrojs/check` (required by `astro check`)**

Modify `viewer/package.json` `devDependencies`:

```json
{
  "devDependencies": {
    "vitest": "^2.1.4",
    "typescript": "^5.5.4",
    "@astrojs/check": "^0.9.4"
  }
}
```

Run: `npm install --prefix viewer`
Expected: exits with code 0.

- [ ] **Step 2: Create the sample recipe fixture**

Create `recipes/hiyashi-chuka-marutai.json` (repo root, sibling to `viewer/`):

```json
{
  "id": "hiyashi-chuka-marutai",
  "title": "マルタイで作る冷やし中華",
  "dish": "hiyashi-chuka",
  "tags": ["夏", "麺類", "あっさり"],
  "servings": 2,
  "ingredientSections": [
    {
      "section": "麺・具材",
      "items": [
        { "id": "noodle", "name": "マルタイ棒ラーメン", "amount": 2, "unit": "束" },
        { "id": "cucumber", "name": "きゅうり", "amount": 1, "unit": "本" },
        { "id": "ham", "name": "ロースハム", "amount": 4, "unit": "枚" }
      ]
    },
    {
      "section": "合わせ調味料",
      "items": [
        { "id": "sauce_soy", "name": "醤油", "amount": 2, "unit": "大さじ" },
        { "id": "sauce_vinegar", "name": "酢", "amount": 2, "unit": "大さじ" },
        { "id": "sauce_sugar", "name": "砂糖", "amount": 1, "unit": "大さじ" }
      ]
    }
  ],
  "steps": [
    "{{noodle}}を鍋に入れ、袋の表示時間通り茹でたら冷水でしっかり締める。",
    "{{cucumber}}は細切りにし、{{ham}}も同じ太さの細切りにする。",
    "{{sauce_soy}}・{{sauce_vinegar}}・{{sauce_sugar}}を混ぜ合わせ、砂糖が溶けるまでよく混ぜて合わせ調味料を作る。",
    "器に麺を盛り、{{cucumber}}と{{ham}}をのせ、合わせ調味料を回しかける。"
  ],
  "nutrition": {
    "energyKcal": 420,
    "proteinG": 18.2,
    "fatG": 12.5,
    "carbohydrateG": 58.0,
    "saltG": 3.1
  },
  "benefits": [],
  "cautions": ["食塩相当量がやや高め（1人前の目標値の4割強）"],
  "balance": "野菜量が控えめ。既存レシピの「ナムル」等の副菜と組み合わせると良い。",
  "source": { "type": "cookgo", "note": "PDF共有経由" },
  "createdAt": "2026-07-07",
  "updatedAt": "2026-07-07"
}
```

- [ ] **Step 3: Create `viewer/src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { recipeSchema } from './schemas/recipe';

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: '../../recipes' }),
  schema: recipeSchema,
});

export const collections = { recipes };
```

- [ ] **Step 4: Verify the content collection type-checks**

Run: `npx --prefix viewer astro check`
Expected: exits with code 0 and reports no errors (confirms `content.config.ts` loads, the schema compiles, and `recipes/hiyashi-chuka-marutai.json` satisfies `recipeSchema`).

- [ ] **Step 5: Commit**

```bash
git add viewer/package.json viewer/package-lock.json viewer/src/content.config.ts recipes/hiyashi-chuka-marutai.json
git commit -m "Wire recipe schema into Astro Content Collections"
```

---

### Task 4: Validate-all-recipes test

**Files:**
- Create: `viewer/tests/recipes.validate.test.ts`
- Modify: `viewer/package.json` (add `validate:recipes` script)

**Interfaces:**
- Consumes: `recipeSchema` from `viewer/src/schemas/recipe.ts` (Task 2), `recipes/*.json` fixtures (Task 3).
- Produces: `npm run validate:recipes --prefix viewer`, the command `/new-recipe` (Task 5) and CI (Task 8) both invoke before treating a recipe as final.

- [ ] **Step 1: Write the failing test**

Create `viewer/tests/recipes.validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { recipeSchema } from '../src/schemas/recipe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const recipesDir = join(__dirname, '..', '..', 'recipes');

const recipeFiles = readdirSync(recipesDir).filter((name) => name.endsWith('.json'));

describe('every recipe file in recipes/', () => {
  it('has at least one recipe to validate', () => {
    expect(recipeFiles.length).toBeGreaterThan(0);
  });

  for (const fileName of recipeFiles) {
    it(`${fileName} matches recipeSchema`, () => {
      const raw = readFileSync(join(recipesDir, fileName), 'utf-8');
      const parsed = JSON.parse(raw);
      const result = recipeSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`${fileName} failed validation: ${result.error.message}`);
      }
      expect(result.success).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Add the npm script**

Modify `viewer/package.json` `scripts`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run",
    "validate:recipes": "vitest run tests/recipes.validate.test.ts"
  }
}
```

- [ ] **Step 3: Run it against the current (valid) fixture**

Run: `npm run validate:recipes --prefix viewer`
Expected: PASS — 2 tests green (`has at least one recipe` + `hiyashi-chuka-marutai.json matches recipeSchema`).

- [ ] **Step 4: Prove the test actually catches a broken recipe**

Temporarily create `recipes/__broken-fixture.json`:

```json
{
  "id": "broken-fixture",
  "title": "壊れたフィクスチャ",
  "dish": "broken",
  "tags": [],
  "servings": 1,
  "ingredientSections": [
    {
      "section": "材料",
      "items": [{ "id": "x", "name": "テスト", "amount": null, "unit": "g" }]
    }
  ],
  "steps": ["{{x}}を使う。"],
  "nutrition": { "energyKcal": 0, "proteinG": 0, "fatG": 0, "carbohydrateG": 0, "saltG": 0 },
  "benefits": [],
  "cautions": [],
  "balance": "",
  "source": { "type": "zero" },
  "createdAt": "2026-07-07",
  "updatedAt": "2026-07-07"
}
```

Run: `npm run validate:recipes --prefix viewer`
Expected: FAIL — `__broken-fixture.json matches recipeSchema` fails (unit `g` requires a non-null amount).

- [ ] **Step 5: Remove the broken fixture and confirm green again**

Delete `recipes/__broken-fixture.json`.
Run: `npm run validate:recipes --prefix viewer`
Expected: PASS — back to 2 green tests.

- [ ] **Step 6: Commit**

```bash
git add viewer/tests/recipes.validate.test.ts viewer/package.json
git commit -m "Add validate:recipes test that checks every recipe file against the schema"
```

---

### Task 5: CLAUDE.md, docs/workflows/*.md, and the /new-recipe command

**Files:**
- Create: `CLAUDE.md`
- Create: `docs/workflows/authoring-workflow.md`
- Create: `docs/workflows/nutrition-rules.md`
- Create: `docs/workflows/naming-conventions.md`
- Create: `docs/workflows/data-boundary.md`
- Create: `docs/workflows/step-writing-guidelines.md`
- Create: `.claude/commands/new-recipe.md`
- Create: `viewer/CLAUDE.md`

**Interfaces:**
- Consumes: nothing (pure documentation, references file paths from Tasks 1-4 by name only).
- Produces: the instructional content that `.claude/settings.json` (Task 6) grants permissions for, and that any future recipe-authoring session reads.

- [ ] **Step 1: Create `docs/workflows/authoring-workflow.md`**

```markdown
# レシピ登録ワークフロー

このリポジトリでレシピを登録する際は、必ず `/new-recipe` コマンドを使う。手作業でJSONを書かない。

## 4つの入口

レシピの元情報は次の4種類のいずれかから得る。どの入口でも、最終的には同じ `recipeSchema`（`viewer/src/schemas/recipe.ts`）に準拠したJSONに変換する。

1. **cookgo**: CookGoアプリの共有→PDF出力を経由して渡された画像ベースのPDF。文字として読み取れないため、内容を読み上げてもらうか、画像を直接解析して材料・手順を復元する
2. **url**: レシピサイトやYouTube等のURL。WebFetchで取得できる範囲の情報を元にする。ログイン必須のプラットフォーム（Instagram等)は直接読めないため、その場合はテキスト貼り付け（type: text）に切り替えるようユーザーに伝える
3. **text**: ユーザーが貼り付けた生のテキスト（材料・手順の書き出し等）
4. **zero**: 冷蔵庫の中身や気分等から、ゼロベースで相談しながら組み立てる

## 登録の流れ

1. 入口の種類（cookgo/url/text/zero）を確認し、元情報を取得する
2. `profile.md` を読み、清水・パートナー・共通の好みを確認する
3. `recipes/*.json` を Grep し、食材名・タグの表記を既存のものに合わせる（`naming-conventions.md` 参照）
4. `ingredientSections`（フェーズ別・id付き）と `steps`（`{{id}}` 参照）を組み立てる。手順文は `step-writing-guidelines.md` に従う
5. `nutrition-rules.md` の計算式で栄養価を算出し、`benefits`/`cautions`/`balance` を記述する
6. `npm run validate:recipes --prefix viewer` を実行し、スキーマ検証を通す
7. ユーザーに確定前レビューを提示する
8. 確定後、`recipes/<id>.json` として保存し、`git add` / `git commit` する
```

- [ ] **Step 2: Create `docs/workflows/nutrition-rules.md`**

```markdown
# 栄養計算・benefits/cautions記述ルール

## エネルギー計算式（固定）

文部科学省「日本食品標準成分表2020年版（八訂）」の計算式を必ず使う。CookGo等、他サービスに表示されている栄養価の値には依存せず、必ずここで自前算出する。

```
エネルギー(kcal) = たんぱく質(アミノ酸組成)×4.0
                 + 脂質(脂肪酸TG当量)×9.0
                 + 利用可能炭水化物(単糖当量)×3.75
                 + 食物繊維×2.0
                 + 糖アルコール×2.4
                 + 有機酸×3.0
                 + アルコール×7.0
```

`nutrition` フィールドの `energyKcal`/`proteinG`/`fatG`/`carbohydrateG`/`saltG` は、この式に基づき1人前（`servings`で割った値）で算出する。

## 食塩相当量の目標値

厚生労働省「日本人の食事摂取基準（2025年版）」より、成人男性 7.5g未満/日、成人女性 6.5g未満/日。`cautions` で食塩について言及する際はこの値との比較で書く。

## benefits / cautions の記述ルール（厳守）

- `benefits`/`cautions` は「計算した栄養素の値」と「公的基準値との比較」からのみ記述できる
- 医学的根拠のない俗説・都市伝説（例: 特定の調味料への漠然とした健康被害の指摘）は禁止
- 該当する内容がなければ、無理に埋めず空配列のままにする

## balance（栄養バランス評価）

- `recipes/*.json` をGrepし、既存レシピの中から栄養バランスを補完できる具体的なレシピ名を提案する
- 該当するレシピが無ければ、どのような料理が良いかを記述する
```

- [ ] **Step 3: Create `docs/workflows/naming-conventions.md`**

```markdown
# 命名・重複防止ルール

## 食材名・タグの表記ゆれ防止

新しい食材名やタグを追加する前に、必ず `recipes/*.json` をGrepし、既存の表記があればそれを再利用する。専用の辞書ファイルは作らない（Grepで十分であり、別ファイルは過剰な仕組みになるため）。

## `dish` と `tags` の使い分け

- `dish`: 同一の料理を束ねる識別子（例: `karaage`）。同じ`dish`を持つ複数のレシピ（例: クラシックな唐揚げ、スパイシー唐揚げ）が存在してよい
- `tags`: フラットな配列で、階層を作らない横断的な属性（例: `["夏", "麺類", "あっさり"]`）。カテゴリも季節も食感も同列に扱う

新しいタグを既存レシピに遡及して付与したい場合も、Grep→判定→書き換え→commitの流れで行い、専用の辞書ファイルは作らない。
```

- [ ] **Step 4: Create `docs/workflows/data-boundary.md`**

```markdown
# データの保存先の切り分けルール

- **Claude Codeのみが参照・更新するもの → このリポジトリ（`recipes/*.json`, `profile.md`)**
- **アプリからも参照・更新するもの → Supabase**（v2以降で実装。お気に入り・週間予定表・買い物リストのチェック状態等）

v2機能はまだ実装しないが、このルールは今のうちに明文化しておく。レシピ本体・好みプロファイルをSupabaseに置く変更や、その逆は行わない。
```

- [ ] **Step 5: Create `docs/workflows/step-writing-guidelines.md`**

```markdown
# 手順文の執筆ガイドライン

このアプリはYouTubeやInstagramと違い映像がない。文章だけで、映像がなくても誰にとってもわかりやすいことを最優先する。

1. **状態変化を必ず言葉で描写する**: 「きつね色になるまで」「透き通るまで」「フツフツと沸いてきたら」のように、動画なら一目でわかる変化を具体的な視覚・聴覚・嗅覚の目安表現に置き換える
2. **時間・火加減の目安を必ず併記する**: 「中火で3分ほど」のように数値の目安を添え、感覚だけに頼らせない
3. **「いつも通り」「お馴染みの」等の省略表現を禁止する**: 各手順は単独で読んでも実行できるように、省略せず具体的に書く
4. **専門用語には簡単な補足を添える**: 例:「面取り（角を削って煮崩れを防ぐ下ごしらえ）」
5. **1ステップ＝1アクションを基本にする**: 調理モード（Step3）で1ステップずつ大きく表示する設計と一貫させるため、`steps` の1要素に重要な動作を詰め込みすぎない
```

- [ ] **Step 6: Create root `CLAUDE.md`**

```markdown
# kitchen-log

料理レシピを構造化データ（JSON）として蓄積し、Claude Codeが好み・過去レシピ・公的栄養データを参照しながらアレンジ・評価するリポジトリ。

- `recipes/`: レシピ本体（JSON、1レシピ1ファイル、フラット構成）
- `profile.md`: 好みプロファイル（共通・清水・パートナー）
- `viewer/`: Astro製PWAビューア（Step2以降）

レシピを登録・編集する際は、必ず `/new-recipe` コマンドを使うこと。以下のルールを常に守る。

@docs/workflows/authoring-workflow.md
@docs/workflows/nutrition-rules.md
@docs/workflows/naming-conventions.md
@docs/workflows/data-boundary.md
@docs/workflows/step-writing-guidelines.md
```

- [ ] **Step 7: Create `viewer/CLAUDE.md`**

```markdown
# viewer/ 開発規約

このディレクトリはAstro製のPWAビューア（Step2以降で画面実装）。

- Astro Content Collections（`src/content.config.ts`）が `recipes/*.json` を読み込む。スキーマは `src/schemas/recipe.ts` を単一の情報源とする
- 開発サーバー: `npm run dev --prefix viewer`
- テスト: `npm run test --prefix viewer`（スキーマ・ロジックのユニットテスト）、`npm run validate:recipes --prefix viewer`（全レシピのスキーマ検証）
- 型チェック: `npx astro check`（`--prefix viewer` から実行、またはこのディレクトリ内で直接実行）
- コンポーネントを追加する場合、対話的な機能（お気に入り等のSupabase連携、v2以降）は個別のIslandとして実装し、静的なページ・コンポーネントと混在させすぎない
```

- [ ] **Step 8: Create `.claude/commands/new-recipe.md`**

```markdown
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
```

- [ ] **Step 9: Verify all `@import` paths in CLAUDE.md resolve**

Run: `for f in docs/workflows/authoring-workflow.md docs/workflows/nutrition-rules.md docs/workflows/naming-conventions.md docs/workflows/data-boundary.md docs/workflows/step-writing-guidelines.md; do test -f "$f" && echo "OK: $f" || echo "MISSING: $f"; done`
Expected: 5 lines, all printing `OK: ...`.

- [ ] **Step 10: Commit**

```bash
git add CLAUDE.md docs/workflows/ .claude/commands/new-recipe.md viewer/CLAUDE.md
git commit -m "Add CLAUDE.md, docs/workflows rules, and /new-recipe command"
```

---

### Task 6: Permission guardrails (`.claude/settings.json`)

**Files:**
- Create: `.claude/settings.json`
- Create: `.claude/settings.local.json.example`
- Modify: `.gitignore` (repo root — create if it does not exist)

**Interfaces:**
- Consumes: the `npm run validate:recipes --prefix viewer` command name (Task 4), the file paths `recipes/` and `profile.md`.
- Produces: the committed permission ceiling that every cloud Claude Code session is bound by (see design doc's "AI運用環境の設計" section).

- [ ] **Step 1: Create `.claude/settings.json`**

```json
{
  "permissions": {
    "allow": [
      "Write(/recipes/**)",
      "Edit(/recipes/**)",
      "Edit(/profile.md)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git status)",
      "Bash(npm run validate:recipes --prefix viewer)",
      "WebFetch"
    ]
  }
}
```

- [ ] **Step 2: Create `.claude/settings.local.json.example`**

```json
{
  "permissions": {
    "allow": [
      "Write(/viewer/**)",
      "Edit(/viewer/**)",
      "Edit(/docs/workflows/**)",
      "Bash(npm install --prefix viewer)",
      "Bash(npm run dev --prefix viewer)",
      "Bash(npm run build --prefix viewer)",
      "Bash(npm run test --prefix viewer)",
      "Bash(npx astro check)"
    ]
  }
}
```

- [ ] **Step 3: Add `.claude/settings.local.json` to `.gitignore`**

Create or append to repo-root `.gitignore`:

```
.claude/settings.local.json
CLAUDE.local.md
```

- [ ] **Step 4: Verify both settings files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json', 'utf-8')); JSON.parse(require('fs').readFileSync('.claude/settings.local.json.example', 'utf-8')); console.log('valid JSON')"`
Expected: prints `valid JSON` with no errors.

- [ ] **Step 5: Verify the gitignore rule actually works**

Run: `cp .claude/settings.local.json.example .claude/settings.local.json && git status --porcelain`
Expected: the output does NOT contain `.claude/settings.local.json` (only shows other pending changes, if any).

- [ ] **Step 6: Commit (the ignored file itself is never staged)**

```bash
git add .claude/settings.json .claude/settings.local.json.example .gitignore
git commit -m "Add permission guardrails: settings.json ceiling + local dev template"
```

---

### Task 7: profile.md

**Files:**
- Create: `profile.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the file `/new-recipe` reads in step 2 of `docs/workflows/authoring-workflow.md`.

- [ ] **Step 1: Create `profile.md`**

```markdown
# 好みプロファイル

レシピ登録・アレンジのたびに、Claude Codeが学習した内容をここに追記していく「蒸留された記憶」。

## 共通

（世帯として意識していることをここに追記していく。例: 減塩を意識したい、等）

## 清水

（個人の好みをここに追記していく）

## パートナー

（個人の好みをここに追記していく）
```

- [ ] **Step 2: Commit**

```bash
git add profile.md
git commit -m "Add profile.md for household and individual preferences"
```

---

### Task 8: GitHub Actions CI validation

**Files:**
- Create: `.github/workflows/validate-recipes.yml`

**Interfaces:**
- Consumes: `npm run validate:recipes --prefix viewer` (Task 4).
- Produces: a CI check that runs on every push/PR once this repo has a GitHub remote.

- [ ] **Step 1: Create `.github/workflows/validate-recipes.yml`**

```yaml
name: Validate recipes

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install --prefix viewer
      - run: npm run validate:recipes --prefix viewer
```

- [ ] **Step 2: Review the YAML by eye for indentation correctness**

Run: `cat .github/workflows/validate-recipes.yml`
Expected: output matches the content above exactly (2-space indentation, no tabs). This repo has no GitHub remote configured yet, so this workflow cannot be executed by GitHub Actions until the repo is pushed — that push is an explicit follow-up action outside this plan's scope, not something to do automatically here.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/validate-recipes.yml
git commit -m "Add CI workflow to validate recipes on push/PR"
```

---

## Post-plan follow-ups (not part of this plan)

- Pushing this repository to a GitHub remote (needed for Task 8's workflow to actually run, and for cloud claude.ai/code to operate on it).
- Setting up Cloudflare Pages + Cloudflare Access (explicitly out of scope per the design doc).
- Step1: validating the 4 entry points end-to-end with real recipes.
- Step2: building the actual Astro pages/components (list, detail, search, tag filter, serving-size scaling).
- Step3: the cooking-mode screen.
- v2: Supabase schema for favorites / weekly plan / shopping list.

> 補記（2026-07-13）: Step2は検索ではなく選択式絞り込みとして実装済み。Step3（調理モード）は作らないことに決定。
