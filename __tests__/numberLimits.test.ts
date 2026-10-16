import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// ── mockهای مسیر calorie/log: فقط منطق اعتبارسنجی خود روت تست می‌شه، نه دیتابیس ──
const created: any[] = [];
vi.mock("@/lib/moduleAccess", () => ({
  requireModule: vi.fn(async () => ({ ok: true, userId: "u1", isSuperAdmin: false })),
}));
vi.mock("@/lib/featureFlagsServer", () => ({
  sessionFeatureBlocked: vi.fn(async () => null),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    foodLogEntry: {
      create: vi.fn(async ({ data }: any) => { created.push(data); return { id: "e1", ...data }; }),
      findMany: vi.fn(async () => []),
    },
  },
}));
vi.mock("@/lib/realtime", () => ({
  withLiveSync: (_keys: unknown, handler: unknown) => handler,
}));

import { POST as calorieLogPOST } from "@/app/api/calorie/log/route";
import {
  NUMBER_LIMITS, checkNumber, checkOptionalNumber, clampDisplay, clampToLimit, constrainTyped,
  inLimitRange, isInLimit, limitError, maxInputChars, parseTyped, readTyped, roundTo, typedStatus,
  type LimitKey,
} from "@/lib/numberLimits";
import { sanitizeFoodRow, safeDailyKcal } from "@/lib/foodLogSanitize";
import { validateSettingNumbers } from "@/lib/settingValueLimits";
import { validateExerciseItem } from "@/lib/exerciseItemLimits";
import { parseAccountInput, parseTradeInput } from "@/lib/tradeServer";
import { computeTradeStats } from "@/lib/tradeAnalytics";
import { calcRisk, simplePipCalc } from "@/lib/riskCalc";
import { SLEEP_MAX_MIN, SLEEP_MIN_MIN, LATENCY_MAX, AWAKENINGS_MAX, NAP_MAX } from "@/lib/sleep";
import { MAX_DURATION_DAYS, MAX_TIMES_PER_DAY } from "@/lib/medications";
import { normalizeMtTrades } from "@/lib/metatrader";

const KEYS = Object.keys(NUMBER_LIMITS) as LimitKey[];

describe("جدول سقف و کف", () => {
  it("هر ردیف منطقی است: کف <= سقف، اعشار صحیح نامنفی، نام فارسی و انگلیسی دارد", () => {
    for (const k of KEYS) {
      const l = NUMBER_LIMITS[k];
      expect(l.min, k).toBeLessThanOrEqual(l.max);
      expect(Number.isInteger(l.decimals) && l.decimals >= 0, k).toBe(true);
      expect(l.fa.length, k).toBeGreaterThan(0);
      expect(l.en.length, k).toBeGreaterThan(0);
    }
  });

  it("متن فارسی جدول اعراب و همزه‌ی بالا ندارد (قانون پروژه)", () => {
    const bad = /[\u064B-\u0652\u0654\u0623\u0625]/;
    for (const k of KEYS) expect(bad.test(NUMBER_LIMITS[k].fa), k).toBe(false);
  });

  it("مقدارهای کلیدی همان‌هایی‌اند که محصول خواسته", () => {
    expect(NUMBER_LIMITS.heightCm).toMatchObject({ min: 50, max: 260 });
    expect(NUMBER_LIMITS.weightKg).toMatchObject({ min: 20, max: 400 });
    expect(NUMBER_LIMITS.ageYears).toMatchObject({ min: 10, max: 120 });
    expect(NUMBER_LIMITS.dailyTargetKcal).toMatchObject({ min: 800, max: 10000 });
    expect(NUMBER_LIMITS.foodAmount).toMatchObject({ min: 0.1, max: 5000 });
    expect(NUMBER_LIMITS.reps).toMatchObject({ min: 1, max: 1000 });
    expect(NUMBER_LIMITS.sets).toMatchObject({ min: 1, max: 100 });
    expect(NUMBER_LIMITS.accountBalance.max).toBe(1e10);
    expect(NUMBER_LIMITS.tradePrice.max).toBe(1e7);
  });

  it("ثابت‌های ماژول‌های دیگر از همین جدول می‌آیند (تک‌منبع)", () => {
    expect(SLEEP_MIN_MIN).toBe(NUMBER_LIMITS.sleepDuration.min);
    expect(SLEEP_MAX_MIN).toBe(NUMBER_LIMITS.sleepDuration.max);
    expect(LATENCY_MAX).toBe(NUMBER_LIMITS.sleepLatency.max);
    expect(AWAKENINGS_MAX).toBe(NUMBER_LIMITS.sleepAwakenings.max);
    expect(NAP_MAX).toBe(NUMBER_LIMITS.sleepNap.max);
    expect(MAX_DURATION_DAYS).toBe(NUMBER_LIMITS.medicationDays.max);
    expect(MAX_TIMES_PER_DAY).toBe(NUMBER_LIMITS.medicationTimes.max);
  });
});

