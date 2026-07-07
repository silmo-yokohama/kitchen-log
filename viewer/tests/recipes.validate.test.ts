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
