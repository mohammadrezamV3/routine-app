import type { LetterSummary } from "@/lib/weeklyAnalysis/types";
import type { WeeklyLetterData } from "./types";

// خلاصه‌ی سبک هر شماره (آرشیو و بنر «هفته‌نامه رسید»). موقع ساخت شماره در
// ستون WeeklyLetter.summary ذخیره می‌شه تا لیست کردن آرشیو مجبور نباشه کل
// data (چند ده کیلوبایت برای هر شماره) رو بخونه. بدون import سروری.

export type StoredLetterSummary = Pick<LetterSummary, "weekLabel" | "score" | "grade" | "headline" | "archetype">;

export function summaryOf(data: WeeklyLetterData): StoredLetterSummary {
  return {
    weekLabel: data.weekLabel,
    score: data.overall.score,
    grade: data.overall.grade,
    headline: data.headline,
    archetype: data.archetype,
  };
}

type RowLike = { weekStart: Date; issueNo: number; summary: unknown; readAt: Date | null; createdAt: Date };

/** summary ذخیره‌شده (یا اگه ردیف قدیمی/ناقص بود، خود data) → LetterSummary */
export function rowToSummary(row: RowLike, data?: unknown): LetterSummary | null {
  const src = (row.summary ?? (data ? summaryOf(data as WeeklyLetterData) : null)) as StoredLetterSummary | null;
  if (!src || typeof src !== "object") return null;
  return {
    weekStart: row.weekStart.toISOString().slice(0, 10),
    issueNo: row.issueNo,
    weekLabel: src.weekLabel,
    score: src.score ?? null,
    grade: src.grade ?? null,
    headline: src.headline,
    archetype: src.archetype ?? null,
    read: !!row.readAt,
    createdAt: row.createdAt.toISOString(),
  };
}
