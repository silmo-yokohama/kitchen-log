import { z } from 'astro/zod';
import taxonomy from '../../../masters/taxonomy.json';
import { QUALITATIVE_UNITS } from '../lib/scale';
import { INGREDIENT_PLACEHOLDER } from '../lib/render-steps';

// categories / mainIngredients / tags の値は masters/taxonomy.json を単一の情報源とする
const masterValues = (list: readonly string[], label: string) =>
  z.array(z.string().min(1)).superRefine((values, ctx) => {
    values.forEach((value, index) => {
      if (!list.includes(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `"${value}" is not listed in masters/taxonomy.json (${label})`,
        });
      }
    });
  });

const UNIT_VALUES = [
  'g', 'ml', '大さじ', '小さじ', 'カップ',
  '個', '本', '枚', '束', '片', '玉',
  '丁', 'パック', '株', '袋', '缶', 'かけ', '尾',
  '少々', '適量', 'ひとつまみ',
] as const;

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
    fiberG: z.number().nonnegative(),
    vitaminAUg: z.number().nonnegative(), // μgRAE（レチノール活性当量）
    vitaminCMg: z.number().nonnegative(),
    calciumMg: z.number().nonnegative(),
    ironMg: z.number().nonnegative(),
  })
  .strict();

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

export const recipeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    dish: z.string().min(1),
    tags: masterValues(taxonomy.tags, 'tags'), // 属性系（さっぱり・時短等）のみ。0個以上
    categories: masterValues(taxonomy.categories, 'categories').refine(
      (values) => values.length >= 1,
      { message: 'at least one category is required' },
    ),
    mainIngredients: masterValues(taxonomy.ingredients, 'ingredients').refine(
      (values) => values.length >= 1,
      { message: 'at least one main ingredient is required' },
    ),
    servings: z.number().int().positive(),
    summary: z.string().min(1), // 味・栄養の総評（詳細ページのリード文、200字程度）
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
        for (const match of step.matchAll(INGREDIENT_PLACEHOLDER)) {
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

export type Recipe = z.infer<typeof recipeSchema>;
