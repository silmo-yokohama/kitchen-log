import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { recipeSchema } from '../src/schemas/recipe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const recipesDir = join(__dirname, '..', '..', 'recipes');

const recipeFiles = readdirSync(recipesDir).filter((name) => name.endsWith('.json'));

describe('every recipe file in recipes/', () => {
  it('has at least one recipe to validate', () => {
    expect(recipeFiles.length).toBeGreaterThan(0);
  });

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
