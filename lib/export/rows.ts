import type { Cell } from "./csv";
import { isoDay, isoTime, jalaliDay } from "./dates";

// نگاشت‌های خالص ردیف دیتابیس → ردیف خروجی. ورودی‌ها ساختاری‌اند (نه نوع
// Prisma) تا بدون دیتابیس تست بشن. کلیدهای ستون انگلیسی و ثابت‌ان (قرارداد
// فایل خروجی)؛ هیچ تصویر، هش یا متن رمزگذاری‌شده‌ای این‌جا نمیاد.

export type Table = { columns: string[]; rows: Record<string, Cell>[] };

const round = (n: number, p = 2) => { const k = 10 ** p; return Math.round(n * k) / k; };
const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

// ── روتین ─────────────────────────────────────────────────────────────
export const ROUTINE_COLUMNS = ["date", "jalali_date", "task_key", "title", "done", "wake_up_at"];

type OccLite = { id: string; name: string; items?: { id: string; name: string }[] };

/** عنوان کلید تیک: `${occId}` یا `${occId}~${itemId}` از روی برنامه‌های سفارشی */
export function resolveTaskTitle(key: string, occs: OccLite[]): string {
  const [occId, itemId] = key.split("~");
  const occ = occs.find((o) => o.id === occId);
  if (!occ) return "";
  if (itemId === undefined) return occ.name;
  const item = occ.items?.find((i) => i.id === itemId);
  return item ? `${occ.name} / ${item.name}` : occ.name;
}

export function routineTable(
  entries: { date: Date; completedItems: unknown; wakeUpAt: Date | null }[],
  occs: OccLite[],
): Table {
  const rows: Record<string, Cell>[] = [];
  for (const e of entries) {
    const base = { date: isoDay(e.date), jalali_date: jalaliDay(e.date), wake_up_at: isoTime(e.wakeUpAt) };
    const keys = Object.entries(asObj(e.completedItems));
    if (keys.length === 0) rows.push({ ...base, task_key: "", title: "", done: null });
    for (const [k, v] of keys) rows.push({ ...base, task_key: k, title: resolveTaskTitle(k, occs), done: v === true });
  }
  return { columns: ROUTINE_COLUMNS, rows };
}

// ── مرور هفتگی ────────────────────────────────────────────────────────
export const REFLECTION_COLUMNS = ["week_start", "jalali_week_start", "mood", "went_well", "to_improve"];
export function reflectionsTable(list: { weekStart: Date; wentWell: string; improve: string; mood: number | null }[]): Table {
  return {
    columns: REFLECTION_COLUMNS,
    rows: list.map((r) => ({
      week_start: isoDay(r.weekStart), jalali_week_start: jalaliDay(r.weekStart),
      mood: r.mood, went_well: r.wentWell, to_improve: r.improve,
    })),
  };
}

// ── خواب ──────────────────────────────────────────────────────────────
export const SLEEP_COLUMNS = ["date", "jalali_date", "slept_at", "woke_at", "duration_min", "quality", "latency_min", "awakenings", "nap_min", "tags", "note", "target_slept_at", "target_woke_at"];
export function sleepTable(list: {
  date: Date; sleptAt: Date | null; wokeAt: Date | null; targetSleptAt: Date | null; targetWokeAt: Date | null;
  quality: number | null; note: string | null; latencyMin: number | null; awakenings: number | null; napMin: number | null; tags: string[];
}[]): Table {
  return {
    columns: SLEEP_COLUMNS,
    rows: list.map((s) => ({
      date: isoDay(s.date), jalali_date: jalaliDay(s.date),
      slept_at: isoTime(s.sleptAt), woke_at: isoTime(s.wokeAt),
      duration_min: s.sleptAt && s.wokeAt ? Math.max(0, Math.round((s.wokeAt.getTime() - s.sleptAt.getTime()) / 60000)) : null,
      quality: s.quality, latency_min: s.latencyMin, awakenings: s.awakenings, nap_min: s.napMin,
      tags: s.tags, note: s.note,
      target_slept_at: isoTime(s.targetSleptAt), target_woke_at: isoTime(s.targetWokeAt),
    })),
  };
}

// ── تمرین ─────────────────────────────────────────────────────────────
export const EXERCISE_COLUMNS = ["date", "jalali_date", "plan_id", "plan_goal", "plan_level", "completed", "started_at", "completed_items", "notes"];

/** completedItems می‌تونه آرایه‌ی نام یا نگاشت { نام: true } باشه */
export function completedItemNames(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : "")).filter(Boolean);
  return Object.entries(asObj(v)).filter(([, on]) => on === true).map(([k]) => k);
}

export function exerciseTable(list: {
  date: Date; planId: string | null; completed: boolean; completedItems: unknown; startedAt: Date | null; notes: string | null;
  plan: { goal: string | null; level: string } | null;
}[]): Table {
  return {
    columns: EXERCISE_COLUMNS,
    rows: list.map((l) => ({
      date: isoDay(l.date), jalali_date: jalaliDay(l.date), plan_id: l.planId,
      plan_goal: l.plan?.goal ?? null, plan_level: l.plan?.level ?? null,
      completed: l.completed, started_at: isoTime(l.startedAt),
      completed_items: completedItemNames(l.completedItems), notes: l.notes,
    })),
  };
}

