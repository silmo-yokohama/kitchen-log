# Step2 Viewer Implementation Plan

> 補記（2026-07-13）: 本計画は実行済み（PR #15）。以後のビジュアル・実装の正は `viewer/` 側であり、`mockups/*.html` は合意時点の記録。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** モックアップ2画面をAstroビューアとして実装し、選択式絞り込み・人前スケーリング・PWAマニフェストまで含むStep2を完成させる（デプロイのダッシュボード操作を除く）。

**Architecture:** 全ページ静的生成（Astro Content Collections）。表示ロジックは `viewer/src/lib/` の純粋関数（vitestでTDD）に集約し、Astroコンポーネントは薄く保つ。対話部分（絞り込み・人前・dialog×2）は独立した小さなvanilla TSスクリプト。ビジュアルの正は `mockups/*.html`（合意済み）で、CSS・マークアップ構造はそこから移植する。

**Tech Stack:** Astro 5 / Zod / vitest / vanilla TS。UIフレームワーク追加なし。

## Global Constraints

- テキスト色は `#444444` 一色、影なし完全フラット、letter-spacing normal（design-md準拠。mockups/のCSSが正）
- アプリの名乗りは「陽平のレシピ帳」（title・ヘッダー・フッター・マニフェスト）
- 対話機能は個別Island（viewer/CLAUDE.md）。静的部分にJSを出さない
- Service Workerは実装しない（Step0設計書: オフラインキャッシュ不要）
- コミットメッセージは日本語（language-policy.md）
- 作業ブランチ: `feature/step2-viewer`（既存。新規ブランチは作らない）

---

### Task 1: マスタ新設＋スキーマ変更＋バックフィル

**Files:**
- Create: `masters/taxonomy.json`
- Modify: `viewer/src/schemas/recipe.ts`（categories / mainIngredients 追加、マスタ照合）
- Modify: `viewer/src/schemas/recipe.test.ts`（フィクスチャ＋マスタ照合テスト）
- Modify: `docs/workflows/recipe-template.json`
- Modify: `recipes/kimchi-chige-chicken.json`, `recipes/sasami-komatsuna-amakara-itame.json`

**Interfaces:**
- Produces: `recipeSchema` に `categories: string[]`（min 1）, `mainIngredients: string[]`（min 1）。`tags` は属性専用（min 0）。全てマスタ照合。

- [ ] **Step 1: masters/taxonomy.json を作成**

```json
{
  "categories": ["鍋料理", "韓国風", "副菜"],
  "ingredients": ["鶏肉", "キムチ", "豆腐", "小松菜"],
  "tags": ["うどん入り", "時短", "甘辛"]
}
```

- [ ] **Step 2: 失敗するテストを追加**（フィクスチャに `categories: ['副菜'], mainIngredients: ['鶏肉']` を追加した上で）

```ts
it('rejects a category not in the taxonomy master', () => {
  const broken = { ...validRecipe, categories: ['存在しないカテゴリ'] };
  expect(recipeSchema.safeParse(broken).success).toBe(false);
});
it('rejects a main ingredient not in the taxonomy master', () => {
  const broken = { ...validRecipe, mainIngredients: ['存在しない素材'] };
  expect(recipeSchema.safeParse(broken).success).toBe(false);
});
it('rejects a tag not in the taxonomy master', () => {
  const broken = { ...validRecipe, tags: ['存在しないタグ'] };
  expect(recipeSchema.safeParse(broken).success).toBe(false);
});
it('rejects a recipe without categories', () => {
  const broken = { ...validRecipe, categories: [] };
  expect(recipeSchema.safeParse(broken).success).toBe(false);
});
```

フィクスチャの `tags: ['タグ1']` はマスタ照合で通らなくなるため `tags: ['時短']` に変更する。

- [ ] **Step 3: テストが失敗することを確認** — `npm run test --prefix viewer` → 新テストがFAIL
- [ ] **Step 4: スキーマ実装**

```ts
import taxonomy from '../../../masters/taxonomy.json';

const inMaster = (list: readonly string[], label: string) =>
  z.array(z.string().min(1)).superRefine((values, ctx) => {
    values.forEach((v, i) => {
      if (!list.includes(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `"${v}" is not in masters/taxonomy.json ${label}` });
      }
    });
  });
// recipeSchema:
//   categories: inMaster(taxonomy.categories, 'categories').refine(a => a.length >= 1),
//   mainIngredients: inMaster(taxonomy.ingredients, 'ingredients').refine(a => a.length >= 1),
//   tags: inMaster(taxonomy.tags, 'tags'),
```

