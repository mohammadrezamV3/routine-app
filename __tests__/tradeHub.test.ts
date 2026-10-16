import { describe, it, expect } from "vitest";
import {
  accountGrowthPct, agoLabel, dayDiff, eventWhenLabel, formatCountdown, formatHubMoney, formatPct,
  liveSessionPill, noteExcerpt, pickChartSymbols, relativeDayLabel, sessionTimeline,
} from "@/lib/tradeHubCompute";

// منطق خالص هاب ترید (lib/tradeHubCompute.ts): پول، متن یادداشت، چیپ نماد،
// شمارش معکوس، برچسب‌های زمان و نوار جلسه‌های فارکس.

describe("formatHubMoney", () => {
  it("نماد جلوی عدد، علامت صریح و ارقام لاتین", () => {
    expect(formatHubMoney(184.2, "USD", true)).toBe("+$184.20");
    expect(formatHubMoney(-12, "USD", true)).toBe("−$12.00");
    expect(formatHubMoney(0, "USD", true)).toBe("$0.00");
    expect(formatHubMoney(1300.5, "USD")).toBe("$1,300.50");
    expect(formatHubMoney(-5, "EUR")).toBe("−€5.00");
  });
  it("ارز بدون نماد تک‌حرفی بعد از عدد می‌آید", () => {
    expect(formatHubMoney(2500, "IRT")).toMatch(/^2,500\.00 \S+$/);
  });
  it("مقدار نامعتبر صفر می‌شود", () => {
    expect(formatHubMoney(NaN, "USD")).toBe("$0.00");
  });
});

describe("accountGrowthPct / formatPct", () => {
  it("رشد نسبت به سرمایه‌ی شروع", () => {
    expect(accountGrowthPct(10842, 842)).toBe(8.4);
    expect(accountGrowthPct(900, -100)).toBe(-10);
  });
  it("پایه‌ی نامعلوم یا صفر → null", () => {
    expect(accountGrowthPct(100, 100)).toBeNull();
    expect(accountGrowthPct(50, 80)).toBeNull();
  });
  it("درصد با علامت", () => {
    expect(formatPct(8.4, true)).toBe("+8.4%");
    expect(formatPct(-3, true)).toBe("−3%");
    expect(formatPct(62)).toBe("62%");
  });
});

describe("noteExcerpt", () => {
  it("نشانه‌گذاری مارک‌داون و تگ را برمی‌دارد و فاصله‌ها را فشرده می‌کند", () => {
    expect(noteExcerpt("# عنوان\n\n**طلا** قبل از  خبر\n- رنج می‌زنه <b>x</b>")).toBe("عنوان طلا قبل از خبر رنج می‌زنه x");
  });
  it("لینک مارک‌داون فقط متنش می‌ماند", () => {
    expect(noteExcerpt("ببین [این تحلیل](https://x.y/z) رو")).toBe("ببین این تحلیل رو");
  });
  it("متن بلند با … بریده می‌شود و از سقف رد نمی‌شود", () => {
    const long = "کلمه ".repeat(100);
    const out = noteExcerpt(long, "", 40);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(41);
  });
  it("متن خالی → عنوان جایگزین", () => {
    expect(noteExcerpt("  \n ", "عنوان یادداشت")).toBe("عنوان یادداشت");
    expect(noteExcerpt("")).toBe("");
  });
});

describe("pickChartSymbols", () => {
  it("ترتیب: آخرین نماد، اخیر، پیش‌فرض؛ یکتا و حداکثر n", () => {
    expect(pickChartSymbols("gbpjpy", ["EURUSD", "GBPJPY", "us30"], ["XAUUSD", "EURUSD", "BTCUSD"], 4)).toEqual(["GBPJPY", "EURUSD", "US30", "XAUUSD"]);
  });
  it("ورودی خالی → فقط پیش‌فرض‌ها و نویسه‌های غیرمجاز پاک می‌شود", () => {
    expect(pickChartSymbols(null, [], ["XAU/USD", "EURUSD"], 4)).toEqual(["XAUUSD", "EURUSD"]);
  });
});