describe("checkNumber", () => {
  it("ده میلیارد کالری رد می‌شود، مقدار معقول قبول", () => {
    expect(checkNumber(10_000_000_000, "entryKcal").ok).toBe(false);
    expect(checkNumber(10001, "entryKcal").ok).toBe(false);
    expect(checkNumber(10000, "entryKcal")).toEqual({ ok: true, value: 10000 });
    expect(checkNumber(350.5, "entryKcal")).toEqual({ ok: true, value: 350.5 });
  });

  it("NaN، Infinity، منفی (جایی که مجاز نیست)، رشته و null رد می‌شوند", () => {
    for (const v of [NaN, Infinity, -Infinity, -1, "12", null, undefined, {}, [], true]) {
      expect(checkNumber(v, "entryKcal").ok, String(v)).toBe(false);
    }
  });

  it("عدد صحیح اجباری: اعشار رد می‌شود", () => {
    expect(checkNumber(175.5, "heightCm").ok).toBe(false);
    expect(checkNumber(175, "heightCm")).toEqual({ ok: true, value: 175 });
    expect(checkNumber(2.5, "sets").ok).toBe(false);
  });

  it("اعشار اضافه گرد می‌شود (نه رد)", () => {
    expect(checkNumber(72.55, "weightKg")).toEqual({ ok: true, value: 72.6 });
    expect(checkNumber(1.123456, "tradePnl")).toEqual({ ok: true, value: 1.12 });
  });

  it("مرزها دقیق‌اند", () => {
    expect(checkNumber(49, "heightCm").ok).toBe(false);
    expect(checkNumber(50, "heightCm").ok).toBe(true);
    expect(checkNumber(260, "heightCm").ok).toBe(true);
    expect(checkNumber(261, "heightCm").ok).toBe(false);
    expect(checkNumber(799, "dailyTargetKcal").ok).toBe(false);
    expect(checkNumber(0, "reps").ok).toBe(false);
  });

  it("سود و زیان علامت‌دار با سقف قرینه", () => {
    expect(checkNumber(-1e9, "tradePnl").ok).toBe(true);
    expect(checkNumber(-1e9 - 1, "tradePnl").ok).toBe(false);
    expect(checkNumber(1e12, "tradePnl").ok).toBe(false);
  });

  it("coerceString: رشته‌ی عددی با ارقام فارسی و اعشار فارسی", () => {
    expect(checkNumber("\u06F1\u06F7\u06F5", "heightCm", { coerceString: true })).toEqual({ ok: true, value: 175 });
    expect(checkNumber("72٫5", "weightKg", { coerceString: true })).toEqual({ ok: true, value: 72.5 });
    expect(checkNumber("abc", "heightCm", { coerceString: true }).ok).toBe(false);
    expect(checkNumber("9".repeat(40), "heightCm", { coerceString: true }).ok).toBe(false);
  });

  it("پیام خطا بازه را می‌گوید", () => {
    const r = checkNumber(999, "heightCm");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("50");
      expect(r.error).toContain("260");
    }
    expect(limitError("entryKcal")).toContain("10,000");
  });

  it("checkOptionalNumber: خالی یعنی ندارد", () => {
    expect(checkOptionalNumber(undefined, "heightCm")).toEqual({ ok: true, value: null });
    expect(checkOptionalNumber(null, "heightCm")).toEqual({ ok: true, value: null });
    expect(checkOptionalNumber("", "heightCm")).toEqual({ ok: true, value: null });
    expect(checkOptionalNumber(5000, "heightCm").ok).toBe(false);
  });
});

