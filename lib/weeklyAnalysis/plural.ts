// جمع انگلیسی ساده برای متن‌های تولیدی: pl(3, "day") → "3 days"، pl(1, "day") → "1 day"
export function pl(n: number, word: string, plural?: string): string {
  return `${n} ${Math.abs(n) === 1 ? word : plural ?? word + "s"}`;
}
