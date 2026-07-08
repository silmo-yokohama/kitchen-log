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
});
