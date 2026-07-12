// 「1食の目安」定数と栄養表示のロジック（設計書「栄養表示の基準定数」参照）
// 出典: 厚生労働省「日本人の食事摂取基準（2025年版）」成人（18〜64歳）男女平均の
// 1日推奨量・目標量 ÷ 3 を1食の目安とする

import type { Recipe } from '../schemas/recipe';

// スキーマ（単一の情報源）から型を導出する
export type Nutrition = Recipe['nutrition'];

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

/**
 * レーダーの6軸（モックアップの並び: 上から時計回り）。
 * description は栄養素説明ポップアップの全レシピ共通の文（レシピデータには持たせない）
 */
export const RADAR_AXES = [
  {
    key: 'proteinG',
    label: 'たんぱく質',
    dictKey: 'protein',
    description:
      '筋肉・皮膚・髪など、体そのものをつくる材料になる栄養素。肉・魚・卵・大豆製品・乳製品に多く含まれます。',
  },
  {
    key: 'fiberG',
    label: '食物繊維',
    dictKey: 'fiber',
    description:
      'おなかの調子を整え、食後の血糖値の急上昇を抑えてくれる成分。野菜・きのこ・海藻・豆類に多く含まれます。',
  },
  {
    key: 'vitaminCMg',
    label: 'ビタミンC',
    dictKey: 'vitc',
    description:
      '皮膚や血管を丈夫に保つコラーゲンづくりに欠かせないビタミン。野菜・果物・いも類に多く、水に溶けやすいので汁ごと食べる料理と相性が良いです。',
  },
  {
    key: 'calciumMg',
    label: 'カルシウム',
    dictKey: 'calcium',
    description:
      '骨と歯の材料になるミネラル。乳製品・豆腐などの大豆製品・小松菜のような青菜・小魚に多く含まれます。',
  },
  {
    key: 'ironMg',
    label: '鉄',
    dictKey: 'iron',
    description:
      '血液が全身に酸素を運ぶために必要なミネラル。不足すると疲れやすくなります。赤身の肉・レバー・豆腐・青菜に多く含まれます。',
  },
  {
    key: 'vitaminAUg',
    label: 'ビタミンA',
    dictKey: 'vita',
    description:
      '目の働きや、皮膚・のど・鼻の粘膜を健康に保つビタミン。にんじんやニラなどの緑黄色野菜、レバー、卵に多く含まれます。',
  },
] as const satisfies readonly { key: keyof Nutrition; label: string; dictKey: string; description: string }[];

// SVG座標系（mockups/recipe-detail.html のレーダーと同じ）。
// グリッド・基準リング・データ多角形はすべてこの定数群から導出する
const CX = 170;
const CY = 125;
const FULL_RING = 54; // 100%（1食の目安）の半径
const MAX_RING = 90; // 外周（約166.7%で頭打ち）

function pointAt(axisIndex: number, radius: number): { x: number; y: number } {
  const angle = ((-90 + (360 / RADAR_AXES.length) * axisIndex) * Math.PI) / 180;
  return {
    x: Math.round((CX + radius * Math.cos(angle)) * 10) / 10,
    y: Math.round((CY + radius * Math.sin(angle)) * 10) / 10,
  };
}

/** 半径rの正多角形のpoints文字列（グリッド・基準リング用） */
export function ringPoints(radius: number): string {
  return RADAR_AXES.map((_, index) => {
    const p = pointAt(index, radius);
    return `${p.x},${p.y}`;
  }).join(' ');
}

/** グリッド（5段階のうち基準リングを除く4本）と基準リング（=1食の目安） */
export function radarRings(): { grid: string[]; reference: string } {
  return {
    grid: [0.2, 0.4, 0.8, 1].map((fraction) => ringPoints(MAX_RING * fraction)),
    reference: ringPoints(FULL_RING),
  };
}

/** 中心から外周への軸線 */
export function radarAxisLines(): { x1: number; y1: number; x2: number; y2: number }[] {
  return RADAR_AXES.map((_, index) => {
    const p = pointAt(index, MAX_RING);
    return { x1: CX, y1: CY, x2: p.x, y2: p.y };
  });
}

export function radarGeometry(nutrition: Nutrition): {
  dataPoints: string;
  dots: { x: number; y: number }[];
} {
  const dots = RADAR_AXES.map((axis, index) => {
    const ratio = nutrition[axis.key] / MEAL_REFERENCE[axis.key];
    return pointAt(index, Math.min(ratio * FULL_RING, MAX_RING));
  });
  return { dataPoints: dots.map((d) => `${d.x},${d.y}`).join(' '), dots };
}