describe("گیره و نمایش", () => {
  it("clampDisplay داده‌ی خراب قدیمی را مهار می‌کند", () => {
    expect(clampDisplay(1e10, "entryKcal")).toBe(10000);
    expect(clampDisplay(NaN, "entryKcal")).toBe(0);
    expect(clampDisplay(Infinity, "entryKcal")).toBe(0);
    expect(clampDisplay(-50, "entryKcal")).toBe(0);
    expect(clampDisplay(350, "entryKcal")).toBe(350);
    expect(clampDisplay(-5e9, "tradePnl")).toBe(-1e9);
  });

  it("clampToLimit", () => {
    expect(clampToLimit(5000, "heightCm")).toBe(260);
    expect(clampToLimit(1, "heightCm")).toBe(50);
    expect(clampToLimit("x", "heightCm")).toBe(50);
    expect(clampToLimit(72.56, "weightKg")).toBe(72.6);
  });

  it("isInLimit / inLimitRange / roundTo", () => {
    expect(isInLimit(175, "heightCm")).toBe(true);
    expect(isInLimit(175.5, "heightCm")).toBe(false);
    expect(isInLimit(NaN, "heightCm")).toBe(false);
    expect(inLimitRange(175.5, "heightCm")).toBe(true);
    expect(inLimitRange(null, "heightCm")).toBe(false);
    expect(roundTo(1.005, 0)).toBe(1);
    expect(roundTo(2.345, 2)).toBeCloseTo(2.35, 2);
  });

  it("ردیف غذای قدیمی با ده میلیارد کالری موقع خروجی گیره می‌شود", () => {
    const row = sanitizeFoodRow({ id: "x", customCalories: 1e10, grams: 1e9, proteinG: 1e6, carbsG: null, fatG: 5 });
    expect(row.customCalories).toBe(10000);
    expect(row.grams).toBe(10000);
    expect(row.proteinG).toBe(1000);
    expect(row.carbsG).toBeNull();
    expect(row.fatG).toBe(5);
    expect(safeDailyKcal(9e9)).toBe(30000);
    expect(safeDailyKcal(2100)).toBe(2100);
  });

  it("آمار ترید با سود قدیمی ده‌میلیاردی منفجر نمی‌شود", () => {
    const s = computeTradeStats(
      [
        { status: "CLOSED", pnl: 1e13, rMultiple: null, openedAt: "2026-01-01T10:00:00Z" },
        { status: "CLOSED", pnl: -100, rMultiple: null, openedAt: "2026-01-02T10:00:00Z" },
      ],
      { initialBalance: 1e15, goalType: "AMOUNT", goalValue: 0 },
    );
    expect(Math.abs(s.netPnl)).toBeLessThanOrEqual(1e9 + 1);
    expect(s.balance).toBeLessThanOrEqual(1e10 + 1e9 + 1);
  });
});

