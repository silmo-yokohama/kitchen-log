// 手順文の {{id}} 参照を材料情報に展開する（設計書「手順文のレンダリングルール」参照）
// - レシピ全体を通しての初出のみ withAmount: true（分量付き表示）
// - 少々/適量/ひとつまみ の材料は常に分量なし・名前の役割書き（…）を除去

import { QUALITATIVE_UNITS } from './scale';
import type { Recipe } from '../schemas/recipe';

// スキーマ（単一の情報源）から型を導出する
export type IngredientItem = Recipe['ingredientSections'][number]['items'][number];

/** 手順文中の材料参照の構文。スキーマ検証（recipe.ts）と共有する */
export const INGREDIENT_PLACEHOLDER = /\{\{([^{}]+)\}\}/g;

/** 名前の役割書き「（下味用）」等を除去する（手順文・チップの表示用） */
export function stripRoleAnnotation(name: string): string {
  return name.replace(/（[^（）]*）/g, '').trim();
}

export type IngredientRef = {
  kind: 'ingredient';
  id: string;
  displayName: string;
  amount: number | null;
  unit: string;
  withAmount: boolean;
};

export type StepPart = { kind: 'text'; text: string } | IngredientRef;

export type RecipeLike = {
  ingredientSections: { section: string; items: IngredientItem[] }[];
  stepSections: { section: string; steps: string[] }[];
};

export function expandStepSections(recipe: RecipeLike): { section: string; steps: StepPart[][] }[] {
  const byId = new Map<string, IngredientItem>();
  for (const section of recipe.ingredientSections) {
    for (const item of section.items) byId.set(item.id, item);
  }

  const seen = new Set<string>();

  return recipe.stepSections.map((section) => ({
    section: section.section,
    steps: section.steps.map((step) => {
      const parts: StepPart[] = [];
      let lastIndex = 0;
      for (const match of step.matchAll(INGREDIENT_PLACEHOLDER)) {
        const id = match[1];
        const item = byId.get(id);
        if (!item) throw new Error(`unknown ingredient id "${id}" referenced in step`);
        if (match.index > lastIndex) {
          parts.push({ kind: 'text', text: step.slice(lastIndex, match.index) });
        }
        const qualitative = QUALITATIVE_UNITS.includes(item.unit);
        parts.push({
          kind: 'ingredient',
          id,
          displayName: qualitative ? stripRoleAnnotation(item.name) : item.name,
          amount: item.amount,
          unit: item.unit,
          withAmount: qualitative ? false : !seen.has(id),
        });
        seen.add(id);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < step.length) parts.push({ kind: 'text', text: step.slice(lastIndex) });
      return parts;
    }),
  }));
}
