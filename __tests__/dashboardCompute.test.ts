import { describe, it, expect } from "vitest";
import {
  dayPhase,
  awakeProgress,
  minutesUntilSleep,
  buildHeatmap,
  heatLevel,
  streakFromHeatmap,
  sparkPath,
  cumulative,
  durationParts,
  compactNumber,
  PHASE_GREETING,
  type HeatCell,
} from "@/lib/dashboardCompute";
import { isoLocal } from "@/lib/jalali";

// همه‌ی تاریخ‌ها با سازنده‌ی محلی ساخته می‌شن تا نتیجه به TZ ماشین بستگی نداشته باشه.
const at = (h: number, m = 0) => new Date(2026, 8, 30, h, m);

describe("dayPhase", () => {
  it("مرزهای فاز روز", () => {
    expect(dayPhase(at(4, 59))).toBe("night");
    expect(dayPhase(at(5, 0))).toBe("dawn");
    expect(dayPhase(at(10, 59))).toBe("dawn");
    expect(dayPhase(at(11, 0))).toBe("day");
    expect(dayPhase(at(16, 59))).toBe("day");
    expect(dayPhase(at(17, 0))).toBe("dusk");
    expect(dayPhase(at(20, 59))).toBe("dusk");
    expect(dayPhase(at(21, 0))).toBe("night");
    expect(dayPhase(at(0, 0))).toBe("night");
  });

  it("برای هر فاز سلام تعریف شده", () => {
    for (const p of ["dawn", "day", "dusk", "night"] as const) {
      expect(PHASE_GREETING[p]).toBeTruthy();
    }
  });
});

describe("awakeProgress", () => {
  it("حالت عادی: ۰۷:۰۰ تا ۲۳:۰۰ ساعت ۱۵ → ۰.۵", () => {
    expect(awakeProgress(at(15), "07:00", "23:00")).toBeCloseTo(0.5, 10);
  });

  it("قبل از بیداری → ۰ و بعد از خواب → ۱", () => {
    expect(awakeProgress(at(6, 30), "07:00", "23:00")).toBe(0);
    expect(awakeProgress(at(7, 0), "07:00", "23:00")).toBe(0);
    expect(awakeProgress(at(23, 0), "07:00", "23:00")).toBe(1);
    expect(awakeProgress(at(23, 45), "07:00", "23:00")).toBe(1);
  });

  it("خوابِ بعد از نیمه‌شب: ۰۰:۴۰ با بیداری ۰۹:۳۰ و خواب ۰۱:۳۰", () => {
    const p = awakeProgress(at(0, 40), "09:30", "01:30");
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0.9);
    expect(p!).toBeLessThan(1);
  });

  it("خوابِ بعد از نیمه‌شب: ظهر و شب وسطِ قوس‌اند", () => {
    const noon = awakeProgress(at(12), "09:30", "01:30")!;
    const night = awakeProgress(at(23), "09:30", "01:30")!;
    expect(noon).toBeGreaterThan(0);
    expect(noon).toBeLessThan(night);
    expect(night).toBeLessThan(1);
  });

  it("خوابِ بعد از نیمه‌شب: قبل از بیداری → ۰", () => {
    expect(awakeProgress(at(9, 0), "09:30", "01:30")).toBe(0);
  });

  // منبع: بین «خواب» (۰۱:۳۰) و «بیداری» (۰۹:۳۰)، cur<=w برقرار می‌شه و ۰ برمی‌گرده؛
  // ولی داک‌استرینگ می‌گه «بعد از خواب → ۱». (۰۲:۰۰ باید ۱ باشه، ۰۹:۰۰ باید ۰.)
  it("خوابِ بعد از نیمه‌شب: ۰۲:۰۰ (بعد از خواب) → ۱", () => {
    expect(awakeProgress(at(2, 0), "09:30", "01:30")).toBe(1);
  });

  it("ورودیِ نامعتبر → null", () => {
    expect(awakeProgress(at(12), "abc", "23:00")).toBeNull();
    expect(awakeProgress(at(12), "07:00", "")).toBeNull();
    expect(awakeProgress(at(12), "24:00", "23:00")).toBeNull();
    expect(awakeProgress(at(12), "07:60", "23:00")).toBeNull();
    expect(awakeProgress(at(12), "7-00", "23:00")).toBeNull();
  });

  it("ساعتِ تک‌رقمی و فاصله‌ی اطراف پذیرفته می‌شه", () => {
    expect(awakeProgress(at(15), " 7:00 ", "23:00")).toBeCloseTo(0.5, 10);
  });
});

