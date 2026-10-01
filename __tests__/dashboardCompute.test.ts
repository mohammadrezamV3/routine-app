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
  jalaliOfIso,
  jalaliMonthDays,
  dayPct,
  buildMonth,
  buildYear,
  bestRun,
  jalaliYearRange,
  PHASE_GREETING,
  type HeatCell,
} from "@/lib/dashboardCompute";
import { isoLocal, jalaliToIso, toJalali } from "@/lib/jalali";

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

  it("خواب بعد از نیمه‌شب: ۰۰:۴۰ با بیداری ۰۹:۳۰ و خواب ۰۱:۳۰", () => {
    const p = awakeProgress(at(0, 40), "09:30", "01:30");
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0.9);
    expect(p!).toBeLessThan(1);
  });

  it("خواب بعد از نیمه‌شب: ظهر و شب وسط قوس‌اند", () => {
    const noon = awakeProgress(at(12), "09:30", "01:30")!;
    const night = awakeProgress(at(23), "09:30", "01:30")!;
    expect(noon).toBeGreaterThan(0);
    expect(noon).toBeLessThan(night);
    expect(night).toBeLessThan(1);
  });

  it("خواب بعد از نیمه‌شب: قبل از بیداری → ۰", () => {
    expect(awakeProgress(at(9, 0), "09:30", "01:30")).toBe(0);
  });

  // منبع: بین «خواب» (۰۱:۳۰) و «بیداری» (۰۹:۳۰)، cur<=w برقرار می‌شه و ۰ برمی‌گرده؛
  // ولی داک‌استرینگ می‌گه «بعد از خواب → ۱». (۰۲:۰۰ باید ۱ باشه، ۰۹:۰۰ باید ۰.)
  it("خواب بعد از نیمه‌شب: ۰۲:۰۰ (بعد از خواب) → ۱", () => {
    expect(awakeProgress(at(2, 0), "09:30", "01:30")).toBe(1);
  });

  it("ورودی نامعتبر → null", () => {
    expect(awakeProgress(at(12), "abc", "23:00")).toBeNull();
    expect(awakeProgress(at(12), "07:00", "")).toBeNull();
    expect(awakeProgress(at(12), "24:00", "23:00")).toBeNull();
    expect(awakeProgress(at(12), "07:60", "23:00")).toBeNull();
    expect(awakeProgress(at(12), "7-00", "23:00")).toBeNull();
  });

  it("ساعت تک‌رقمی و فاصله‌ی اطراف پذیرفته می‌شه", () => {
    expect(awakeProgress(at(15), " 7:00 ", "23:00")).toBeCloseTo(0.5, 10);
  });
});

