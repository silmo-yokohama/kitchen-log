# Recipe Step Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recipe schema's flat `steps: string[]` with a phase-grouped `stepSections` field (mirroring the existing `ingredientSections` shape), so the viewer can later render 【下ごしらえ】【調理】【盛り付け】 as separate sections, and codify the seasoning-consolidation authoring rule.

**Architecture:** A new `stepSectionSchema` (identical shape to the existing `ingredientSectionSchema`) is added to `viewer/src/schemas/recipe.ts`, and `recipeSchema.steps` is replaced by `recipeSchema.stepSections`. The one existing recipe fixture (a Step0 prototype, not a real recipe) is deleted rather than migrated, along with the CI test that required at least one recipe file to exist. The recipe-authoring template and workflow docs are updated to match.

**Tech Stack:** Zod 3, Vitest 2 (unchanged from Step0).

## Global Constraints

- Node.js >= 20 required for all `viewer/` commands.
- `stepSections` replaces `steps` entirely — no backward-compatible dual-field support. The schema requires `stepSections` and no longer recognizes `steps`.
- `stepSections[].section` values are free text, not a fixed enum — before introducing a new section name, Grep `recipes/*.json` and reuse existing wording. Recommended starter set: 下ごしらえ／調理／盛り付け（`docs/superpowers/specs/2026-07-08-recipe-step-sections-design.md`セクションB）。
- No step-level `id` field — only `ingredientSections[].items[].id` carries an id. `{{id}}` references inside step text continue to resolve only against ingredient ids.
- The seasoning-consolidation authoring rule is documentation-only guidance (`docs/workflows/step-writing-guidelines.md`), not enforced by Zod validation — per the design doc's explicit scope-out.
- Design reference: `docs/superpowers/specs/2026-07-08-recipe-step-sections-design.md`. Every task below implements a section of that document — do not re-derive decisions already made there.

---

### Task 1: Add `stepSectionSchema` and replace `steps` with `stepSections`

**Files:**
- Modify: `viewer/src/schemas/recipe.ts:24-27` (add `stepSectionSchema` after `ingredientSectionSchema`), `viewer/src/schemas/recipe.ts:52` (replace the `steps` field)
- Modify: `viewer/src/schemas/recipe.test.ts`

**Interfaces:**
- Consumes: nothing new (extends the existing `viewer/src/schemas/recipe.ts` module).
- Produces: `recipeSchema` now requires `stepSections: { section: string; steps: string[] }[]` instead of `steps: string[]`. `export type Recipe` (unchanged export name) reflects this new shape. Task 3 and Task 4 reference this field name (`stepSections`) in the template and docs.

- [ ] **Step 1: Create the feature branch**

Run: `git checkout master && git pull && git checkout -b feat/recipe-step-sections`
Expected: new branch created from up-to-date `master`.

- [ ] **Step 2: Update the schema test fixture to use `stepSections`**

