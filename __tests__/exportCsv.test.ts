import { describe, it, expect } from "vitest";
import { CSV_BOM, csvEscape, toCsv, cellToString } from "@/lib/export/csv";
import { jalaliDay, isoDay } from "@/lib/export/dates";
import { calorieTable, completedItemNames, resolveTaskTitle, routineTable, sleepTable, tradeTable } from "@/lib/export/rows";
import { parseExportParams, dateTimeWhere } from "@/lib/export/params";

describe("csv", () => {
  it("ویرگول، نقل‌قول و خط‌شکن را درست escape می‌کند", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("l1\nl2")).toBe('"l1\nl2"');
    expect(csvEscape("plain")).toBe("plain");
  });
  it("متن فارسی دست‌نخورده می‌ماند و BOM اول فایل است", () => {
    const out = toCsv(["name"], [{ name: "ورزش صبحگاهی, سبک" }]);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out).toContain('"ورزش صبحگاهی, سبک"');
    expect(toCsv(["a"], [], { bom: false }).startsWith(CSV_BOM)).toBe(false);
  });
  it("سطرها با CRLF جدا می‌شوند", () => {
    expect(toCsv(["a", "b"], [{ a: 1, b: 2 }], { bom: false })).toBe("a,b\r\n1,2\r\n");
  });
  it("عدد منفی عدد می‌ماند ولی متن فرمول‌مانند خنثی می‌شود", () => {
    expect(csvEscape(-12.5)).toBe("-12.5");
    expect(csvEscape("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvEscape("@cmd")).toBe("'@cmd");
  });
  it("مقدارهای تهی، بولی و آرایه", () => {
    expect(cellToString(null)).toBe("");
    expect(cellToString(true)).toBe("true");
    expect(cellToString(["a", "b"])).toBe("a | b");
    expect(cellToString(NaN)).toBe("");
  });
});

describe("dates", () => {
  it("ISO و جلالی با ارقام لاتین", () => {
    const d = new Date("2026-03-21T00:00:00.000Z");
    expect(isoDay(d)).toBe("2026-03-21");
    expect(jalaliDay(d)).toMatch(/^1405-0[12]-\d{2}$/);
    expect(jalaliDay(null)).toBe("");
  });
});

describe("row mappers", () => {
  const occs = [{ id: "o1", name: "مطالعه", items: [{ id: "i1", name: "فصل 1" }] }];
  it("عنوان کلید تیک از برنامه‌های سفارشی", () => {
    expect(resolveTaskTitle("o1", occs)).toBe("مطالعه");
    expect(resolveTaskTitle("o1~i1", occs)).toBe("مطالعه / فصل 1");
    expect(resolveTaskTitle("zzz", occs)).toBe("");
  });
  it("روتین: روز بدون تیک هم یک ردیف دارد", () => {
    const t = routineTable([
      { date: new Date("2026-05-01T00:00:00Z"), completedItems: { o1: true, x: false }, wakeUpAt: null },
      { date: new Date("2026-05-02T00:00:00Z"), completedItems: {}, wakeUpAt: new Date("2026-05-02T04:00:00Z") },
    ], occs);
    expect(t.rows).toHaveLength(3);
    expect(t.rows[0]).toMatchObject({ task_key: "o1", title: "مطالعه", done: true });
    expect(t.rows[1]).toMatchObject({ task_key: "x", done: false });
    expect(t.rows[2]).toMatchObject({ task_key: "", wake_up_at: "2026-05-02T04:00:00.000Z" });
  });
  it("خواب: مدت از روی ساعت‌ها", () => {
    const t = sleepTable([{ date: new Date("2026-05-02T00:00:00Z"), sleptAt: new Date("2026-05-01T20:00:00Z"), wokeAt: new Date("2026-05-02T03:30:00Z"), targetSleptAt: null, targetWokeAt: null, quality: 4, note: null, latencyMin: null, awakenings: null, napMin: null, tags: ["coffee"] }]);
    expect(t.rows[0].duration_min).toBe(450);
  });
  it("کالری: درشت‌مغذی از مقدار هر 100 گرم محاسبه می‌شود", () => {
    const t = calorieTable([{ date: new Date("2026-05-02T00:00:00Z"), grams: 150, mealType: "lunch", customName: null, customCalories: null, proteinG: null, carbsG: null, fatG: null, foodItem: { nameFa: "برنج", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 } }]);
    expect(t.rows[0]).toMatchObject({ food: "برنج", calories: 195, protein_g: 4.1, carbs_g: 42 });
  });
  it("تمرین: آرایه و نگاشت هر دو پشتیبانی می‌شوند", () => {
    expect(completedItemNames(["پرس", "اسکوات"])).toEqual(["پرس", "اسکوات"]);
    expect(completedItemNames({ پرس: true, اسکوات: false })).toEqual(["پرس"]);
    expect(completedItemNames(null)).toEqual([]);
  });
  it("ترید: ستون تصویر ندارد و سود منفی منفی می‌ماند", () => {
    const base: any = { openedAt: new Date("2026-05-02T10:00:00Z"), closedAt: null, symbol: "EURUSD", direction: "BUY", timeframe: "1h", status: "CLOSED", result: "LOSS", volume: 0.1, volumeUnit: "LOT", pnl: -20, riskFree: false, entryPrice: null, exitPrice: null, stopLoss: null, takeProfit: null, commission: null, swap: null, riskAmount: null, rMultiple: null, sessions: ["LONDON"], setup: null, entryReasons: ["FOMO"], entryReasonNote: null, exitReasons: [], exitReasonNote: null, note: "یادداشت, با ویرگول", emotionBefore: null, emotionAfter: null, confidence: null, followedPlan: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: [{ text: "x", checked: true }], tags: [{ name: "a" }], externalSource: null, externalId: null, account: { name: "حساب 1", currency: "USD" } };
    const t = tradeTable([base]);
    expect(t.columns.join()).not.toMatch(/image/);
    const csv = toCsv(t.columns, t.rows);
    expect(csv).toContain(",-20,");
    expect(csv).toContain('"یادداشت, با ویرگول"');
    expect(csv).toContain("FOMO");
    expect(csv).toContain("[x] x");
  });
});

describe("params", () => {
  const sp = (s: string) => new URLSearchParams(s);
  it("ماژول و قالب نامعتبر رد می‌شود", () => {
    expect(parseExportParams(sp("module=users&format=csv")).ok).toBe(false);
    expect(parseExportParams(sp("module=trade&format=xml")).ok).toBe(false);
    expect(parseExportParams(sp("module=all&format=csv")).ok).toBe(false);
  });
  it("پیش‌فرض قالب و بازه", () => {
    const r = parseExportParams(sp("module=sleep&from=2026-01-01&to=2026-01-31"));
    expect(r.ok && r.value.format).toBe("csv");
    expect(parseExportParams(sp("module=sleep&from=2026-02-31")).ok).toBe(false);
    expect(parseExportParams(sp("module=sleep&from=2026-03-01&to=2026-01-01")).ok).toBe(false);
    expect(parseExportParams(sp("module=trade&accountId=a%20b")).ok).toBe(false);
  });
  it("روز پایان در بازه‌ی زمانی شامل خودش است", () => {
    const w = dateTimeWhere({ from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-01-31T00:00:00Z") })!;
    expect(w.lt!.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });
});
