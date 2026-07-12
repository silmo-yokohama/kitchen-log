// 「1食の目安」定数と栄養表示のロジック（設計書「栄養表示の基準定数」参照）
// 出典: 厚生労働省「日本人の食事摂取基準（2025年版）」策定検討会報告書。
// 成人（18〜64歳）の年齢区分値を男女それぞれ平均→男女平均→÷3（1食）で導出（2026-07-13にWebで裏取り済み）。
//   エネルギー: 身体活動レベルII 男2650/女2000kcal → 2325 → 775
//   たんぱく質: 推奨量 男65/女50g → 57.5 → 19
//   脂質: 目標量20〜30%Eの中央25%E × 2325kcal ÷ 9 → 64.6g → 22
//   炭水化物: 目標量50〜65%Eの中央57.5%E × 2325kcal ÷ 4 → 334g → 111
//   食塩: 目標量 男7.5/女6.5g未満 → 7.0 → 2.3
//   食物繊維: 目標量 男21/女18g以上 → 19.5 → 6.5
//   ビタミンA: 推奨量 男883/女683μgRAE → 783 → 260
//   ビタミンC: 推奨量 男女100mg → 33
//   カルシウム: 推奨量 男767/女650mg → 708 → 235
//   鉄: 推奨量 男7.25/女（月経あり）10.25mg → 8.75 → 2.9

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
  calciumMg: 235,
  ironMg: 2.9,
};

type Level = 'high' | 'normal' | 'low';

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

// レーダーのSVG座標系はこの定数群が正（初出はモックアップ由来）。
// グリッド・基準リング・軸線・軸ラベル・データ多角形はすべてここから導出する
const CX = 170;
const CY = 125;
const FULL_RING = 54; // 100%（1食の目安）の半径
const MAX_RING = 90; // 外周（約166.7%で頭打ち）

/** 軸ラベルの描画位置とタップ領域（viewBox 0 0 340 252 前提、RADAR_AXESと同順） */
export const RADAR_LABEL_POSITIONS = [
  { tx: 170, ty: 22, anchor: 'middle', rect: { x: 134, y: 2, w: 72, h: 30 } },
  { tx: 254, ty: 86, anchor: 'start', rect: { x: 248, y: 64, w: 88, h: 34 } },
  { tx: 254, ty: 178, anchor: 'start', rect: { x: 248, y: 156, w: 88, h: 34 } },
  { tx: 170, ty: 240, anchor: 'middle', rect: { x: 130, y: 220, w: 80, h: 30 } },
  { tx: 86, ty: 178, anchor: 'end', rect: { x: 20, y: 156, w: 70, h: 34 } },
  { tx: 86, ty: 86, anchor: 'end', rect: { x: 14, y: 64, w: 76, h: 34 } },
] as const;

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
