// 「1食の目安」定数と栄養表示のロジック（設計書「栄養表示の基準定数」参照）
// 出典: 厚生労働省「日本人の食事摂取基準（2025年版）」成人（18〜64歳）男女平均の
// 1日推奨量・目標量 ÷ 3 を1食の目安とする

export type Nutrition = {
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbohydrateG: number;
  saltG: number;
  fiberG: number;
  vitaminAUg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
};

export const MEAL_REFERENCE: Nutrition = {
  energyKcal: 775,
  proteinG: 19,
  fatG: 22,
  carbohydrateG: 111,
  saltG: 2.3,
  fiberG: 6.5,
  vitaminAUg: 260,
  vitaminCMg: 33,
  calciumMg: 240,
  ironMg: 3.0,
};

export type Level = 'high' | 'normal' | 'low';

/** 目安の120%以上=高め、80%以下=低め */
export function classifyLevel(value: number, reference: number): Level {
  const ratio = value / reference;
  if (ratio >= 1.2) return 'high';
  if (ratio <= 0.8) return 'low';
  return 'normal';
}

/** レーダーの6軸（モックアップの並び: 上から時計回り） */
export const RADAR_AXES = [
  { key: 'proteinG', label: 'たんぱく質', dictKey: 'protein' },
  { key: 'fiberG', label: '食物繊維', dictKey: 'fiber' },
  { key: 'vitaminCMg', label: 'ビタミンC', dictKey: 'vitc' },
  { key: 'calciumMg', label: 'カルシウム', dictKey: 'calcium' },
  { key: 'ironMg', label: '鉄', dictKey: 'iron' },
  { key: 'vitaminAUg', label: 'ビタミンA', dictKey: 'vita' },
] as const satisfies readonly { key: keyof Nutrition; label: string; dictKey: string }[];

// SVG座標系（mockups/recipe-detail.html のレーダーと同じ）
const CX = 170;
const CY = 125;
const FULL_RING = 54; // 100%（1食の目安）の半径
const MAX_RING = 90; // 外周（約166.7%で頭打ち）

export function radarGeometry(nutrition: Nutrition): {
  dataPoints: string;
  dots: { x: number; y: number }[];
} {
  const dots = RADAR_AXES.map((axis, index) => {
    const ratio = nutrition[axis.key] / MEAL_REFERENCE[axis.key];
    const r = Math.min(ratio * FULL_RING, MAX_RING);
    const angle = ((-90 + 60 * index) * Math.PI) / 180;
    return {
      x: Math.round((CX + r * Math.cos(angle)) * 10) / 10,
      y: Math.round((CY + r * Math.sin(angle)) * 10) / 10,
    };
  });
  return { dataPoints: dots.map((d) => `${d.x},${d.y}`).join(' '), dots };
}