describe("minutesUntilSleep", () => {
  it("حالت عادی", () => {
    expect(minutesUntilSleep(at(15), "07:00", "23:00")).toBe(480);
    expect(minutesUntilSleep(at(22, 30), "07:00", "23:00")).toBe(30);
  });

  it("قبل از بیداری کلِ بازه، بعد از خواب صفر", () => {
    expect(minutesUntilSleep(at(5), "07:00", "23:00")).toBe(16 * 60);
    expect(minutesUntilSleep(at(23, 30), "07:00", "23:00")).toBe(0);
  });

  it("خوابِ بعد از نیمه‌شب", () => {
    // ۰۰:۴۰ تا ۰۱:۳۰ = ۵۰ دقیقه
    expect(minutesUntilSleep(at(0, 40), "09:30", "01:30")).toBe(50);
  });

  it("ورودیِ نامعتبر → null", () => {
    expect(minutesUntilSleep(at(12), "x", "23:00")).toBeNull();
    expect(minutesUntilSleep(at(12), "07:00", "99:99")).toBeNull();
  });
});

describe("heatLevel", () => {
  it("مرزها", () => {
    expect(heatLevel(null)).toBe(-1);
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(39)).toBe(1);
    expect(heatLevel(40)).toBe(2);
    expect(heatLevel(74)).toBe(2);
    expect(heatLevel(75)).toBe(3);
    expect(heatLevel(99)).toBe(3);
    expect(heatLevel(100)).toBe(4);
  });
});

describe("buildHeatmap", () => {
  // چهارشنبه ۳۰ سپتامبر ۲۰۲۶ (getDay()===3)
  const today = new Date(2026, 8, 30, 12, 0);
  const todayIso = "2026-09-30";
  const WEEKS = 5;
  // فقط دوشنبه‌ها (jsDay=1) برنامه دارن
  const opts = {
    removedOccurrences: new Set<string>(),
    customOccurrences: [{ id: "a", name: "x", jsDay: 1, time: "10:00" }],
  };

  it("پیش‌فرضِ تست درست تنظیم شده", () => {
    expect(today.getDay()).toBe(3);
    expect(isoLocal(today)).toBe(todayIso);
  });

  it("ساختار: weeks ستون، هر ستون ۷ خانه، شروعِ ستون شنبه", () => {
    const cols = buildHeatmap(today, WEEKS, opts, {});
    expect(cols).toHaveLength(WEEKS);
    for (const col of cols) {
      expect(col).toHaveLength(7);
      const [y, m, d] = col[0].iso.split("-").map(Number);
      expect(new Date(y, m - 1, d).getDay()).toBe(6);
    }
  });

  it("روزها پشت‌سرهم و بدون شکاف‌اند", () => {
    const flat = buildHeatmap(today, WEEKS, opts, {}).flat();
    for (let i = 1; i < flat.length; i++) {
      const [y, m, d] = flat[i - 1].iso.split("-").map(Number);
      expect(flat[i].iso).toBe(isoLocal(new Date(y, m - 1, d + 1)));
    }
  });

  it("آخرین ستون شاملِ امروز است و همان یک خانه today:true دارد", () => {
    const cols = buildHeatmap(today, WEEKS, opts, {});
    expect(cols[cols.length - 1].some((c) => c.today)).toBe(true);
    const todays = cols.flat().filter((c) => c.today);
    expect(todays).toHaveLength(1);
    expect(todays[0].iso).toBe(todayIso);
  });

  it("روزهای آینده future:true و pct:null دارن", () => {
    // ستونِ شنبه..جمعه؛ امروز چهارشنبه (ایندکس ۴) → پنج‌شنبه و جمعه آینده‌اند
    const last = buildHeatmap(today, WEEKS, opts, {})[WEEKS - 1];
    expect(last.map((c) => c.future)).toEqual([false, false, false, false, false, true, true]);
    for (const c of last.filter((c) => c.future)) expect(c.pct).toBeNull();
    // حتی اگه رکوردی برای آینده باشه، pct نباید محاسبه بشه
    const cols = buildHeatmap(today, WEEKS, opts, { [last[6].iso]: { tasks: { a: true } } });
    expect(cols[WEEKS - 1][6].pct).toBeNull();
  });

  it("امروز future نیست", () => {
    const cell = buildHeatmap(today, WEEKS, opts, {}).flat().find((c) => c.today)!;
    expect(cell.future).toBe(false);
  });

  it("روزِ بدونِ برنامه pct:null دارد", () => {
    const cols = buildHeatmap(today, WEEKS, opts, {});
    for (const c of cols.flat().filter((c) => !c.future)) {
      const [y, m, d] = c.iso.split("-").map(Number);
      const day = new Date(y, m - 1, d).getDay();
      if (day !== 1) expect(c.pct).toBeNull();
      else expect(c.pct).toBe(0);
    }
  });

  it("روزِ کاملاً تیک‌خورده ۱۰۰ می‌شه، بدونِ رکورد ۰", () => {
    // دوشنبه‌ی همین هفته: ۲۰۲۶-۰۹-۲۸
    const cols = buildHeatmap(today, WEEKS, opts, { "2026-09-28": { tasks: { a: true } } });
    const cell = cols.flat().find((c) => c.iso === "2026-09-28")!;
    expect(cell.pct).toBe(100);
    const other = cols.flat().find((c) => c.iso === "2026-09-21")!;
    expect(other.pct).toBe(0);
  });

  it("درصدِ جزئی گرد می‌شه", () => {
    const o = {
      removedOccurrences: new Set<string>(),
      customOccurrences: [
        { id: "a", name: "a", jsDay: 1, time: "08:00" },
        { id: "b", name: "b", jsDay: 1, time: "09:00" },
        { id: "c", name: "c", jsDay: 1, time: "10:00" },
      ],
    };
    const cols = buildHeatmap(today, WEEKS, o, { "2026-09-28": { tasks: { a: true, b: false } } });
    expect(cols.flat().find((c) => c.iso === "2026-09-28")!.pct).toBe(33);
  });

  it("وقتی امروز شنبه است، آخرین ستون با امروز شروع می‌شه", () => {
    const sat = new Date(2026, 9, 3, 9, 0); // شنبه ۳ اکتبر
    expect(sat.getDay()).toBe(6);
    const cols = buildHeatmap(sat, 3, opts, {});
    expect(cols[2][0].today).toBe(true);
    expect(cols[2].slice(1).every((c) => c.future)).toBe(true);
  });

  it("وقتی امروز جمعه است، آخرین خانه امروز است", () => {
    const fri = new Date(2026, 9, 2, 9, 0);
    expect(fri.getDay()).toBe(5);
    const cols = buildHeatmap(fri, 3, opts, {});
    expect(cols[2][6].today).toBe(true);
    expect(cols.flat().some((c) => c.future)).toBe(false);
  });
});