Replace the full contents of `viewer/src/schemas/recipe.test.ts` with:

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
  stepSections: [
    {
      section: '下ごしらえ',
      steps: ['{{sauce_sake}}を混ぜて合わせ調味料を作る。'],
    },
    {
      section: '調理',
      steps: ['{{stirfry_sake}}を加え、{{salt}}で味を調える。'],
    },
  ],
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

  it('rejects a recipe with an empty stepSections array', () => {
    const broken = { ...validRecipe, stepSections: [] };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects a stepSection with no steps', () => {
    const broken = {
      ...validRecipe,
      stepSections: [{ section: '下ごしらえ', steps: [] }],
    };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run test --prefix viewer`
Expected: FAIL — `recipeSchema` still requires a `steps` field, which `validRecipe` no longer provides, so `accepts a valid recipe` fails (and the two new `stepSections` tests fail because the field isn't recognized yet).

- [ ] **Step 4: Add `stepSectionSchema` and update `recipeSchema` in `viewer/src/schemas/recipe.ts`**

Add this new schema right after `ingredientSectionSchema` (i.e. after line 27):

```ts
const stepSectionSchema = z.object({
  section: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
});
```

Then, inside `recipeSchema`'s object (currently line 52), replace:

```ts
    steps: z.array(z.string().min(1)).min(1),
```

with:

```ts
    stepSections: z.array(stepSectionSchema).min(1),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test --prefix viewer`
Expected: PASS — all 8 tests green.

- [ ] **Step 6: Commit**

```bash
git add viewer/src/schemas/recipe.ts viewer/src/schemas/recipe.test.ts
git commit -m "Replace flat steps with phase-grouped stepSections in recipe schema"
```

---

### Task 2: Remove the prototype recipe and its CI safety-net test

**Files:**
- Delete: `recipes/hiyashi-chuka-marutai.json`
- Modify: `viewer/tests/recipes.validate.test.ts`

**Interfaces:**
- Consumes: `recipeSchema` from `viewer/src/schemas/recipe.ts` (Task 1).
- Produces: `recipes/` may now legitimately be empty; `npm run validate:recipes --prefix viewer` no longer asserts a minimum recipe count.

- [ ] **Step 1: Run validate:recipes to confirm the expected failure**

Run: `npm run validate:recipes --prefix viewer`
Expected: FAIL — `recipes/hiyashi-chuka-marutai.json matches recipeSchema` fails, because that file still uses the old flat `steps` field which Task 1's schema no longer accepts.

- [ ] **Step 2: Delete the prototype recipe**

Delete `recipes/hiyashi-chuka-marutai.json` (it was a Step0 fixture used only to prove the Astro Content Collection wiring worked — not a real recipe; real recipes are added via `/new-recipe` going forward).

- [ ] **Step 3: Run validate:recipes to confirm the next expected failure**

Run: `npm run validate:recipes --prefix viewer`
Expected: FAIL — `has at least one recipe to validate` fails, because `recipes/` is now empty (`recipeFiles.length` is `0`).

- [ ] **Step 4: Remove the "at least one recipe" test**

In `viewer/tests/recipes.validate.test.ts`, remove this block (currently lines 13-15):

```ts
  it('has at least one recipe to validate', () => {
    expect(recipeFiles.length).toBeGreaterThan(0);
  });

```

so the file becomes:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { recipeSchema } from '../src/schemas/recipe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const recipesDir = join(__dirname, '..', '..', 'recipes');

const recipeFiles = readdirSync(recipesDir).filter((name) => name.endsWith('.json'));

describe('every recipe file in recipes/', () => {
  const parsedByFile = recipeFiles.map((fileName) => {
    const raw = readFileSync(join(recipesDir, fileName), 'utf-8');
    return { fileName, parsed: JSON.parse(raw) };
  });

  for (const { fileName, parsed } of parsedByFile) {
    it(`${fileName} matches recipeSchema`, () => {
      const result = recipeSchema.safeParse(parsed);
      if (!result.success) {
        throw new Error(`${fileName} failed validation: ${result.error.message}`);
      }
      expect(result.success).toBe(true);
    });

    it(`${fileName}'s id matches its filename`, () => {
      expect(parsed.id).toBe(basename(fileName, '.json'));
    });
  }

  it('has no duplicate ids across recipe files', () => {
    const seen = new Map();
    const duplicates = [];
    for (const { fileName, parsed } of parsedByFile) {
      if (seen.has(parsed.id)) {
        duplicates.push(`"${parsed.id}" used by both ${seen.get(parsed.id)} and ${fileName}`);
      } else {
        seen.set(parsed.id, fileName);
      }
    }
    expect(duplicates).toEqual([]);
  });
});
```

- [ ] **Step 5: Run validate:recipes to confirm it passes**

Run: `npm run validate:recipes --prefix viewer`
Expected: PASS — 0 recipe files means the per-file loop generates no tests, and `has no duplicate ids across recipe files` passes trivially on an empty list.

- [ ] **Step 6: Commit**

```bash
git add recipes/hiyashi-chuka-marutai.json viewer/tests/recipes.validate.test.ts
git commit -m "Remove Step0 prototype recipe and its minimum-count CI test"
```

---

### Task 3: Update the recipe-authoring template

**Files:**
- Modify: `docs/workflows/recipe-template.json`

**Interfaces:**
- Consumes: nothing (static template consumed by human/AI authors, not imported by code).
- Produces: the template `/new-recipe` step 4 copies when starting a new recipe file, now shaped with `stepSections` instead of `steps`.

- [ ] **Step 1: Replace the `steps` field with `stepSections`**

In `docs/workflows/recipe-template.json`, replace:

```json
  "steps": [""],
```

with:

```json
  "stepSections": [
    {
      "section": "",
      "steps": [""]
    }
  ],
```

- [ ] **Step 2: Verify the file is still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('docs/workflows/recipe-template.json', 'utf-8')); console.log('valid JSON')"`
Expected: prints `valid JSON` with no errors.

- [ ] **Step 3: Commit**

```bash
git add docs/workflows/recipe-template.json
git commit -m "Update recipe template to use stepSections"
```

---

### Task 4: Update authoring workflow docs

