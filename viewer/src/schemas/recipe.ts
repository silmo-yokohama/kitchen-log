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

const stepSectionSchema = z.object({
  section: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
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
    stepSections: z.array(stepSectionSchema).min(1),
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
