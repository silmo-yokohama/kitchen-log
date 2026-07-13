import { describe, it, expect } from 'vitest';
import { formatAmount, scaleAmount, formatScaled } from './scale';

describe('formatAmount', () => {
  it('renders spoon units in cooking notation', () => {
    expect(formatAmount(1.5, '大さじ')).toBe('大さじ1と1/2');
    expect(formatAmount(0.5, '大さじ')).toBe('大さじ1/2');
    expect(formatAmount(0.25, '小さじ')).toBe('小さじ1/4');
    expect(formatAmount(2, '大さじ')).toBe('大さじ2');
  });

  it('renders metric units as plain numbers', () => {
    expect(formatAmount(300, 'g')).toBe('300g');
    expect(formatAmount(500, 'ml')).toBe('500ml');
  });

  it('renders qualitative units as the unit itself', () => {
    expect(formatAmount(null, '少々')).toBe('少々');
    expect(formatAmount(null, '適量')).toBe('適量');
  });

  it('renders count units with the amount first', () => {
    expect(formatAmount(1, '丁')).toBe('1丁');
    expect(formatAmount(1.5, '玉')).toBe('1と1/2玉');
    expect(formatAmount(2, '片')).toBe('2片');
  });
});

describe('scaleAmount', () => {
  it('rounds spoon units to quarter steps', () => {
    expect(scaleAmount(1.5, '大さじ', 1.5)).toBe(2.25);
    expect(scaleAmount(1, '小さじ', 1 / 3)).toBe(0.25); // 0.333 → 0.25
    expect(scaleAmount(0.5, '大さじ', 0.25)).toBe(0.25); // 下限
  });

  it('rounds metric units to integers, and to 5s at 100 or more', () => {
    expect(scaleAmount(500, 'ml', 1.5)).toBe(750);
    expect(scaleAmount(300, 'g', 0.5)).toBe(150);
    expect(scaleAmount(130, 'g', 1.1)).toBe(145);
    expect(scaleAmount(30, 'g', 1.1)).toBe(33);
    expect(scaleAmount(1, 'g', 0.1)).toBe(1); // 下限
  });

  it('rounds count units to half steps', () => {
    expect(scaleAmount(1, '丁', 1.5)).toBe(1.5);
    expect(scaleAmount(2, '片', 0.5)).toBe(1);
    expect(scaleAmount(1, 'パック', 0.25)).toBe(0.5); // 下限
  });

  it('keeps qualitative units as null', () => {
    expect(scaleAmount(null, '適量', 2)).toBeNull();
    expect(scaleAmount(null, '少々', 0.5)).toBeNull();
  });
});

describe('formatScaled', () => {
  it('composes scaling and formatting', () => {
    expect(formatScaled(1.5, '大さじ', 1.5)).toBe('大さじ2と1/4');
    expect(formatScaled(300, 'g', 1.5)).toBe('450g');
    expect(formatScaled(null, '適量', 3)).toBe('適量');
  });
});
