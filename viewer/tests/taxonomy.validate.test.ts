import { describe, it, expect } from 'vitest';
import taxonomy from '../../masters/taxonomy.json';

// masters/taxonomy.json 自体の整合性を守る。
// - 値は空でなく、区切り文字に使うASCIIカンマを含まない（絞り込みのdata属性・URLクエリがカンマ区切りのため）
// - 同一ファセット内の重複禁止（表記ゆれの温床）
// - ファセット間の重複禁止（同じラベルが2つの絞り込みに現れると混乱するため）

const FACETS = ['categories', 'ingredients', 'tags'] as const;

describe('masters/taxonomy.json', () => {
  for (const facet of FACETS) {
    it(`${facet} has no empty or comma-containing values`, () => {
      for (const value of taxonomy[facet]) {
        expect(value.trim()).not.toBe('');
        expect(value).not.toContain(',');
      }
    });

    it(`${facet} has no duplicate values`, () => {
      expect(new Set(taxonomy[facet]).size).toBe(taxonomy[facet].length);
    });
  }

  it('facets are disjoint (a label lives in exactly one facet)', () => {
    const all = FACETS.flatMap((facet) => taxonomy[facet]);
    const duplicates = all.filter((value, index) => all.indexOf(value) !== index);
    expect(duplicates).toEqual([]);
  });
});
