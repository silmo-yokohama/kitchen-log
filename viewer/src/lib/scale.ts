// 分量のスケーリングと調理慣習表記（設計書「人前スケーリング」参照）

export const QUALITATIVE_UNITS: readonly string[] = ['少々', '適量', 'ひとつまみ'];
const SPOON_UNITS: readonly string[] = ['大さじ', '小さじ', 'カップ'];
const METRIC_UNITS: readonly string[] = ['g', 'ml'];

/** 0.25→"1/4"、1.5→"1と1/2" のような調理慣習の数量表記 */
function amountLabel(value: number): string {
  const whole = Math.floor(value);
  const fraction = Math.round((value - whole) * 100) / 100;
  const fractionLabel: Record<number, string> = { 0.25: '1/4', 0.5: '1/2', 0.75: '3/4' };
  const label = fractionLabel[fraction];
  if (label === undefined) return String(value);
  return whole === 0 ? label : `${whole}と${label}`;
}

/** 材料1件の表示文字列（例: "300g"・"大さじ1と1/2"・"少々"・"1と1/2丁"） */
export function formatAmount(amount: number | null, unit: string): string {
  if (QUALITATIVE_UNITS.includes(unit) || amount === null) return unit;
  if (SPOON_UNITS.includes(unit)) return `${unit}${amountLabel(amount)}`;
  if (METRIC_UNITS.includes(unit)) return `${amount}${unit}`;
  return `${amountLabel(amount)}${unit}`;
}

/**
 * 人前変更時の丸めルール:
 * さじ系=1/4刻み（下限1/4）、g/ml=整数・100以上は5刻み（下限1）、
 * 個数系=1/2刻み（下限1/2）、少々/適量/ひとつまみ=null のまま
 */
export function scaleAmount(amount: number | null, unit: string, factor: number): number | null {
  if (amount === null || QUALITATIVE_UNITS.includes(unit)) return null;
  const raw = amount * factor;
  if (SPOON_UNITS.includes(unit)) return Math.max(Math.round(raw * 4) / 4, 0.25);
  if (METRIC_UNITS.includes(unit)) {
    return raw >= 100 ? Math.max(Math.round(raw / 5) * 5, 100) : Math.max(Math.round(raw), 1);
  }
  return Math.max(Math.round(raw * 2) / 2, 0.5);
}

export function formatScaled(amount: number | null, unit: string, factor: number): string {
  return formatAmount(scaleAmount(amount, unit, factor), unit);
}