describe("سمت ورودی (تایپ)", () => {
  it("بیشتر از سقف همان لحظه روی سقف می‌نشیند", () => {
    expect(constrainTyped("99999", "heightCm")).toEqual({ text: "260", clamped: true });
    expect(constrainTyped("9999999999", "entryKcal")).toEqual({ text: "10000", clamped: true });
    expect(constrainTyped("150", "heightCm")).toEqual({ text: "150", clamped: false });
  });

  it("کف وسط تایپ اعمال نمی‌شود (5 برای 50)", () => {
    expect(constrainTyped("5", "heightCm")).toEqual({ text: "5", clamped: false });
  });

  it("اعشار اضافه بریده و صفر ابتدایی حذف می‌شود", () => {
    expect(constrainTyped("72.567", "weightKg").text).toBe("72.5");
    expect(constrainTyped("007", "reps").text).toBe("7");
    expect(constrainTyped("0.5", "foodAmount").text).toBe("0.5");
    expect(constrainTyped("12.5", "heightCm").text).toBe("12");
    expect(constrainTyped("", "heightCm").text).toBe("");
    expect(constrainTyped(".", "weightKg").text).toBe(".");
  });

  it("سقف پویا (max) از جدول جلوتر است", () => {
    expect(constrainTyped("100", "foodAmount", { max: 41 })).toEqual({ text: "41", clamped: true });
  });

  it("maxInputChars", () => {
    expect(maxInputChars("heightCm")).toBe(3);
    expect(maxInputChars("weightKg")).toBe(5);
    expect(maxInputChars("entryKcal")).toBe(8);
    expect(maxInputChars("tradePnl")).toBeGreaterThanOrEqual(14);
  });

  it("parseTyped / typedStatus / readTyped", () => {
    expect(parseTyped("\u06F1\u06F7\u06F5")).toBe(175);
    expect(parseTyped("")).toBeNull();
    expect(parseTyped(".")).toBeNull();
    expect(typedStatus("", "heightCm")).toBe("empty");
    expect(typedStatus("10", "heightCm")).toBe("low");
    expect(typedStatus("170", "heightCm")).toBe("ok");
    expect(typedStatus("999", "heightCm")).toBe("high");
    expect(typedStatus("100", "foodAmount", { max: 41 })).toBe("high");
    expect(readTyped("", "heightCm")).toEqual({ ok: true, value: null });
    expect(readTyped("170", "heightCm")).toEqual({ ok: true, value: 170 });
    expect(readTyped("72.55", "weightKg")).toEqual({ ok: true, value: 72.6 });
    const bad = readTyped("10", "heightCm");
    expect(bad.ok).toBe(false);
  });
});

describe("مقدار تنظیمات کاربر", () => {
  it("bodyMetrics: قد و وزن بیرون از بازه رد می‌شود", () => {
    expect(validateSettingNumbers("bodyMetrics", { heightCm: 99999 }).ok).toBe(false);
    expect(validateSettingNumbers("bodyMetrics", { weightKg: -5 }).ok).toBe(false);
    expect(validateSettingNumbers("bodyMetrics", { ageYears: 500 }).ok).toBe(false);
    const ok = validateSettingNumbers("bodyMetrics", { heightCm: 175.4, weightKg: 70.55, ageYears: 30, gender: "male", junk: "x" });
    expect(ok).toEqual({ ok: true, value: { heightCm: 175, weightKg: 70.6, ageYears: 30, gender: "male" } });
  });

  it("sleepLatency", () => {
    expect(validateSettingNumbers("sleepLatency", 15).ok).toBe(true);
    expect(validateSettingNumbers("sleepLatency", 1e9).ok).toBe(false);
  });

  it("medications: طول دوره و تعداد نوبت", () => {
    expect(validateSettingNumbers("medications", [{ timesPerDay: 3, durationDays: 7 }]).ok).toBe(true);
    expect(validateSettingNumbers("medications", [{ timesPerDay: 3, durationDays: 999999 }]).ok).toBe(false);
    expect(validateSettingNumbers("medications", [{ timesPerDay: 500, durationDays: 7 }]).ok).toBe(false);
  });

  it("customOccurrences: تعداد آیتم لیست", () => {
    const items = Array.from({ length: 101 }, (_, i) => ({ id: String(i), name: "x" }));
    expect(validateSettingNumbers("customOccurrences", [{ jsDay: 1, items }]).ok).toBe(false);
    expect(validateSettingNumbers("customOccurrences", [{ jsDay: 9 }]).ok).toBe(false);
    expect(validateSettingNumbers("customOccurrences", [{ jsDay: 1, items: items.slice(0, 30) }]).ok).toBe(true);
  });

  it("کلید بی‌ربط دست‌نخورده رد می‌شود", () => {
    expect(validateSettingNumbers("theme", "dark")).toEqual({ ok: true, value: "dark" });
  });
});