- [ ] **Step 5: バックフィル**（tags から振り分け。summary等は変更しない）
  - kimchi: `categories: ["鍋料理","韓国風"]`, `mainIngredients: ["鶏肉","キムチ","豆腐"]`, `tags: ["うどん入り"]`
  - sasami: `categories: ["副菜"]`, `mainIngredients: ["鶏肉","小松菜"]`, `tags: ["時短","甘辛"]`
  - `updatedAt` は変更しない（表示内容の変更ではなくデータ構造の再分類のため）
  - recipe-template.json に `"categories": [], "mainIngredients": []` を追加
- [ ] **Step 6: 全テストPASSを確認** — `npm run test --prefix viewer`
- [ ] **Step 7: コミット** — `マスタ（taxonomy）新設とカテゴリー・素材・タグの3分割`

### Task 2: ドキュメント整合性の更新

**Files:**
- Modify: `docs/workflows/naming-conventions.md`（辞書禁止→マスタ化の上書き、tags意味の変更）
- Modify: `docs/workflows/authoring-workflow.md`（登録の流れにマスタ照合ステップ）
- Modify: `.claude/commands/new-recipe.md`（手順4にマスタ照合、手順7にsummary/拡張栄養素 — PR#13の反映漏れ修正）
- Modify: `CLAUDE.md`（リポジトリ構成に `masters/` を追記）