**Files:**
- Modify: `docs/workflows/authoring-workflow.md`
- Modify: `docs/workflows/naming-conventions.md`
- Modify: `docs/workflows/step-writing-guidelines.md`
- Modify: `.claude/commands/new-recipe.md`

**Interfaces:**
- Consumes: nothing (prose only).
- Produces: the instructions any future `/new-recipe` session (cloud or local) reads, now describing `stepSections` instead of `steps`.

- [ ] **Step 1: Update `docs/workflows/authoring-workflow.md`**

Replace:

```markdown
5. `ingredientSections`（フェーズ別・id付き）と `steps`（`{{id}}` 参照）を組み立てる。手順文は `step-writing-guidelines.md` に従う
```

with:

```markdown
5. `ingredientSections`（フェーズ別・id付き）と `stepSections`（下ごしらえ／調理／盛り付け等のフェーズ別、`{{id}}` 参照）を組み立てる。手順文は `step-writing-guidelines.md` に従う
```

- [ ] **Step 2: Update `docs/workflows/naming-conventions.md`**

Replace:

```markdown
## 食材名・タグの表記ゆれ防止

新しい食材名やタグを追加する前に、必ず `recipes/*.json` をGrepし、既存の表記があればそれを再利用する。専用の辞書ファイルは作らない（Grepで十分であり、別ファイルは過剰な仕組みになるため）。
```

with:

```markdown
## 食材名・タグ・手順セクション名の表記ゆれ防止

新しい食材名・タグ・`stepSections`のセクション名（下ごしらえ／調理／盛り付け等、固定enumではなく自由記述）を追加する前に、必ず `recipes/*.json` をGrepし、既存の表記があればそれを再利用する。専用の辞書ファイルは作らない（Grepで十分であり、別ファイルは過剰な仕組みになるため）。
```

- [ ] **Step 3: Add rule 6 to `docs/workflows/step-writing-guidelines.md`**

Append after rule 5 (end of file):

```markdown
6. **同じタイミングで加える調味料は下ごしらえでまとめる**: 複数の調味料を同時に加える場合、下ごしらえフェーズの手順で先に混ぜ合わせて「合わせ調味料」を作っておく（調理中に慌てて計量・混合しなくて済むようにするため）。加えるタイミングが異なる、混ぜると風味や食感が損なわれる等の理由でまとめられない場合は、下ごしらえでまとめず個別に調理フェーズの手順で加え、その手順文に理由を一言添える（例:「酒は焼く直前に加えることで香りを飛ばさない」）。
```

- [ ] **Step 4: Update `.claude/commands/new-recipe.md`**

Replace:

```markdown
5. `ingredientSections`（フェーズ別・id付き）と `steps`（`{{id}}`参照、`docs/workflows/step-writing-guidelines.md`準拠）を組み立てる
```

with:

```markdown
5. `ingredientSections`（フェーズ別・id付き）と `stepSections`（下ごしらえ／調理／盛り付け等のフェーズ別、`{{id}}`参照、`docs/workflows/step-writing-guidelines.md`準拠）を組み立てる
```

- [ ] **Step 5: Verify no stale references remain**

Run: `grep -rn '"steps"' docs/workflows .claude/commands`
Expected: no matches (the only remaining occurrences of the word "steps" are inside `stepSections`/`"steps": [...]` nested under a section, or in prose like "step-writing-guidelines" — confirm by eye that nothing describes a top-level flat `steps` field anymore).

- [ ] **Step 6: Commit**

```bash
git add docs/workflows/authoring-workflow.md docs/workflows/naming-conventions.md docs/workflows/step-writing-guidelines.md .claude/commands/new-recipe.md
git commit -m "Update authoring docs and /new-recipe for stepSections"
```

---

### Task 5: Full verification and merge

**Files:** none (verification + merge only)

**Interfaces:**
- Consumes: all commits from Tasks 1-4 on the `feat/recipe-step-sections` branch.
- Produces: the merged `master` branch with the new schema live.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test --prefix viewer`
Expected: PASS.

- [ ] **Step 2: Run the recipe validation suite**

Run: `npm run validate:recipes --prefix viewer`
Expected: PASS.

- [ ] **Step 3: Run the Astro type check**

Run: `npx --prefix viewer astro check`
Expected: exits 0 with no errors (confirms `content.config.ts` still loads correctly against an empty `recipes/` collection).

- [ ] **Step 4: Merge to master**

Invoke `/merge-recipe`. Since all changes are already committed on `feat/recipe-step-sections`, this pushes the branch, opens a PR, waits for CI, and merges after user confirmation (per `.claude/commands/merge-recipe.md`).