describe("حرکت برنامه‌ی تمرینی دستی", () => {
  it("ست، تکرار و مدت داخل متن سنجیده می‌شود", () => {
    expect(validateExerciseItem("اسکوات 3×10")).toBeNull();
    expect(validateExerciseItem("اسکوات \u06F4×\u06F1\u06F2")).toBeNull();
    expect(validateExerciseItem("اسکوات 999999×10")).not.toBeNull();
    expect(validateExerciseItem("اسکوات 3×999999")).not.toBeNull();
    expect(validateExerciseItem("پلانک 30 ثانیه")).toBeNull();
    expect(validateExerciseItem("پلانک 99999999 ثانیه")).not.toBeNull();
    expect(validateExerciseItem("دویدن 30 دقیقه")).toBeNull();
    expect(validateExerciseItem("دویدن 99999 دقیقه")).not.toBeNull();
    expect(validateExerciseItem("x".repeat(500))).not.toBeNull();
  });
});

describe("ترید: ورودی معامله و حساب", () => {
  const base = {
    accountId: "a1", symbol: "EURUSD", direction: "BUY", result: "PROFIT", status: "CLOSED",
    openedAt: "2026-01-01T10:00:00Z", volume: 0.1, pnl: 10,
  };

  it("معامله‌ی عادی قبول می‌شود", () => {
    const r = parseTradeInput(base);
    expect(typeof r).toBe("object");
  });

  it("سود نجومی، قیمت نجومی، حجم نجومی، کمیسیون نجومی و اطمینان اعشاری رد می‌شوند", () => {
    expect(typeof parseTradeInput({ ...base, pnl: 1e10 })).toBe("string");
    expect(typeof parseTradeInput({ ...base, entryPrice: 1e12 })).toBe("string");
    expect(typeof parseTradeInput({ ...base, volume: 1e7 })).toBe("string");
    expect(typeof parseTradeInput({ ...base, commission: 1e9 })).toBe("string");
    expect(typeof parseTradeInput({ ...base, confidence: 5.5 })).toBe("string");
    expect(typeof parseTradeInput({ ...base, volume: NaN })).toBe("string");
    expect(typeof parseTradeInput({ ...base, volume: 0 })).toBe("string");
    expect(typeof parseTradeInput({ ...base, volume: "0.1" })).toBe("string");
  });

  it("واحد دلار سقف بزرگ‌تری از لات دارد", () => {
    expect(typeof parseTradeInput({ ...base, volumeUnit: "USD", volume: 5e8 })).toBe("object");
    expect(typeof parseTradeInput({ ...base, volumeUnit: "LOT", volume: 5e8 })).toBe("string");
  });

  it("حساب: بالانس، هدف و اهرم", () => {
    expect(typeof parseAccountInput({ name: "A", initialBalance: 1000, leverage: 500 })).toBe("object");
    expect(typeof parseAccountInput({ name: "A", initialBalance: 1e11 })).toBe("string");
    expect(typeof parseAccountInput({ name: "A", initialBalance: -1 })).toBe("string");
    expect(typeof parseAccountInput({ name: "A", leverage: 1e6 })).toBe("string");
    expect(typeof parseAccountInput({ name: "A", leverage: 0 })).toBe("string");
    expect(typeof parseAccountInput({ name: "A", goalType: "PERCENT", goalValue: 50 })).toBe("object");
    expect(typeof parseAccountInput({ name: "A", goalType: "PERCENT", goalValue: 99999 })).toBe("string");
  });

  it("داده‌ی خراب اکسپرت متاتریدر معامله را نمی‌اندازد ولی عدد نجومی را حذف می‌کند", () => {
    const [t] = normalizeMtTrades([
      { ticket: "1", symbol: "EURUSD", type: "buy", volume: 1e12, openTime: 1700000000, openPrice: 1e15, profit: 1e15, commission: 1e15 },
    ]);
    expect(t).toBeTruthy();
    expect(t.volume).toBe(0);
    expect(t.openPrice).toBeNull();
    expect(t.profit).toBe(0);
    expect(t.commission).toBeNull();
  });
});