describe("formatCountdown", () => {
  it("ساعت:دقیقه:ثانیه و حالت فشرده", () => {
    const ms = (1 * 3600 + 42 * 60 + 10) * 1000;
    expect(formatCountdown(ms)).toBe("01:42:10");
    expect(formatCountdown(ms, true)).toBe("01:42");
  });
  it("منفی صفر می‌شود", () => {
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
  it("بیشتر از یک روز با روز نمایش داده می‌شود", () => {
    expect(formatCountdown((2 * 86400 + 4 * 3600 + 10 * 60) * 1000)).toMatch(/2.*04:10/);
  });
});

describe("برچسب‌های زمان", () => {
  const now = new Date(2026, 6, 15, 12, 0, 0); // محلی
  const at = (dayOffset: number, h: number, m: number) => new Date(2026, 6, 15 + dayOffset, h, m).toISOString();

  it("dayDiff روز تقویمی محلی", () => {
    expect(dayDiff(at(0, 23, 59), now)).toBe(0);
    expect(dayDiff(at(1, 0, 1), now)).toBe(1);
    expect(dayDiff(at(-1, 23, 0), now)).toBe(-1);
  });
  it("eventWhenLabel: امروز فقط ساعت، فردا با پیشوند", () => {
    expect(eventWhenLabel(at(0, 16, 0), now)).toBe("16:00");
    expect(eventWhenLabel(at(1, 15, 30), now)).toMatch(/15:30$/);
    expect(eventWhenLabel(at(1, 15, 30), now).length).toBeGreaterThan(5);
    expect(eventWhenLabel(at(3, 9, 5), now)).toMatch(/09:05$/);
    expect(eventWhenLabel("نامعتبر", now)).toBe("");
  });
  it("relativeDayLabel", () => {
    expect(relativeDayLabel(null, now)).toBeNull();
    expect(relativeDayLabel(at(0, 8, 0), now)).toBe("امروز");
    expect(relativeDayLabel(at(-1, 8, 0), now)).toBe("دیروز");
    expect(relativeDayLabel(at(-4, 8, 0), now)).toMatch(/4/);
  });
  it("agoLabel پله‌های دقیقه/ساعت/روز", () => {
    const t = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
    expect(agoLabel(null, now)).toBeNull();
    expect(agoLabel(t(10_000), now)).toBe("همین الان");
    expect(agoLabel(t(3 * 60_000), now)).toMatch(/^3 /);
    expect(agoLabel(t(2 * 3_600_000), now)).toMatch(/^2 /);
    expect(agoLabel(t(5 * 86_400_000), now)).toMatch(/^5 /);
  });
});

describe("جلسه‌های فارکس", () => {
  // چهارشنبه 15 جولای 2026، 12:00 UTC: لندن (07:00-15:30 UTC) و نیویورک (12:00-21:00 UTC) باز
  const live = new Date("2026-07-15T12:00:00Z");

  it("برچسب زنده: دو جلسه‌ی باز", () => {
    const p = liveSessionPill(live);
    expect(p.tone).toBe("open");
    expect(p.keys).toEqual(["LONDON", "NEWYORK"]);
  });
  it("آخر هفته: بازار بسته", () => {
    const p = liveSessionPill(new Date("2026-07-18T12:00:00Z"));
    expect(p.tone).toBe("closed");
    expect(p.keys).toEqual([]);
  });
  it("نوار جلسه‌ها: چهار ردیف و مجموع طول هر جلسه برابر مدتش روی محور 24 ساعته", () => {
    const tl = sessionTimeline(live);
    expect(tl.rows.map((r) => r.key)).toEqual(["SYDNEY", "TOKYO", "LONDON", "NEWYORK"]);
    const width = (k: string) => tl.rows.find((r) => r.key === k)!.segments.reduce((s, x) => s + x.width, 0);
    expect(width("LONDON")).toBeCloseTo((510 / 1440) * 100, 3); // 08:00-16:30 محلی لندن
    expect(width("NEWYORK")).toBeCloseTo((540 / 1440) * 100, 3);
    expect(width("TOKYO")).toBeCloseTo((540 / 1440) * 100, 3);
    expect(tl.rows.find((r) => r.key === "LONDON")!.open).toBe(true);
    expect(tl.rows.find((r) => r.key === "TOKYO")!.open).toBe(false);
  });
  it("هر قطعه داخل محور 0..100 می‌ماند و نشانگر الان هم", () => {
    const tl = sessionTimeline(live);
    for (const r of tl.rows) for (const s of r.segments) {
      expect(s.start).toBeGreaterThanOrEqual(0);
      expect(s.start + s.width).toBeLessThanOrEqual(100.0001);
    }
    expect(tl.nowPct).toBeGreaterThanOrEqual(0);
    expect(tl.nowPct).toBeLessThan(100);
  });
});
