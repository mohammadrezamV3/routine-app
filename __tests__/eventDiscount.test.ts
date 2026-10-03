import { describe, it, expect } from "vitest";
import {
  sanitizeEventDiscountState,
  occurrenceKey,
  eventDiscountCode,
  occurrenceExpiry,
  pendingEventDiscounts,
  eventDiscountSchedule,
  DEFAULT_EVENT_DISCOUNT_STATE,
  type EventDiscountState,
} from "@/lib/eventDiscount";
import { EVENT_THEMES, type EventTheme } from "@/lib/eventThemes";

const theme = (id: string) => EVENT_THEMES.find((t) => t.id === id)!;
const st = (p: Partial<EventDiscountState> = {}): EventDiscountState => ({ enabled: true, percent: 15, generated: {}, ...p });
const at = (iso: string) => new Date(iso);

describe("تخفیف مناسبت‌ها - اسم کد", () => {
  it("نمونه‌ها", () => {
    expect(eventDiscountCode(theme("nowruz"), { start: "2027-03-21", end: "2027-03-24" })).toBe("NOWRUZ1406");
    expect(eventDiscountCode(theme("halloween"), { start: "2026-10-31", end: "2026-11-01" })).toBe("HALLOWEEN1405");
    expect(eventDiscountCode(theme("christmas"), { start: "2026-12-25", end: "2026-12-30" })).toBe("XMAS1405");
    expect(eventDiscountCode(theme("eid-fitr"), theme("eid-fitr").occurrences[0])).toMatch(/^EIDFITR14\d\d$/);
  });

  it("پیشوند جایگزین برای تم ناشناخته", () => {
    const t = { ...theme("nowruz"), id: "my-theme_1" } as EventTheme;
    expect(eventDiscountCode(t, { start: "2027-03-21", end: "2027-03-22" })).toBe("MYTHEME1" + "1406");
  });

  it("همه‌ی وقوع‌های کاتالوگ معتبر و یکتان", () => {
    expect(EVENT_THEMES).toHaveLength(10);
    const seen = new Map<string, string>();
    for (const t of EVENT_THEMES) {
      for (const occ of t.occurrences) {
        const code = eventDiscountCode(t, occ);
        expect(code).toMatch(/^[A-Z0-9_-]{3,32}$/);
        const key = occurrenceKey(t.id, occ);
        expect(seen.has(code) ? `${code} تکراری: ${seen.get(code)} و ${key}` : "ok").toBe("ok");
        seen.set(code, key);
      }
    }
  });

  it("کلید وقوع", () => {
    expect(occurrenceKey("nowruz", { start: "2027-03-18", end: "2027-04-01" })).toBe("nowruz:2027-03-18");
  });
});

describe("تخفیف مناسبت‌ها - انقضا", () => {
  it("آخر روز end به وقت تهران", () => {
    expect(occurrenceExpiry({ start: "2027-03-21", end: "2027-03-24" }).toISOString()).toBe("2027-03-24T20:29:59.999Z");
  });
});

describe("تخفیف مناسبت‌ها - sanitize", () => {
  it("ورودی غیر شی = پیش‌فرض و کپی تازه", () => {
    for (const raw of [null, undefined, 5, "x", [], true]) {
      const s = sanitizeEventDiscountState(raw);
      expect(s).toEqual(DEFAULT_EVENT_DISCOUNT_STATE);
      expect(s.generated).not.toBe(DEFAULT_EVENT_DISCOUNT_STATE.generated);
    }
  });
  it("فیلدهای خراب", () => {
    expect(sanitizeEventDiscountState({ enabled: "no" }).enabled).toBe(true);
    expect(sanitizeEventDiscountState({ enabled: false }).enabled).toBe(false);
    for (const p of [0, 101, 12.5, "20", NaN, null, -3]) expect(sanitizeEventDiscountState({ percent: p }).percent).toBe(15);
    expect(sanitizeEventDiscountState({ percent: 1 }).percent).toBe(1);
    expect(sanitizeEventDiscountState({ percent: 100 }).percent).toBe(100);
  });
  it("generated فقط رشته‌ی معتبر", () => {
    const s = sanitizeEventDiscountState({
      generated: { a: "NOWRUZ1406", b: "bad code", c: 5, d: "AB", e: "X".repeat(33), f: "OK-_9", g: null },
    });
    expect(s.generated).toEqual({ a: "NOWRUZ1406", f: "OK-_9" });
    expect(sanitizeEventDiscountState({ generated: [1] }).generated).toEqual({});
    expect(sanitizeEventDiscountState({ generated: "x" }).generated).toEqual({});
  });
});