describe("ماشین‌حساب ریسک", () => {
  it("ورودی نجومی خطا می‌دهد، ورودی عادی جواب", () => {
    const ok = calcRisk({ symbol: "EURUSD", direction: "BUY", balance: 10000, mode: "percent", riskValue: 1, entry: 1.1, stopLoss: 1.09 });
    expect(ok.ok).toBe(true);
    const bigBal = calcRisk({ symbol: "EURUSD", direction: "BUY", balance: 1e15, mode: "percent", riskValue: 1, entry: 1.1, stopLoss: 1.09 });
    expect(bigBal.ok).toBe(false);
    const bigPrice = calcRisk({ symbol: "EURUSD", direction: "BUY", balance: 10000, mode: "percent", riskValue: 1, entry: 1e9, stopLoss: 1e9 - 1 });
    expect(bigPrice.ok).toBe(false);
    const bigRisk = calcRisk({ symbol: "EURUSD", direction: "BUY", balance: 10000, mode: "amount", riskValue: 1e12, entry: 1.1, stopLoss: 1.09 });
    expect(bigRisk.ok).toBe(false);
    expect(simplePipCalc({ symbol: "EURUSD", pips: 10, lots: 0.1, balance: 1000 }).ok).toBe(true);
    expect(simplePipCalc({ symbol: "EURUSD", pips: 1e12, lots: 0.1, balance: 1000 }).ok).toBe(false);
    expect(simplePipCalc({ symbol: "EURUSD", pips: 10, lots: 1e9, balance: 1000 }).ok).toBe(false);
  });
});

describe("POST /api/calorie/log", () => {
  function post(body: unknown) {
    return calorieLogPOST(new NextRequest("http://localhost/api/calorie/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }));
  }
  const good = { date: "2026-07-25", customName: "برنج", customCalories: 350, grams: 100, mealType: "lunch" };

  it("ثبت عادی قبول می‌شود", async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(created.at(-1)).toMatchObject({ customCalories: 350, grams: 100 });
  });

  it("ده میلیارد کالری با 400 رد می‌شود و چیزی ذخیره نمی‌شود", async () => {
    const before = created.length;
    const res = await post({ ...good, customCalories: 10_000_000_000 });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(typeof data.error).toBe("string");
    expect(created.length).toBe(before);
  });

  it("گرم نجومی، NaN (null در JSON)، منفی و رشته رد می‌شوند", async () => {
    for (const patch of [{ grams: 1e9 }, { grams: null }, { grams: -5 }, { customCalories: -1 }, { customCalories: "350" }, { grams: 0 }]) {
      const res = await post({ ...good, ...patch });
      expect(res.status, JSON.stringify(patch)).toBe(400);
    }
  });

  it("درشت‌مغذی نجومی یا ناقص (فقط عدد غیرمجاز) رد می‌شود", async () => {
    expect((await post({ ...good, proteinG: 1e9, carbsG: 1, fatG: 1 })).status).toBe(400);
    expect((await post({ ...good, proteinG: 20, carbsG: 30, fatG: 10 })).status).toBe(200);
  });
});
