import { describe, it, expect } from "vitest";
import { dashboardBlocks, hrefAllowedIn, packRows, sectionAreas, type DashArea } from "@/lib/dashboardSection";

describe("dashboardBlocks", () => {
  it("دامنه‌ی اصلی همه‌ی بلوک‌های قبلی رو داره و خواب نه", () => {
    expect(dashboardBlocks(null)).toEqual({ routine: true, fitness: true, trade: true, roadmaps: true, sleep: false });
  });
  it("هر بخش فقط بلوک‌های خودش", () => {
    expect(dashboardBlocks("routine")).toEqual({ routine: true, fitness: false, trade: false, roadmaps: true, sleep: true });
    expect(dashboardBlocks("workout")).toEqual({ routine: false, fitness: true, trade: false, roadmaps: false, sleep: true });
    expect(dashboardBlocks("trade")).toEqual({ routine: false, fitness: false, trade: true, roadmaps: false, sleep: false });
  });
});

describe("hrefAllowedIn", () => {
  it("query و hash نادیده گرفته می‌شن", () => {
    expect(hrefAllowedIn("workout", "/exercise?tab=calorie")).toBe(true);
    expect(hrefAllowedIn("routine", "/weekly?add=1")).toBe(true);
    expect(hrefAllowedIn("routine", "/exercise?tab=exercise")).toBe(false);
    expect(hrefAllowedIn("trade", "/trade/journal")).toBe(true);
    expect(hrefAllowedIn("trade", "/sleep")).toBe(false);
  });
  it("مسیر مشترک همه‌جا باز می‌شه و دامنه‌ی اصلی همه‌چیز", () => {
    for (const s of ["routine", "workout", "trade"] as const) expect(hrefAllowedIn(s, "/mentors")).toBe(true);
    expect(hrefAllowedIn(null, "/trade/chart")).toBe(true);
    expect(hrefAllowedIn(null, "/weekly")).toBe(true);
  });
  it("sleep مال روتین و ورزشه", () => {
    expect(hrefAllowedIn("routine", "/sleep")).toBe(true);
    expect(hrefAllowedIn("workout", "/sleep")).toBe(true);
  });
});

describe("packRows", () => {
  it("چهار کارت روی سه ستون = دو ردیف دوتایی", () => {
    expect(packRows(["a", "b", "c", "d"], 3)).toEqual(['"a a b"', '"c c d"']);
  });
  it("یک تا سه کارت یک ردیف پر", () => {
    expect(packRows(["a"], 3)).toEqual(['"a a a"']);
    expect(packRows(["a", "b"], 3)).toEqual(['"a a b"']);
    expect(packRows(["a", "b", "c"], 3)).toEqual(['"a b c"']);
    expect(packRows([], 3)).toEqual([]);
  });
});

const set = (...a: DashArea[]) => new Set<DashArea>(a);

describe("sectionAreas", () => {
  it("روتین: امروز + نقشه‌ی ثبات بالا، بقیه متوازن", () => {
    const a = sectionAreas(set("inbox", "today", "heat", "sleep", "road", "mentor"), "routine");
    expect(a.lg.startsWith('"today heat heat"')).toBe(true);
    expect(a.sm).toBe('"today" "heat" "sleep" "road" "mentor" "inbox"');
  });
  it("ورزش: فضای تمرین ردیف تمام‌عرض اول، بقیه متوازن", () => {
    const a = sectionAreas(set("inbox", "space", "sleep", "mentor"), "workout");
    expect(a.lg).toBe('"space space space" "sleep mentor inbox"');
    expect(a.md).toBe('"space space" "sleep mentor" "inbox inbox"');
    expect(a.sm).toBe('"space" "sleep" "mentor" "inbox"');
  });
  it("ورزش بدون فضای تمرین: فقط بقیه، و ex/cal دیگه چیده نمی‌شن", () => {
    const a = sectionAreas(set("inbox"), "workout");
    expect(a.lg).toBe('"inbox inbox inbox"');
    const b = sectionAreas(set("inbox", "ex", "cal"), "workout");
    expect(b.lg).not.toContain("ex");
    expect(b.sm).toBe('"inbox"');
  });
  it("ترید: عملکرد و بازار اول و فقط کارت‌های موجود", () => {
    const a = sectionAreas(set("inbox", "trade", "market", "mentor"), "trade");
    expect(a.lg).toBe('"trade trade market" "mentor mentor inbox"');
    expect(a.md).toBe('"trade trade" "market market" "mentor inbox"');
    const b = sectionAreas(set("inbox", "trade"), "trade");
    expect(b.lg).toBe('"trade trade trade" "inbox inbox inbox"');
  });
  it("ترید با ابزارها: ردیف تمام‌عرض بعد از عملکرد و بازار", () => {
    const a = sectionAreas(set("inbox", "trade", "market", "tools", "mentor"), "trade");
    expect(a.lg).toBe('"trade trade market" "tools tools tools" "mentor mentor inbox"');
    expect(a.md).toBe('"trade trade" "market market" "tools tools" "mentor inbox"');
    expect(a.sm).toBe('"trade" "market" "tools" "mentor" "inbox"');
    const b = sectionAreas(set("inbox", "tools"), "trade");
    expect(b.lg).toBe('"tools tools tools" "inbox inbox inbox"');
  });
  it("هر ناحیه فقط یک بار و فقط از کارت‌های موجود", () => {
    const has = set("inbox", "today", "heat", "sleep", "mentor");
    const a = sectionAreas(has, "routine");
    for (const g of [a.lg, a.md, a.sm]) for (const name of g.match(/[a-z]+/g) ?? []) expect(has.has(name as DashArea)).toBe(true);
  });
});