describe("streakFromHeatmap", () => {
  const cell = (iso: string, pct: number | null, extra: Partial<HeatCell> = {}): HeatCell => ({
    iso, pct, future: false, today: false, ...extra,
  });

  it("ستون‌های خالی → ۰", () => {
    expect(streakFromHeatmap([])).toBe(0);
  });

  it("روزهای بدون برنامه (null) رد می‌شن و استریک نمی‌شکنه", () => {
    const cols = [[cell("d1", 100), cell("d2", null), cell("d3", 100), cell("d4", null), cell("d5", 100, { today: true })]];
    expect(streakFromHeatmap(cols)).toBe(3);
  });

  it("روزِ غیر ۱۰۰ استریک را می‌شکند", () => {
    const cols = [[cell("d1", 100), cell("d2", 100), cell("d3", 99), cell("d4", 100), cell("d5", 100), cell("d6", null, { today: true })]];
    expect(streakFromHeatmap(cols)).toBe(2);
  });

  it("امروز فقط وقتی ۱۰۰ است شمرده می‌شه و هیچ‌وقت استریک را نمی‌شکند", () => {
    const partial = [[cell("d1", 100), cell("d2", 100), cell("d3", 50, { today: true })]];
    expect(streakFromHeatmap(partial)).toBe(2);
    const done = [[cell("d1", 100), cell("d2", 100), cell("d3", 100, { today: true })]];
    expect(streakFromHeatmap(done)).toBe(3);
    const none = [[cell("d1", 100), cell("d2", 100), cell("d3", null, { today: true })]];
    expect(streakFromHeatmap(none)).toBe(2);
  });

  it("خانه‌های آینده نادیده گرفته می‌شن", () => {
    const cols = [[
      cell("d1", 100), cell("d2", 100, { today: true }),
      cell("d3", null, { future: true }), cell("d4", 0, { future: true }),
    ]];
    expect(streakFromHeatmap(cols)).toBe(2);
  });

  it("با ستون‌های چندگانه کار می‌کند", () => {
    const cols = [
      [cell("a1", 0), cell("a2", 100)],
      [cell("b1", 100), cell("b2", 100), cell("b3", 20, { today: true })],
    ];
    expect(streakFromHeatmap(cols)).toBe(3);
  });

  it("روی خروجیِ buildHeatmap", () => {
    const today = new Date(2026, 8, 30, 12);
    const opts = {
      removedOccurrences: new Set<string>(),
      customOccurrences: [1, 2, 3].map((jsDay) => ({ id: `t${jsDay}`, name: "x", jsDay, time: "10:00" })),
    };
    // دوشنبه و سه‌شنبه کامل، امروز (چهارشنبه) کامل
    const daily = {
      "2026-09-28": { tasks: { t1: true } },
      "2026-09-29": { tasks: { t2: true } },
      "2026-09-30": { tasks: { t3: true } },
    };
    expect(streakFromHeatmap(buildHeatmap(today, 2, opts, daily))).toBe(3);
    // امروز ناقص → فقط دو روزِ قبل
    expect(streakFromHeatmap(buildHeatmap(today, 2, opts, { ...daily, "2026-09-30": { tasks: {} } }))).toBe(2);
  });
});