describe("minutesUntilSleep", () => {
  it("حالت عادی", () => {
    expect(minutesUntilSleep(at(15), "07:00", "23:00")).toBe(480);
    expect(minutesUntilSleep(at(22, 30), "07:00", "23:00")).toBe(30);
  });

  it("قبل از بیداری کل بازه، بعد از خواب صفر", () => {
    expect(minutesUntilSleep(at(5), "07:00", "23:00")).toBe(16 * 60);
    expect(minutesUntilSleep(at(23, 30), "07:00", "23:00")).toBe(0);
  });

  it("خواب بعد از نیمه‌شب", () => {
    // ۰۰:۴۰ تا ۰۱:۳۰ = ۵۰ دقیقه
    expect(minutesUntilSleep(at(0, 40), "09:30", "01:30")).toBe(50);
  });

  it("ورودی نامعتبر → null", () => {
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

  it("پیش‌فرض تست درست تنظیم شده", () => {
    expect(today.getDay()).toBe(3);
    expect(isoLocal(today)).toBe(todayIso);
  });

  it("ساختار: weeks ستون، هر ستون ۷ خانه، شروع ستون شنبه", () => {
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

  it("آخرین ستون شامل امروز است و همان یک خانه today:true دارد", () => {
    const cols = buildHeatmap(today, WEEKS, opts, {});
    expect(cols[cols.length - 1].some((c) => c.today)).toBe(true);
    const todays = cols.flat().filter((c) => c.today);
    expect(todays).toHaveLength(1);
    expect(todays[0].iso).toBe(todayIso);
  });

  it("روزهای آینده future:true و pct:null دارن", () => {
    // ستون شنبه..جمعه؛ امروز چهارشنبه (ایندکس ۴) → پنج‌شنبه و جمعه آینده‌اند
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

  it("روز بدون برنامه pct:null دارد", () => {
    const cols = buildHeatmap(today, WEEKS, opts, {});
    for (const c of cols.flat().filter((c) => !c.future)) {
      const [y, m, d] = c.iso.split("-").map(Number);
      const day = new Date(y, m - 1, d).getDay();
      if (day !== 1) expect(c.pct).toBeNull();
      else expect(c.pct).toBe(0);
    }
  });

  it("روز کاملا تیک‌خورده ۱۰۰ می‌شه، بدون رکورد ۰", () => {
    // دوشنبه‌ی همین هفته: ۲۰۲۶-۰۹-۲۸
    const cols = buildHeatmap(today, WEEKS, opts, { "2026-09-28": { tasks: { a: true } } });
    const cell = cols.flat().find((c) => c.iso === "2026-09-28")!;
    expect(cell.pct).toBe(100);
    const other = cols.flat().find((c) => c.iso === "2026-09-21")!;
    expect(other.pct).toBe(0);
  });

  it("درصد جزئی گرد می‌شه", () => {
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

  it("روز غیر ۱۰۰ استریک را می‌شکند", () => {
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

  it("روی خروجی buildHeatmap", () => {
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
    // امروز ناقص → فقط دو روز قبل
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

  it("کمینه روی h-pad و پدینگ پیش‌فرض ۴", () => {
    const s = sparkPath([5, 1], 100, 40)!;
    expect(s.line.startsWith("M0 4 ")).toBe(true);
    expect(s.last.y).toBeCloseTo(36, 10);
  });

  it("zeroY فقط وقتی سری از صفر رد می‌شه عدد است", () => {
    expect(sparkPath([1, 2, 3], 100, 40)!.zeroY).toBeNull();
    expect(sparkPath([-3, -2, -1], 100, 40)!.zeroY).toBeNull();
    // لمس‌کردن صفر (min=0 یا max=0) عبور نیست
    expect(sparkPath([0, 2, 3], 100, 40)!.zeroY).toBeNull();
    expect(sparkPath([-3, -1, 0], 100, 40)!.zeroY).toBeNull();
    const z = sparkPath([-10, 10], 100, 40, 4)!.zeroY;
    expect(typeof z).toBe("number");
    expect(z).toBeCloseTo(20, 5);
  });

  it("سری ثابت خطا نمی‌ده (range=1)", () => {
    const s = sparkPath([7, 7, 7], 90, 30)!;
    expect(s.line).not.toContain("NaN");
    expect(s.last.x).toBeCloseTo(90, 10);
  });
});

describe("cumulative", () => {
  it("جمع تجمعی", () => {
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

  it("مقدار منفی → صفر", () => {
    expect(durationParts(-5000)).toEqual({ d: 0, h: 0, m: 0 });
  });
});

describe("compactNumber", () => {
  it("اعداد کوچک", () => {
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

// ── نقشه‌ی ثبات: سالانه/ماهانه (تقویم شمسی) ──────────────────────────
describe("نقشه‌ی ثبات شمسی", () => {
  // چهارشنبه ۳۰ سپتامبر ۲۰۲۶ — همه‌ی تاریخ‌ها محلی
  const TODAY = "2026-09-30";
  const jsDayOf = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  };
  // برای هر روز هفته دقیقا یک تسک (id = t{jsDay}) — همه‌ی روزها برنامه‌دارن
  const everyDayOpts = {
    removedOccurrences: new Set<string>(),
    customOccurrences: [0, 1, 2, 3, 4, 5, 6].map((jsDay) => ({ id: `t${jsDay}`, name: "x", jsDay, time: "10:00" })),
  };
  const tick = (iso: string) => ({ [iso]: { tasks: { [`t${jsDayOf(iso)}`]: true } } });

  describe("jalaliOfIso", () => {
    it("۲۰۲۶-۰۳-۲۱ اول فروردین ۱۴۰۵ است", () => {
      expect(jalaliOfIso("2026-03-21")).toEqual([1405, 1, 1]);
    });

    it("با toJalali هم‌نظر است و با jalaliToIso رفت‌وبرگشتی است", () => {
      for (const iso of ["2026-03-20", "2026-09-30", "2025-03-21", "2024-03-20", "2027-01-01"]) {
        const [y, m, d] = iso.split("-").map(Number);
        const j = jalaliOfIso(iso);
        expect(j).toEqual(toJalali(y, m, d));
        expect(jalaliToIso(...j)).toBe(iso);
      }
    });

    it("روز قبل از نوروز آخر اسفند سال قبل است", () => {
      const [jy, jm, jd] = jalaliOfIso("2026-03-20");
      expect(jy).toBe(1404);
      expect(jm).toBe(12);
      expect(jd).toBe(jalaliMonthDays(1404, 12));
    });
  });

  describe("jalaliMonthDays", () => {
    it("ماه‌های ۱ تا ۶ → ۳۱ و ۷ تا ۱۱ → ۳۰", () => {
      for (const jy of [1403, 1404, 1405]) {
        for (let jm = 1; jm <= 6; jm++) expect(jalaliMonthDays(jy, jm)).toBe(31);
        for (let jm = 7; jm <= 11; jm++) expect(jalaliMonthDays(jy, jm)).toBe(30);
      }
    });

    it("اسفند: سال کبیسه ۳۰ و غیرکبیسه ۲۹ (از روی تبدیل دقیق)", () => {
      const leap: number[] = [];
      const common: number[] = [];
      for (let y = 1400; y <= 1410; y++) (jalaliToIso(y, 12, 30) !== null ? leap : common).push(y);
      expect(leap.length).toBeGreaterThan(0);
      expect(common.length).toBeGreaterThan(0);
      for (const y of leap) expect(jalaliMonthDays(y, 12)).toBe(30);
      for (const y of common) expect(jalaliMonthDays(y, 12)).toBe(29);
    });

    it("طول ماه با فاصله‌ی روز اول تا اول ماه بعد می‌خونه", () => {
      for (let jm = 1; jm <= 11; jm++) {
        const a = jalaliToIso(1405, jm, 1)!;
        const b = jalaliToIso(1405, jm + 1, 1)!;
        const [ay, am, ad] = a.split("-").map(Number);
        const [by, bm, bd] = b.split("-").map(Number);
        const diff = Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000);
        expect(jalaliMonthDays(1405, jm)).toBe(diff);
      }
    });
  });

  describe("dayPct", () => {
    // دوشنبه ۲۸ سپتامبر ۲۰۲۶
    const iso = "2026-09-28";
    const jsDay = jsDayOf(iso);
    const two = {
      removedOccurrences: new Set<string>(),
      customOccurrences: [
        { id: "a", name: "a", jsDay, time: "08:00" },
        { id: "b", name: "b", jsDay, time: "09:00" },
      ],
    };

    it("jsDay درست محاسبه شده", () => {
      expect(jsDay).toBe(1);
    });

    it("روز بدون برنامه → null (حتی با رکورد)", () => {
      const other = { removedOccurrences: new Set<string>(), customOccurrences: [{ id: "a", name: "a", jsDay: (jsDay + 1) % 7, time: "10:00" }] };
      expect(dayPct(iso, other, {})).toBeNull();
      expect(dayPct(iso, other, { [iso]: { tasks: { a: true } } })).toBeNull();
      expect(dayPct(iso, { removedOccurrences: new Set<string>(), customOccurrences: [] }, {})).toBeNull();
    });

    it("۰ / ۵۰ / ۱۰۰ درصد با ۲ تسک", () => {
      expect(dayPct(iso, two, {})).toBe(0);
      expect(dayPct(iso, two, { [iso]: { tasks: {} } })).toBe(0);
      expect(dayPct(iso, two, { [iso]: { tasks: { a: true, b: false } } })).toBe(50);
      expect(dayPct(iso, two, { [iso]: { tasks: { a: true, b: true } } })).toBe(100);
    });

    it("تیک تسک غیر برنامه‌ای شمرده نمی‌شه", () => {
      expect(dayPct(iso, two, { [iso]: { tasks: { zzz: true } } })).toBe(0);
    });

    it("تسک حذف‌شده از مخرج کم می‌شه", () => {
      const removed = { ...two, removedOccurrences: new Set<string>([`b|${jsDay}`]) };
      expect(dayPct(iso, removed, { [iso]: { tasks: { a: true } } })).toBe(100);
    });
  });

  describe("buildMonth", () => {
    it("ماه جاری (مهر ۱۴۰۵): ساختار و طول", () => {
      const [jy, jm] = jalaliOfIso(TODAY);
      const m = buildMonth(jy, jm, TODAY, everyDayOpts, {});
      expect([m.jy, m.jm]).toEqual([1405, 7]);
      expect(m.cells).toHaveLength(jalaliMonthDays(jy, jm));
      expect(m.cells[0].jd).toBe(1);
      m.cells.forEach((c, i) => expect(c.jd).toBe(i + 1));
      expect(m.cells[0].iso).toBe(jalaliToIso(jy, jm, 1));
      expect(m.cells[m.cells.length - 1].iso).toBe(jalaliToIso(jy, jm, m.cells.length));
    });

    it("lead = (getDay روز اول + ۱) % ۷ و بین ۰ و ۶", () => {
      for (const [jy, jm] of [[1405, 1], [1405, 7], [1405, 12], [1404, 12], [1403, 12], [1406, 3]]) {
        const m = buildMonth(jy, jm, TODAY, everyDayOpts, {});
        const first = jalaliToIso(jy, jm, 1)!;
        expect(m.lead).toBe((jsDayOf(first) + 1) % 7);
        expect(m.lead).toBeGreaterThanOrEqual(0);
        expect(m.lead).toBeLessThanOrEqual(6);
      }
      // ۲۳ سپتامبر ۲۰۲۶ چهارشنبه است → شنبه=۰ ⇒ lead=۴
      expect(buildMonth(1405, 7, TODAY, everyDayOpts, {}).lead).toBe(4);
      // اول فروردین ۱۴۰۵ = ۲۱ مارس ۲۰۲۶، شنبه ⇒ lead=۰
      expect(buildMonth(1405, 1, TODAY, everyDayOpts, {}).lead).toBe(0);
    });

    it("روزهای بعد از امروز future:true و pct:null دارن (حتی با رکورد)", () => {
      const daily = { "2026-10-05": { tasks: { t1: true } } };
      const m = buildMonth(1405, 7, TODAY, everyDayOpts, daily);
      for (const c of m.cells) {
        expect(c.future).toBe(c.iso > TODAY);
        if (c.future) expect(c.pct).toBeNull();
        else expect(c.pct).not.toBeNull();
      }
      expect(m.cells.some((c) => c.future)).toBe(true);
      expect(m.cells.find((c) => c.iso === "2026-10-05")!.pct).toBeNull();
    });

    it("دقیقا یک خانه today:true وقتی امروز داخل ماهه", () => {
      const m = buildMonth(1405, 7, TODAY, everyDayOpts, {});
      const todays = m.cells.filter((c) => c.today);
      expect(todays).toHaveLength(1);
      expect(todays[0].iso).toBe(TODAY);
      expect(todays[0].future).toBe(false);
    });

    it("وقتی امروز بیرون ماهه، هیچ خانه‌ای today نیست", () => {
      expect(buildMonth(1405, 6, TODAY, everyDayOpts, {}).cells.some((c) => c.today)).toBe(false);
      expect(buildMonth(1405, 8, TODAY, everyDayOpts, {}).cells.some((c) => c.today)).toBe(false);
    });

    it("ماه کاملا آینده: همه future، avg=null، tracked=0", () => {
      const m = buildMonth(1405, 12, TODAY, everyDayOpts, {});
      expect(m.cells.every((c) => c.future && c.pct === null)).toBe(true);
      expect(m.avg).toBeNull();
      expect(m.tracked).toBe(0);
      expect(m.perfect).toBe(0);
    });

    it("avg/perfect/tracked با خانه‌ها هم‌خوانه (همه‌روز برنامه‌دار، بدون رکورد)", () => {
      const m = buildMonth(1405, 7, TODAY, everyDayOpts, {});
      const past = m.cells.filter((c) => !c.future);
      expect(m.tracked).toBe(past.length);
      expect(past.every((c) => c.pct === 0)).toBe(true);
      expect(m.avg).toBe(0);
      expect(m.perfect).toBe(0);
    });

    it("avg/perfect/tracked با رکوردهای ترکیبی", () => {
      const daily = { ...tick("2026-09-23"), ...tick("2026-09-24"), ...tick("2026-09-30") };
      const m = buildMonth(1405, 7, TODAY, everyDayOpts, daily);
      const tracked = m.cells.filter((c) => c.pct !== null);
      const sum = tracked.reduce((a, c) => a + (c.pct as number), 0);
      expect(m.tracked).toBe(tracked.length);
      expect(m.tracked).toBe(8); // ۲۳..۳۰ سپتامبر
      expect(m.perfect).toBe(tracked.filter((c) => c.pct === 100).length);
      expect(m.perfect).toBe(3);
      expect(m.avg).toBe(Math.round(sum / tracked.length));
      expect(m.avg).toBe(Math.round(300 / 8));
    });

    it("روز بی‌برنامه در tracked نمی‌آد", () => {
      // فقط دوشنبه‌ها برنامه دارن
      const monOnly = { removedOccurrences: new Set<string>(), customOccurrences: [{ id: "a", name: "x", jsDay: 1, time: "10:00" }] };
      const m = buildMonth(1405, 7, TODAY, monOnly, { "2026-09-28": { tasks: { a: true } } });
      // دوشنبه‌های ۲۳..۳۰ سپتامبر: فقط ۲۸ام
      expect(m.tracked).toBe(1);
      expect(m.perfect).toBe(1);
      expect(m.avg).toBe(100);
      expect(m.cells.filter((c) => !c.future && c.pct === null).length).toBe(7);
    });

    it("اسفند سال کبیسه ۳۰ خانه و غیرکبیسه ۲۹ خانه دارد", () => {
      expect(buildMonth(1403, 12, TODAY, everyDayOpts, {}).cells).toHaveLength(30);
      expect(buildMonth(1404, 12, TODAY, everyDayOpts, {}).cells).toHaveLength(29);
    });

    it("خانه‌ها پشت‌سرهم و بدون شکاف‌اند", () => {
      const m = buildMonth(1405, 1, TODAY, everyDayOpts, {});
      for (let i = 1; i < m.cells.length; i++) {
        const [y, mo, d] = m.cells[i - 1].iso.split("-").map(Number);
        expect(m.cells[i].iso).toBe(isoLocal(new Date(y, mo - 1, d + 1)));
      }
    });
  });

  describe("buildYear", () => {
    it("۱۲ ماه با jm از ۱ تا ۱۲", () => {
      const y = buildYear(1405, TODAY, everyDayOpts, {});
      expect(y).toHaveLength(12);
      expect(y.map((m) => m.jm)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it("ماه‌هایی که بعد از امروز شروع می‌شن future:true", () => {
      const y = buildYear(1405, TODAY, everyDayOpts, {});
      for (const m of y) {
        const first = jalaliToIso(1405, m.jm, 1)!;
        expect(m.future).toBe(first > TODAY);
        if (m.future) {
          expect(m.avg).toBeNull();
          expect(m.perfect).toBe(0);
          expect(m.current).toBe(false);
        }
      }
      expect(y.filter((m) => m.future).map((m) => m.jm)).toEqual([8, 9, 10, 11, 12]);
    });

    it("دقیقا یک current برای سال جاری (ماه مهر) و هیچ‌کدوم برای سال گذشته", () => {
      const cur = buildYear(1405, TODAY, everyDayOpts, {});
      expect(cur.filter((m) => m.current)).toHaveLength(1);
      expect(cur.find((m) => m.current)!.jm).toBe(7);
      const past = buildYear(1404, TODAY, everyDayOpts, {});
      expect(past.some((m) => m.current)).toBe(false);
      expect(past.some((m) => m.future)).toBe(false);
    });

    it("سال آینده: همه future و هیچ current", () => {
      const fut = buildYear(1406, TODAY, everyDayOpts, {});
      expect(fut.every((m) => m.future && !m.current && m.avg === null)).toBe(true);
    });

    it("avg/perfect هر ماه با buildMonth یکیه", () => {
      const daily = { ...tick("2026-03-21"), ...tick("2026-03-22"), ...tick("2026-09-25") };
      const y = buildYear(1405, TODAY, everyDayOpts, daily);
      for (const m of y.filter((m) => !m.future)) {
        const bm = buildMonth(1405, m.jm, TODAY, everyDayOpts, daily);
        expect(m.avg).toBe(bm.avg);
        expect(m.perfect).toBe(bm.perfect);
      }
      expect(y[0].perfect).toBe(2);
      expect(y[6].perfect).toBe(1);
    });
  });

  describe("bestRun", () => {
    const d = (pct: number | null, extra: { future?: boolean; today?: boolean } = {}) => ({ pct, ...extra });

    it("لیست خالی → ۰", () => {
      expect(bestRun([])).toBe(0);
    });

    it("بیشینه‌ی زنجیره را برمی‌گردونه", () => {
      expect(bestRun([d(100), d(100), d(50), d(100), d(100), d(100), d(0), d(100)])).toBe(3);
    });

    it("روز pct:null رد می‌شه و زنجیره را نمی‌شکنه", () => {
      expect(bestRun([d(100), d(null), d(100), d(null), d(100)])).toBe(3);
    });

    it("خانه‌ی آینده نادیده گرفته می‌شه (حتی با pct:100)", () => {
      expect(bestRun([d(100), d(100, { future: true }), d(100)])).toBe(2);
      expect(bestRun([d(100, { future: true }), d(100, { future: true })])).toBe(0);
    });

    it("روز غیر ۱۰۰ که today نیست زنجیره را صفر می‌کنه", () => {
      expect(bestRun([d(100), d(100), d(99), d(100)])).toBe(2);
      expect(bestRun([d(100), d(0), d(100), d(100), d(100)])).toBe(3);
    });

    it("روز today غیر ۱۰۰ زنجیره را نمی‌شکنه", () => {
      expect(bestRun([d(100), d(100), d(50, { today: true }), d(100)])).toBe(3);
      expect(bestRun([d(100), d(100), d(50, { today: true })])).toBe(2);
    });

    it("امروز ۱۰۰ شمرده می‌شه", () => {
      expect(bestRun([d(100), d(100, { today: true })])).toBe(2);
    });

    it("روی خروجی buildMonth", () => {
      const daily = { ...tick("2026-09-23"), ...tick("2026-09-24"), ...tick("2026-09-25"), ...tick("2026-09-27") };
      const m = buildMonth(1405, 7, TODAY, everyDayOpts, daily);
      // ۲۳..۲۵ کامل (۳)، ۲۶ صفر، ۲۷ کامل، ۲۸/۲۹ صفر، ۳۰ (امروز، ناقص) → بهترین = ۳
      expect(bestRun(m.cells)).toBe(3);
    });
  });

  describe("jalaliYearRange", () => {
    it("سال جاری: from = نوروز و to = امروز", () => {
      const r = jalaliYearRange(1405, TODAY)!;
      expect(r.from).toBe(jalaliToIso(1405, 1, 1));
      expect(r.from).toBe("2026-03-21");
      expect(r.to).toBe(TODAY);
    });

    it("سال گذشته: to = آخرین روز اسفند (غیرکبیسه ۲۹، کبیسه ۳۰)", () => {
      const r1404 = jalaliYearRange(1404, TODAY)!;
      expect(r1404.from).toBe(jalaliToIso(1404, 1, 1));
      expect(r1404.to).toBe(jalaliToIso(1404, 12, 29));
      // روز بعد آخر اسفند = نوروز سال بعد
      const [y, m, day] = r1404.to.split("-").map(Number);
      expect(isoLocal(new Date(y, m - 1, day + 1))).toBe(jalaliToIso(1405, 1, 1));

      const r1403 = jalaliYearRange(1403, TODAY)!;
      expect(r1403.to).toBe(jalaliToIso(1403, 12, 30));
      const [y3, m3, d3] = r1403.to.split("-").map(Number);
      expect(isoLocal(new Date(y3, m3 - 1, d3 + 1))).toBe(jalaliToIso(1404, 1, 1));
    });

    it("سال آینده → null", () => {
      expect(jalaliYearRange(1406, TODAY)).toBeNull();
      expect(jalaliYearRange(1405, "2026-03-20")).toBeNull();
    });

    it("امروز = نوروز: بازه‌ی یک‌روزه", () => {
      expect(jalaliYearRange(1405, "2026-03-21")).toEqual({ from: "2026-03-21", to: "2026-03-21" });
    });

    it("آخرین روز اسفند = امروز: to همان روز", () => {
      const last = jalaliToIso(1404, 12, 29)!;
      expect(jalaliYearRange(1404, last)!.to).toBe(last);
    });
  });
});
