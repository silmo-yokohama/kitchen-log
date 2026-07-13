import { describe, it, expect } from 'vitest';
import { expandStepSections, type RecipeLike } from './render-steps';

const recipe: RecipeLike = {
  ingredientSections: [
    {
      section: '下ごしらえ',
      items: [
        { id: 'chicken', name: '鶏手羽元（骨抜き）', amount: 300, unit: 'g' },
        { id: 'salt-marinade', name: '塩（下味用）', amount: null, unit: '少々' },
      ],
    },
    {
      section: '調理',
      items: [{ id: 'salt-taste', name: '塩（味を見て）', amount: null, unit: '適量' }],
    },
  ],
  stepSections: [
    { section: '下ごしらえ', steps: ['{{chicken}}を切り、{{salt-marinade}}をふる。'] },
    { section: '調理', steps: ['{{chicken}}を焼く。味を見て{{salt-taste}}で調える。'] },
  ],
};

describe('expandStepSections', () => {
  it('marks only the first mention of an ingredient with its amount', () => {
    const sections = expandStepSections(recipe);
    const first = sections[0].steps[0];
    expect(first[0]).toMatchObject({
      kind: 'ingredient',
      id: 'chicken',
      displayName: '鶏手羽元（骨抜き）',
      amount: 300,
      unit: 'g',
      withAmount: true,
    });
    const later = sections[1].steps[0];
    expect(later[0]).toMatchObject({ kind: 'ingredient', id: 'chicken', withAmount: false });
  });

  it('folds role annotations and amounts for qualitative ingredients', () => {
    const sections = expandStepSections(recipe);
    const first = sections[0].steps[0];
    expect(first[2]).toMatchObject({
      kind: 'ingredient',
      id: 'salt-marinade',
      displayName: '塩',
      withAmount: false,
    });
    const later = sections[1].steps[0];
    const saltTaste = later.find((p) => p.kind === 'ingredient' && p.id === 'salt-taste');
    expect(saltTaste).toMatchObject({ displayName: '塩', withAmount: false });
  });

  it('keeps surrounding text as text parts', () => {
    const sections = expandStepSections(recipe);
    const first = sections[0].steps[0];
    expect(first[1]).toEqual({ kind: 'text', text: 'を切り、' });
    expect(first[3]).toEqual({ kind: 'text', text: 'をふる。' });
  });

  it('throws on an unknown ingredient id', () => {
    const broken = {
      ...recipe,
      stepSections: [{ section: '調理', steps: ['{{no-such-id}}を炒める。'] }],
    };
    expect(() => expandStepSections(broken)).toThrow(/no-such-id/);
  });
});
