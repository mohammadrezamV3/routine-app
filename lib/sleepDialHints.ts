// نکته‌ها و اطلاعات زنده‌ی کارت صفحه‌ی ساعت خواب (SleepDial) — منطق خالص بدون React.
// متن‌ها با tr() و فقط داخل توابع ساخته می‌شن (هیچ‌وقت در سطح ماژول).

import { tr } from "./i18n";
import { durationLabel, minutesUntil, sleepPhase, type SleepPhase } from "./sleep";
import { wakeOptions } from "./sleepCycles";

/** نزدیک‌تر از این (دقیقه) به هدف = «تقریبا همون هدف» */
export const NEAR_GOAL_MIN = 20;
/** حداقل شب‌های پشت‌سرهم برای پیام استریک هدف */
export const GOAL_STREAK_MIN = 3;
/** بدهی خواب هفته (دقیقه) که یادآوری می‌خواد */
export const DEBT_HINT_MIN = 120;

export type HintTone = "good" | "warn" | "info";
export type DialHint = {
  kind: "winddown" | "pastBedtime" | "streak" | "under" | "over" | "onGoal" | "debt" | "logPrompt" | "idle";
  tone: HintTone;
  /** عدد اصلی پیام (دقیقه یا تعداد شب) */
  n: number;
};

export type HintInput = {
  phase: SleepPhase;
  /** دقیقه‌ی روز الان */
  nowMin: number;
  /** ساعت خواب هدف "HH:mm" */
  bedtime: string;
  /** مدت خواب شب اخیر (دقیقه) یا null اگه ثبت نشده */
  lastNightMin: number | null;
  goalMin: number;
  goalStreak: number;
  debt7Min: number;
  /** ردیابی زنده روشنه؟ */
  tracking?: boolean;
};

/** یک نکته‌ی تک‌خطی بر اساس زمان و داده‌ها؛ null یعنی چیزی برای گفتن نیست */
export function dialHint(i: HintInput): DialHint | null {
  if (i.tracking) return null;
  const toBed = minutesUntil(Math.floor(i.nowMin), i.bedtime) ?? 0;
  if (i.phase === "winddown") return { kind: "winddown", tone: "info", n: toBed };
  if (i.phase === "bedtime" || i.phase === "night") {
    const since = (1440 - toBed) % 1440;
    return since >= 15 ? { kind: "pastBedtime", tone: "warn", n: since } : { kind: "winddown", tone: "info", n: 0 };
  }
  if (i.lastNightMin === null) {
    return i.phase === "morning" ? { kind: "logPrompt", tone: "info", n: 0 } : i.debt7Min >= DEBT_HINT_MIN ? { kind: "debt", tone: "warn", n: i.debt7Min } : null;
  }
  const diff = i.lastNightMin - i.goalMin;
  if (i.goalStreak >= GOAL_STREAK_MIN) return { kind: "streak", tone: "good", n: i.goalStreak };
  if (diff <= -NEAR_GOAL_MIN) {
    return i.phase === "day" && i.debt7Min >= DEBT_HINT_MIN
      ? { kind: "debt", tone: "warn", n: i.debt7Min }
      : { kind: "under", tone: "warn", n: -diff };
  }
  if (diff >= NEAR_GOAL_MIN) return { kind: "over", tone: "info", n: diff };
  return { kind: "onGoal", tone: "good", n: Math.abs(diff) };
}

export function dialHintText(h: DialHint): string {
  switch (h.kind) {
    case "winddown":
      // مدت تا خواب همون شمارش وسط ساعته؛ اینجا تکرارش نمی‌کنیم
      return h.n > 0
        ? tr("نور رو کم کن و گوشی رو کنار بذار", "Dim the lights and put the phone down")
        : tr("وقت خوابه؛ وقتی دراز کشیدی دکمه‌ی پایین رو بزن", "It's bedtime; tap the button below when you lie down");
    case "pastBedtime":
      return tr(`${durationLabel(h.n)} از ساعت خوابت گذشته؛ هر چی زودتر بخوابی بهتره`, `${durationLabel(h.n)} past your bedtime; the sooner you sleep the better`);
    case "streak":
      return tr(`${h.n} شب پشت سر هم به هدف رسیدی`, `${h.n} nights in a row on target`);
    case "under":
      return tr(`دیشب ${durationLabel(h.n)} کمتر از هدف خوابیدی`, `Last night you slept ${durationLabel(h.n)} under your goal`);
    case "over":
      return tr(`دیشب ${durationLabel(h.n)} بیشتر از هدف خوابیدی`, `Last night you slept ${durationLabel(h.n)} over your goal`);
    case "onGoal":
      return tr("دیشب تقریبا دقیقا به هدفت رسیدی", "Last night you hit your goal almost exactly");
    case "debt":
      return tr(`این هفته ${durationLabel(h.n)} کم‌خوابی جمع شده؛ امشب زودتر بخواب`, `${durationLabel(h.n)} of sleep debt this week; sleep earlier tonight`);
    case "logPrompt":
      return tr("خواب دیشب رو ثبت کن تا امتیازت رو ببینی", "Log last night's sleep to see your score");
    default:
      return "";
  }
}

// ── اطلاعات زنده‌ی دو باکس زیر ساعت ─────────────────────────────────────

export type CycleTile = {
  /** now = اگه همین الان بخوابی؛ bed = اگه سر ساعت خواب هدف بخوابی؛ tracked = از لحظه‌ی شروع ردیاب */
  mode: "now" | "bed" | "tracked";
  /** "HH:mm" ساعت بیداری پیشنهادی (چرخه‌ی کامل، نزدیک به هدف) */
  clock: string;
  cycles: number;
};

export function cycleTileInfo(
  nowMin: number, bedMin: number, latency: number, goalMin: number, phase: SleepPhase, trackedFrom?: number | null,
): CycleTile {
  const mode = trackedFrom != null ? "tracked" : phase === "winddown" || phase === "bedtime" || phase === "night" ? "now" : "bed";
  const from = mode === "tracked" ? Math.floor(trackedFrom!) : mode === "now" ? Math.floor(nowMin) : bedMin;
  const best = wakeOptions(from, latency, goalMin).find((o) => o.best)!;
  return { mode, clock: best.clock, cycles: best.cycles };
}

export type BedtimeState =
  | { state: "until"; min: number }
  | { state: "now"; min: number }
  | { state: "past"; min: number }
  | { state: "none"; min: 0 };

/** تا ساعت خواب هدف چقدر مونده؛ بعد از اون «past» تا وقتی خواب هدف تموم بشه */
export function bedtimeState(nowMin: number, target: { wake: string; sleep: string }): BedtimeState {
  const phase = sleepPhase(Math.floor(nowMin), target);
  const toBed = minutesUntil(Math.floor(nowMin), target.sleep);
  if (toBed === null) return { state: "none", min: 0 };
  if (phase === "morning") return { state: "none", min: 0 };
  if (phase === "bedtime" || phase === "night") {
    const since = (1440 - toBed) % 1440;
    return since < 5 ? { state: "now", min: since } : { state: "past", min: since };
  }
  return toBed === 0 ? { state: "now", min: 0 } : { state: "until", min: toBed };
}