describe("sparkPath", () => {
  it("کمتر از ۲ مقدار → null", () => {
    expect(sparkPath([], 100, 40)).toBeNull();
    expect(sparkPath([5], 100, 40)).toBeNull();
  });

  it("مسیر با M شروع می‌شه و ناحیه بسته است", () => {
    const s = sparkPath([1, 3, 2, 5], 100, 40)!;
    expect(s.line.startsWith("M")).toBe(true);
    expect(s.line.match(/C/g)).toHaveLength(3);
    expect(s.area.startsWith(s.line)).toBe(true);
    expect(s.area.endsWith("Z")).toBe(true);
    expect(s.area).toContain("L100 40 L0 40 Z");
  });

  it("last برابر آخرین نقطه است (x=w، بیشینه روی y=pad)", () => {
    const s = sparkPath([1, 3, 2, 5], 100, 40, 4)!;
    expect(s.last.x).toBeCloseTo(100, 10);
    expect(s.last.y).toBeCloseTo(4, 10);
    const lastPoint = s.line.split(" ").slice(-2).map((v) => Number(v.replace(/^C/, "")));
    expect(lastPoint[0]).toBeCloseTo(s.last.x, 1);
    expect(lastPoint[1]).toBeCloseTo(s.last.y, 1);
  });

  it("کمینه روی h-pad و پدینگِ پیش‌فرض ۴", () => {
    const s = sparkPath([5, 1], 100, 40)!;
    expect(s.line.startsWith("M0 4 ")).toBe(true);
    expect(s.last.y).toBeCloseTo(36, 10);
  });

  it("zeroY فقط وقتی سری از صفر رد می‌شه عدد است", () => {
    expect(sparkPath([1, 2, 3], 100, 40)!.zeroY).toBeNull();
    expect(sparkPath([-3, -2, -1], 100, 40)!.zeroY).toBeNull();
    // لمس‌کردنِ صفر (min=0 یا max=0) عبور نیست
    expect(sparkPath([0, 2, 3], 100, 40)!.zeroY).toBeNull();
    expect(sparkPath([-3, -1, 0], 100, 40)!.zeroY).toBeNull();
    const z = sparkPath([-10, 10], 100, 40, 4)!.zeroY;
    expect(typeof z).toBe("number");
    expect(z).toBeCloseTo(20, 5);
  });

  it("سریِ ثابت خطا نمی‌ده (range=1)", () => {
    const s = sparkPath([7, 7, 7], 90, 30)!;
    expect(s.line).not.toContain("NaN");
    expect(s.last.x).toBeCloseTo(90, 10);
  });
});

describe("cumulative", () => {
  it("جمعِ تجمعی", () => {
    expect(cumulative([1, 2, 3])).toEqual([1, 3, 6]);
    expect(cumulative([5, -10, 20])).toEqual([5, -5, 15]);
    expect(cumulative([])).toEqual([]);
  });
});

describe("durationParts", () => {
  it("تبدیل میلی‌ثانیه به روز/ساعت/دقیقه", () => {
    expect(durationParts(0)).toEqual({ d: 0, h: 0, m: 0 });
    expect(durationParts(59_999)).toEqual({ d: 0, h: 0, m: 0 });
    expect(durationParts(60_000)).toEqual({ d: 0, h: 0, m: 1 });
    expect(durationParts((2 * 60 + 15) * 60_000)).toEqual({ d: 0, h: 2, m: 15 });
    expect(durationParts((1440 + 3 * 60 + 7) * 60_000)).toEqual({ d: 1, h: 3, m: 7 });
    expect(durationParts(3 * 1440 * 60_000)).toEqual({ d: 3, h: 0, m: 0 });
  });

  it("مقدارِ منفی → صفر", () => {
    expect(durationParts(-5000)).toEqual({ d: 0, h: 0, m: 0 });
  });
});

describe("compactNumber", () => {
  it("اعدادِ کوچک", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1250)).toBe("1250");
    expect(compactNumber(9999)).toBe("9999");
    expect(compactNumber(12.345)).toBe("12.35");
    expect(compactNumber(-500)).toBe("-500");
  });

  it("هزار و میلیون", () => {
    expect(compactNumber(10_000)).toBe("10K");
    expect(compactNumber(12345)).toBe("12.3K");
    expect(compactNumber(-12345)).toBe("-12.3K");
    expect(compactNumber(1_250_000)).toBe("1.3M");
    expect(compactNumber(-1_250_000)).toBe("-1.3M");
    expect(compactNumber(1_000_000)).toBe("1M");
  });
});
