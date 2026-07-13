// タグ・カテゴリー・素材のピルに割り当てる5色。
// 同じ文字列には常に同じ色（文字コード和のハッシュ）を割り当てる。

export function tagColorClass(label: string): string {
  let sum = 0;
  for (const ch of label) sum += ch.codePointAt(0) ?? 0;
  return `tag-c${(sum % 5) + 1}`;
}
