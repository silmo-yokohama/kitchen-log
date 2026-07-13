import { describe, it, expect } from 'vitest';
import { recipeSchema } from './recipe';

const validRecipe = {
  id: 'test-recipe',
  title: 'テストレシピ',
  dish: 'test-dish',
  tags: ['時短'],
  categories: ['副菜'],
  mainIngredients: ['鶏肉'],
  servings: 2,
  summary: '甘辛の味付けでご飯が進む一品。たんぱく質がしっかり摂れるので、忙しい日の夕食にも向く。',
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
    fiberG: 4.2,
    vitaminAUg: 120,
    vitaminCMg: 25,
    calciumMg: 80,
    ironMg: 1.8,
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

  it('accepts a valid source.url', () => {
    const withUrl = {
      ...validRecipe,
      source: { type: 'url', url: 'https://recipe.rakuten.co.jp/recipe/1710067789/' },
    };
    const result = recipeSchema.safeParse(withUrl);
    expect(result.success).toBe(true);
  });

  it('rejects a malformed source.url', () => {
    const broken = { ...validRecipe, source: { type: 'url', url: 'not-a-valid-url' } };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

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

  it('rejects a recipe without main ingredients', () => {
    const broken = { ...validRecipe, mainIngredients: [] };
    expect(recipeSchema.safeParse(broken).success).toBe(false);
  });

  it('accepts an empty tags array', () => {
    const noTags = { ...validRecipe, tags: [] };
    expect(recipeSchema.safeParse(noTags).success).toBe(true);
  });

  it('rejects a nutrition object missing the extended nutrient fields', () => {
    const { fiberG, ...withoutFiber } = validRecipe.nutrition;
    const broken = { ...validRecipe, nutrition: withoutFiber };
    const result = recipeSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it('rejects a recipe without a summary', () => {
    const { summary, ...withoutSummary } = validRecipe;
    const result = recipeSchema.safeParse(withoutSummary);
    expect(result.success).toBe(false);
  });

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
});
