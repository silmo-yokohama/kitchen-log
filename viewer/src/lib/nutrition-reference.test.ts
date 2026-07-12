import { describe, it, expect } from 'vitest';
import { MEAL_REFERENCE, classifyLevel, radarGeometry, radarRings, ringPoints, RADAR_AXES } from './nutrition-reference';

const kimchiNutrition = {
  energyKcal: 762,
  proteinG: 46.1,
  fatG: 42.3,
  carbohydrateG: 43.3,
  saltG: 7.3,
  fiberG: 11.3,
  vitaminAUg: 230,
  vitaminCMg: 45,
  calciumMg: 310,
  ironMg: 5.1,
};

describe('classifyLevel', () => {
  it('classifies against 120%/80% thresholds', () => {
    expect(classifyLevel(762, MEAL_REFERENCE.energyKcal)).toBe('normal');
    expect(classifyLevel(46.1, MEAL_REFERENCE.proteinG)).toBe('high');
    expect(classifyLevel(43.3, MEAL_REFERENCE.carbohydrateG)).toBe('low');
    expect(classifyLevel(7.3, MEAL_REFERENCE.saltG)).toBe('high');
  });
});

describe('radarGeometry', () => {
  it('produces 6 dots in axis order, capped at the outer ring', () => {
    const g = radarGeometry(kimchiNutrition);
    expect(g.dots).toHaveLength(6);
    // たんぱく質は目安の2.4倍 → 頭打ち r=90 → 真上 (170, 35)
    expect(g.dots[0]).toEqual({ x: 170, y: 35 });
    expect(g.dataPoints.split(' ')).toHaveLength(6);
  });

  it('places a 100% value exactly on the reference ring', () => {
    const flat = { ...kimchiNutrition, proteinG: MEAL_REFERENCE.proteinG };
    const g = radarGeometry(flat);
    expect(g.dots[0]).toEqual({ x: 170, y: 71 }); // r=54 → 125-54=71
  });

  it('keys axes to existing nutrition fields', () => {
    for (const axis of RADAR_AXES) {
      expect(kimchiNutrition).toHaveProperty(axis.key);
    }
  });

  it('derives the reference ring from the same constants as the data polygon', () => {
    // 基準リング（100%）の頂点は、値=目安ちょうどのデータ点と一致する
    const flat = Object.fromEntries(Object.entries(MEAL_REFERENCE)) as typeof MEAL_REFERENCE;
    expect(radarRings().reference).toBe(radarGeometry(flat).dataPoints);
    expect(ringPoints(54).startsWith('170,71')).toBe(true);
  });
});