describe("تخفیف مناسبت‌ها - pending", () => {
  const nowruz = [theme("nowruz")];
  it("روز اول و آخر شامل، روز بعد و قبل نه", () => {
    // نوروز 2027-03-18 تا 2027-04-01 ؛ نیمه‌شب تهران = 20:30 UTC روز قبل
    expect(pendingEventDiscounts(st(), nowruz, at("2027-03-17T20:29:59Z"))).toHaveLength(0);
    expect(pendingEventDiscounts(st(), nowruz, at("2027-03-17T20:30:00Z"))).toHaveLength(1);
    expect(pendingEventDiscounts(st(), nowruz, at("2027-04-01T20:29:59Z"))).toHaveLength(1);
    expect(pendingEventDiscounts(st(), nowruz, at("2027-04-01T20:30:00Z"))).toHaveLength(0);
  });
  it("خروجی برنامه", () => {
    const [p] = pendingEventDiscounts(st({ percent: 30 }), nowruz, at("2027-03-20T08:00:00Z"));
    expect(p.themeId).toBe("nowruz");
    expect(p.key).toBe("nowruz:2027-03-18");
    expect(p.code).toBe("NOWRUZ1405"); // 18 مارس هنوز اسفند 1405 است
    expect(p.percent).toBe(30);
    expect(p.expiresAt.toISOString()).toBe("2027-04-01T20:29:59.999Z");
  });
  it("enabled خاموش و generated", () => {
    const now = at("2027-03-20T08:00:00Z");
    expect(pendingEventDiscounts(st({ enabled: false }), nowruz, now)).toEqual([]);
    expect(pendingEventDiscounts(st({ generated: { "nowruz:2027-03-18": "NOWRUZ1406" } }), nowruz, now)).toEqual([]);
    expect(pendingEventDiscounts(st({ generated: { "nowruz:2028-03-16": "X1X" } }), nowruz, now)).toHaveLength(1);
  });
  it("چند تم هم‌زمان", () => {
    const r = pendingEventDiscounts(st(), EVENT_THEMES, at("2026-12-20T08:00:00Z"));
    expect(r.map((x) => x.themeId)).toEqual(["yalda"]);
    const r2 = pendingEventDiscounts(st(), EVENT_THEMES, at("2026-12-23T08:00:00Z"));
    expect(r2.map((x) => x.themeId)).toEqual(["christmas"]);
    const two: EventTheme[] = [theme("yalda"), { ...theme("christmas"), occurrences: [{ start: "2026-12-20", end: "2026-12-30" }] }];
    expect(pendingEventDiscounts(st(), two, at("2026-12-21T08:00:00Z"))).toHaveLength(2);
  });
});

describe("تخفیف مناسبت‌ها - برنامه‌ی نمایشی", () => {
  const now = at("2026-10-28T08:00:00Z"); // هالووین جاری
  it("جاری و آینده، مرتب، با live", () => {
    const rows = eventDiscountSchedule(st(), EVENT_THEMES, now, 100);
    expect(rows[0].themeId).toBe("halloween");
    expect(rows[0].live).toBe(true);
    expect(rows.filter((r) => r.live)).toHaveLength(1);
    const starts = rows.map((r) => r.occurrence.start);
    expect([...starts].sort()).toEqual(starts);
    // همه‌ی وقوع‌های آینده‌ی همه‌ی تم‌ها، نه فقط یکی برای هر تم
    expect(rows.filter((r) => r.themeId === "nowruz")).toHaveLength(2);
    expect(rows.every((r) => r.live || r.occurrence.start > "2026-10-28")).toBe(true);
    expect(rows.some((r) => r.occurrence.start === "2027-10-25" && r.themeId === "halloween")).toBe(true);
  });
  it("سقف پیش‌فرض 6 و limit", () => {
    expect(eventDiscountSchedule(st(), EVENT_THEMES, now)).toHaveLength(6);
    expect(eventDiscountSchedule(st(), EVENT_THEMES, now, 2)).toHaveLength(2);
    expect(eventDiscountSchedule(st(), EVENT_THEMES, now, 0)).toHaveLength(0);
  });
  it("تساوی start بر اساس شناسه‌ی تم و generatedCode", () => {
    const a: EventTheme = { ...theme("nowruz"), id: "b-theme", occurrences: [{ start: "2027-01-01", end: "2027-01-02" }] };
    const b: EventTheme = { ...theme("nowruz"), id: "a-theme", occurrences: [{ start: "2027-01-01", end: "2027-01-02" }] };
    const rows = eventDiscountSchedule(st({ generated: { "a-theme:2027-01-01": "ATHEME1405" } }), [a, b], now);
    expect(rows.map((r) => r.themeId)).toEqual(["a-theme", "b-theme"]);
    expect(rows[0].generatedCode).toBe("ATHEME1405");
    expect(rows[1].generatedCode).toBeNull();
  });
  it("وقوع گذشته نمیاد", () => {
    const rows = eventDiscountSchedule(st(), EVENT_THEMES, at("2027-10-30T08:00:00Z"), 100);
    expect(rows.every((r) => r.occurrence.end >= "2027-10-30")).toBe(true);
  });
});