// ── کالری ─────────────────────────────────────────────────────────────
export const CALORIE_COLUMNS = ["date", "jalali_date", "meal", "food", "grams", "calories", "protein_g", "carbs_g", "fat_g"];
export function calorieTable(list: {
  date: Date; grams: number; mealType: string | null; customName: string | null; customCalories: number | null;
  proteinG: number | null; carbsG: number | null; fatG: number | null;
  foodItem: { nameFa: string; caloriesPer100g: number; proteinPer100g: number | null; carbsPer100g: number | null; fatPer100g: number | null } | null;
}[]): Table {
  const per = (stored: number | null, per100: number | null | undefined, grams: number) =>
    stored != null ? round(stored, 1) : per100 != null ? round((per100 * grams) / 100, 1) : null;
  return {
    columns: CALORIE_COLUMNS,
    rows: list.map((f) => ({
      date: isoDay(f.date), jalali_date: jalaliDay(f.date), meal: f.mealType,
      food: f.customName ?? f.foodItem?.nameFa ?? "", grams: round(f.grams, 1),
      calories: f.customCalories != null ? round(f.customCalories, 1) : f.foodItem ? round((f.foodItem.caloriesPer100g * f.grams) / 100, 1) : null,
      protein_g: per(f.proteinG, f.foodItem?.proteinPer100g, f.grams),
      carbs_g: per(f.carbsG, f.foodItem?.carbsPer100g, f.grams),
      fat_g: per(f.fatG, f.foodItem?.fatPer100g, f.grams),
    })),
  };
}

/** اسنپ‌شات چک‌لیست به متن خوانا: "[x] متن | [ ] متن" */
export function checklistText(v: unknown): string {
  if (!Array.isArray(v)) return "";
  return v
    .map((i) => asObj(i))
    .filter((i) => typeof i.text === "string")
    .map((i) => `${i.checked === true ? "[x]" : "[ ]"} ${i.text as string}`)
    .join(" | ");
}

// ── معاملات ───────────────────────────────────────────────────────────
export const TRADE_COLUMNS = [
  "account", "currency", "opened_at", "jalali_date", "closed_at", "symbol", "direction", "timeframe", "status", "result",
  "volume", "volume_unit", "pnl", "risk_free", "entry_price", "exit_price", "stop_loss", "take_profit", "commission", "swap",
  "risk_amount", "r_multiple", "sessions", "setup", "entry_reasons", "entry_reason_note", "exit_reasons", "exit_reason_note",
  "note", "emotion_before", "emotion_after", "confidence", "followed_plan", "checklist", "checklist_done", "checklist_total",
  "checklist_snapshot", "tags", "external_source", "external_id",
];
export function tradeTable(list: {
  openedAt: Date; closedAt: Date | null; symbol: string; direction: string; timeframe: string | null; status: string; result: string;
  volume: number; volumeUnit: string; pnl: number; riskFree: boolean;
  entryPrice: number | null; exitPrice: number | null; stopLoss: number | null; takeProfit: number | null;
  commission: number | null; swap: number | null; riskAmount: number | null; rMultiple: number | null;
  sessions: string[]; setup: string | null; entryReasons: string[]; entryReasonNote: string | null; exitReasons: string[]; exitReasonNote: string | null;
  note: string | null; emotionBefore: string | null; emotionAfter: string | null; confidence: number | null; followedPlan: boolean | null;
  checklistName: string | null; checklistDone: number | null; checklistTotal: number | null; checklistSnapshot: unknown;
  tags: { name: string }[]; externalSource: string | null; externalId: string | null;
  account: { name: string; currency: string };
}[]): Table {
  return {
    columns: TRADE_COLUMNS,
    rows: list.map((t) => ({
      account: t.account.name, currency: t.account.currency,
      opened_at: isoTime(t.openedAt), jalali_date: jalaliDay(t.openedAt), closed_at: isoTime(t.closedAt),
      symbol: t.symbol, direction: t.direction, timeframe: t.timeframe, status: t.status, result: t.result,
      volume: t.volume, volume_unit: t.volumeUnit, pnl: t.pnl, risk_free: t.riskFree,
      entry_price: t.entryPrice, exit_price: t.exitPrice, stop_loss: t.stopLoss, take_profit: t.takeProfit,
      commission: t.commission, swap: t.swap, risk_amount: t.riskAmount, r_multiple: t.rMultiple,
      sessions: t.sessions, setup: t.setup, entry_reasons: t.entryReasons, entry_reason_note: t.entryReasonNote,
      exit_reasons: t.exitReasons, exit_reason_note: t.exitReasonNote, note: t.note,
      emotion_before: t.emotionBefore, emotion_after: t.emotionAfter, confidence: t.confidence, followed_plan: t.followedPlan,
      checklist: t.checklistName, checklist_done: t.checklistDone, checklist_total: t.checklistTotal,
      checklist_snapshot: checklistText(t.checklistSnapshot),
      tags: t.tags.map((x) => x.name), external_source: t.externalSource, external_id: t.externalId,
    })),
  };
}