- [ ] **Step 1: naming-conventions.md 更新** — 「表記ゆれ防止」節を分割: categories/mainIngredients/tagsは `masters/taxonomy.json` 照合（スキーマで強制）、新しい値は先にマスタへ追加。食材名（`name`）・`dish`・手順セクション名は従来通りGrep。「専用の辞書ファイルは作らない」の記述を「絞り込み用の3ファセットに限りマスタを持つ（Step2で決定変更）」に改める
- [ ] **Step 2: authoring-workflow.md の登録の流れ更新** — 手順4を「recipes/*.json をGrepし食材名の表記を合わせ、カテゴリー・素材・タグは masters/taxonomy.json と照合（無ければマスタに追加）」に
- [ ] **Step 3: new-recipe.md 更新** — 手順4に同上、手順7を「栄養価（拡張栄養素5項目含む）を算出し、benefits/cautions/balance/summary を記述」に
- [ ] **Step 4: CLAUDE.md 更新** — 構成リストに `masters/`: 絞り込み用の許可値マスタ（カテゴリー・素材・タグ） を追加
- [ ] **Step 5: コミット** — `ドキュメント整合性: マスタ導入の反映とnew-recipeコマンドの追随漏れ修正`

### Task 3: lib/scale.ts（分量スケーリング・表記）

**Files:**
- Create: `viewer/src/lib/scale.ts`, Test: `viewer/src/lib/scale.test.ts`

**Interfaces:**
- Produces: `formatAmount(amount: number | null, unit: string): string` / `scaleAmount(amount: number | null, unit: string, factor: number): number | null` / `formatScaled(amount, unit, factor): string`
- 丸め: 大さじ・小さじ・カップ=1/4刻み（下限1/4）、g・ml=整数・100以上は5刻み（下限1）、個数系=1/2刻み（下限1/2）、少々・適量・ひとつまみ=そのまま
- 表記: 0.25→`1/4`、0.5→`1/2`、0.75→`3/4`、1.5→`1と1/2`。さじ系は`大さじ1と1/2`、その他は`450g`・`1と1/2丁`

- [ ] **Step 1: 失敗するテスト**（代表ケース）

```ts
expect(formatAmount(1.5, '大さじ')).toBe('大さじ1と1/2');
expect(formatAmount(0.5, '大さじ')).toBe('大さじ1/2');
expect(formatAmount(300, 'g')).toBe('300g');
expect(formatAmount(null, '少々')).toBe('少々');
expect(formatAmount(1, '丁')).toBe('1丁');
expect(scaleAmount(1.5, '大さじ', 1.5)).toBe(2.25);   // → 大さじ2と1/4
expect(scaleAmount(500, 'ml', 1.5)).toBe(750);
expect(scaleAmount(300, 'g', 0.5)).toBe(150);
expect(scaleAmount(130, 'g', 1.1)).toBe(145);          // >=100は5刻み
expect(scaleAmount(1, '丁', 1.5)).toBe(1.5);           // → 1と1/2丁
expect(scaleAmount(2, '片', 0.5)).toBe(1);
expect(scaleAmount(null, '適量', 2)).toBeNull();
expect(scaleAmount(0.5, '大さじ', 0.25)).toBe(0.25);   // 下限
expect(formatScaled(1.5, '大さじ', 1.5)).toBe('大さじ2と1/4');
```

- [ ] **Step 2: FAIL確認 → 実装 → PASS確認**（`npx vitest run src/lib/scale.test.ts` in viewer）
- [ ] **Step 3: コミット** — `分量スケーリング・調理慣習表記の純粋関数を追加`

### Task 4: lib/render-steps.ts（手順文の材料展開）

**Files:**
- Create: `viewer/src/lib/render-steps.ts`, Test: `viewer/src/lib/render-steps.test.ts`

**Interfaces:**
- Produces:
```ts
type IngredientRef = { kind: 'ingredient'; id: string; displayName: string; amount: number | null; unit: string; withAmount: boolean };
type StepPart = { kind: 'text'; text: string } | IngredientRef;
function expandStepSections(recipe: { ingredientSections: ..., stepSections: ... }): { section: string; steps: StepPart[][] }[];
```
- ルール: レシピ全体を通しての初出のみ `withAmount: true`。再掲は名前のみ。単位が少々/適量/ひとつまみの材料は常に `withAmount: false` かつ名前の `（…）` 役割書きを除去した `displayName`（例: `塩（下味用）`→`塩`）。役割書き除去は qualitative のみ（`鶏手羽元（骨抜き）` はそのまま）

- [ ] **Step 1: 失敗するテスト**（キムチチゲの実データを縮約したフィクスチャで、初出/再掲/役割書き除去/未知idエラーの4観点）

```ts
const sections = expandStepSections(recipe);
const first = sections[0].steps[0]; // '{{chicken}}を切り、{{salt-marinade}}をふる。'
expect(first[0]).toMatchObject({ kind: 'ingredient', id: 'chicken', withAmount: true, displayName: '鶏手羽元（骨抜き）' });
expect(first[2]).toMatchObject({ kind: 'ingredient', id: 'salt-marinade', withAmount: false, displayName: '塩' });
const later = sections[1].steps[0]; // '{{chicken}}を焼く。'
expect(later[0]).toMatchObject({ id: 'chicken', withAmount: false });
```

- [ ] **Step 2: FAIL確認 → 実装（`/\{\{([^{}]+)\}\}/g` でsplit、Setで初出管理）→ PASS確認**
- [ ] **Step 3: コミット** — `手順文の材料参照展開（初出のみ分量・役割書きの畳み）を追加`

### Task 5: lib/nutrition-reference.ts（1食の目安・高低判定・レーダー座標）

**Files:**
- Create: `viewer/src/lib/nutrition-reference.ts`, Test: `viewer/src/lib/nutrition-reference.test.ts`

**Interfaces:**
- Produces:
```ts
export const MEAL_REFERENCE = { energyKcal: 775, proteinG: 19, fatG: 22, carbohydrateG: 111, saltG: 2.3, fiberG: 6.5, vitaminAUg: 260, vitaminCMg: 33, calciumMg: 240, ironMg: 3.0 } as const; // 食事摂取基準(2025)成人男女平均÷3
export function classifyLevel(value: number, ref: number): 'high' | 'normal' | 'low'; // >=1.2 high, <=0.8 low
export const RADAR_AXES: { key: keyof Nutrition; label: string; dictKey: string }[]; // protein, fiber, vitC, calcium, iron, vitA の6軸（モックアップの並び）
export function radarGeometry(nutrition: Nutrition): { dataPoints: string; dots: { x: number; y: number }[] };
// cx=170, cy=125, r = min(value/ref, 5/3) * 54（=100%が54、頭打ち90）
```

- [ ] **Step 1: 失敗するテスト**

```ts
expect(classifyLevel(762, 775)).toBe('normal');
expect(classifyLevel(46.1, 19)).toBe('high');
expect(classifyLevel(43.3, 111)).toBe('low');
const g = radarGeometry(kimchiNutrition);
expect(g.dots[0]).toEqual({ x: 170, y: 35 });        // たんぱく質: 頭打ち r=90
expect(g.dots).toHaveLength(6);
```

- [ ] **Step 2: FAIL確認 → 実装 → PASS確認**（座標は小数1桁に丸め）
- [ ] **Step 3: コミット** — `1食の目安定数・高低判定・レーダー座標計算を追加`

### Task 6: lib/source-link.ts（出典ドメイン・YouTube ID）

**Files:**
- Create: `viewer/src/lib/source-link.ts`, Test: `viewer/src/lib/source-link.test.ts`

**Interfaces:**
- Produces: `extractDomain(url: string): string`（`www.`除去したhostname）/ `extractYouTubeId(url: string): string | null`（`youtu.be/<id>`・`watch?v=`・`shorts/` 対応）

- [ ] **Step 1: 失敗するテスト**

```ts
expect(extractDomain('https://youtu.be/SPJFAtNWu2U')).toBe('youtu.be');
expect(extractDomain('https://www.kurashiru.com/recipes/x')).toBe('kurashiru.com');
expect(extractYouTubeId('https://youtu.be/SPJFAtNWu2U')).toBe('SPJFAtNWu2U');
expect(extractYouTubeId('https://youtube.com/watch?v=MMzYq7-8SWc&si=x')).toBe('MMzYq7-8SWc');
expect(extractYouTubeId('https://cookpad.com/recipe/1')).toBeNull();
```

- [ ] **Step 2: FAIL確認 → 実装（URL APIベース）→ PASS確認**
- [ ] **Step 3: コミット** — `出典URLのドメイン抽出・YouTube動画ID抽出を追加`

### Task 7: Base.astroレイアウト・デザイントークン・マニフェスト

**Files:**
- Create: `viewer/src/layouts/Base.astro`（共通head・デザイントークン・フォント・Digits @font-face・共通CSS）
- Create: `viewer/public/manifest.webmanifest`, `viewer/public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`（180px）
- Create: `viewer/src/styles/global.css`（mockupsの共通CSS: tokens, .wrap, .en-label, タグ色5種, focus-visible等）

- [ ] **Step 1: global.css / Base.astro を mockups/index.html・recipe-detail.html の`<style>`共通部から移植**（トークン・フォントスタックは一字一句同じに。ページ固有CSSは各ページ/コンポーネントのscoped styleへ）
- [ ] **Step 2: アイコンPNG生成** — Pythonのzlib/struct（stdlibのみ）で「白地＋コーラル`#fb5c5c`の円」のPNGを192/512/180pxで生成するワンショットスクリプトをscratchpadで実行し、成果物のみコミット
- [ ] **Step 3: manifest.webmanifest**

```json
{
  "name": "陽平のレシピ帳",
  "short_name": "kitchen-log",
  "display": "standalone",
  "start_url": "/",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: `npx astro check`（viewer内）でエラー0を確認 → コミット** — `共通レイアウト・デザイントークン・PWAマニフェストを追加`

### Task 8: 一覧ページ（RecipeCard・FilterPanel・index.astro）

**Files:**
- Create: `viewer/src/components/RecipeCard.astro`, `viewer/src/components/FilterPanel.astro`, `viewer/src/pages/index.astro`

**Interfaces:**
- RecipeCard props: `{ recipe: CollectionEntry<'recipes'> }`。カード全体が`/recipes/<id>/`へのリンク。`data-categories`/`data-ingredients`/`data-tags`（カンマ区切り）を持つ。NEWバッジは`createdAt`が14日以内
- FilterPanel props: `{ facets: { categories: string[]; ingredients: string[]; tags: string[] } }`（**使用中の値のみ**。pages側で全レシピから集計して渡す）
- 絞り込みJS（FilterPanel内`<script>`）: チップの`aria-pressed`をトグル→ファセット内OR・ファセット間ANDで`.recipe-list li`の`hidden`切替→ URLSearchParams（`categories=a,b`形式）へ`history.replaceState`。初期化時はURLから復元。0件時は`#no-results`を表示

- [ ] **Step 1: マークアップ・CSSを mockups/index.html から移植**（ヘッダー「陽平のレシピ帳」・ティッカー・カード・タグ5色。件数・最終更新はレシピデータから算出）
- [ ] **Step 2: FilterPanelを新規デザイン** — ティッカー下の白背景ブロックに「カテゴリー／素材／タグ」の3行、各行にチップ（`<button aria-pressed>`、選択時は`#444`背景＋白文字）。design-mdトーン（フラット・pill）を踏襲
- [ ] **Step 3: `npm run build --prefix viewer` が通り、dist/index.html にカード2枚とdata属性が出ていることをgrepで確認**
- [ ] **Step 4: コミット** — `一覧ページ: カード一覧と選択式絞り込み（カテゴリー・素材・タグ）`

### Task 9: 詳細ページ静的部（レイアウト・材料・手順・栄養・レーダー）

**Files:**
- Create: `viewer/src/components/IngredientSections.astro`, `StepSections.astro`, `NutritionPanel.astro`, `viewer/src/pages/recipes/[id].astro`

**Interfaces:**
- `[id].astro`: `getStaticPaths` = 全レシピ。構成はmockups/recipe-detail.htmlの通り（タイトル→タグ→人前→リード（summary）→元レシピリンク（extractDomain）→登録日→材料→作り方→栄養）
- IngredientSections: 材料の`amount`/`unit`を`<span class="amount" data-amount data-unit>`で出力（Task 10のスケーリングが書き換え対象にする）
- StepSections: `expandStepSections`の結果を描画。`withAmount`の材料は`<strong>名前<span class="amount" data-amount data-unit>分量</span></strong>`、再掲は`<strong>名前</strong>`。フェーズ冒頭の「この工程で使うもの」チップ・ゴースト数字・圏点（`cue`はデータに無いので**圏点は見送り、CSSクラスのみ残す**）
- NutritionPanel: タイル5枚（`classifyLevel`で`is-high`/`is-low`）＋レーダーSVG（`radarGeometry`・`RADAR_AXES`）。軸ラベルは`.ax-btn`（Task 10のdialogが拾う）

- [ ] **Step 1: マークアップ・CSSを mockups/recipe-detail.html から移植**（レーダーのグリッド・破線はモック同様の固定座標、データ多角形・点のみ`radarGeometry`で計算）
- [ ] **Step 2: ビルドして dist/recipes/kimchi-chige-chicken/index.html に主要要素（リード文・レーダーpolygon・タイルis-high）が出ることをgrepで確認**
- [ ] **Step 3: コミット** — `詳細ページ: 材料・作り方・栄養タイル・レーダーの静的表示`

### Task 10: 詳細ページの対話部（人前セレクタ・栄養素dialog・動画modal）

**Files:**
- Create: `viewer/src/components/ServingsSelector.astro`, `NutrientDialog.astro`, `VideoModal.astro`
- Modify: `viewer/src/pages/recipes/[id].astro`（組み込み）

**Interfaces:**
- ServingsSelector props: `{ servings: number }`。1〜6のセグメントボタン。`<script>`が`import { formatScaled } from '../lib/scale'`し、`document.querySelectorAll('span.amount[data-amount]')`を`formatScaled(+el.dataset.amount, el.dataset.unit, n/servings)`で書き換え。栄養は1人前あたりで不変の注記付き
- NutrientDialog: 栄養素6種の共通説明辞書（モックのNUTRIENTSをそのまま）＋`<dialog>`。`.ax-btn[data-nutrient]`のclick/Enter/Spaceで開く
- VideoModal: `extractYouTubeId(source.url)`が非nullのときのみ出力。FAB＋`<dialog>`＋pause/resume（postMessage・enablejsapi=1・nocookie・origin付与）。モックのJSを移植

- [ ] **Step 1: 3コンポーネントをモックのHTML/JSから移植し[id].astroに組み込む**
- [ ] **Step 2: ビルド確認（動画FABはキムチチゲ・ささみ両方に出る=両方YouTube）→ `npx astro check` エラー0**
- [ ] **Step 3: コミット** — `詳細ページ: 人前スケーリング・栄養素説明・参考動画モーダル`

### Task 11: 検証・PR

- [ ] **Step 1: 全テスト** — `npm run test --prefix viewer` 全PASS
- [ ] **Step 2: `npx astro check` エラー0、`npm run build --prefix viewer` 成功**
- [ ] **Step 3: `npm run preview --prefix viewer` をバックグラウンド起動し、`curl`で `/`・`/recipes/kimchi-chige-chicken/`・`/recipes/sasami-komatsuna-amakara-itame/`・`/manifest.webmanifest` の200と主要文字列（陽平のレシピ帳・絞り込みチップ・data-amount・レーダーpolygon）を確認して停止**
- [ ] **Step 4: push → PR作成（テンプレート確認）→ `gh pr checks --watch` でCI成功を確認。マージはしない（ユーザー承認待ち）**

## Self-Review 結果

- スペック網羅: 画面/URL=T7-10、マスタ/スキーマ/バックフィル=T1、文書更新=T2、絞り込み=T8、スケーリング=T3+T10、レンダリングルール=T4、栄養定数=T5、マニフェスト=T7、テスト=各タスク+T11、デプロイ=スコープ外（ユーザー共同、PR後）✓
- 圏点（cue）はモックにあるがデータに存在しない装飾のため、Step2ではCSSのみ用意し本文への適用は見送る（スキーマに手を広げない。将来「目安表現の強調」をやるならデータ設計から）— 設計書の「未確定事項」相当として明記
- 型整合: `formatScaled`（T3）をT10が、`expandStepSections`（T4）をT9が、`radarGeometry`/`classifyLevel`（T5）をT9が、`extractDomain`/`extractYouTubeId`（T6）をT9/T10が消費 ✓
