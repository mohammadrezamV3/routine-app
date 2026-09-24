import { describe, it, expect } from "vitest";
import {
  applyOps, parseDay, parseDateInput, mentionsTime, stripInventedTimes, describeSchedule, findConflict,
} from "@/lib/routineAssistant";
import { jalaliToIso } from "@/lib/jalali";
import { sameWeekIso, jsDayOfIso } from "@/lib/schedule";

// ۲۰۲۶-۰۹-۰۵ شنبه است (۱۴ شهریور ۱۴۰۵)
const TODAY = "2026-09-05";

function occ(id: string, name: string, jsDay: number, time: string, extra: Record<string, string> = {}) {
  return { id, name, jsDay, time, startDate: "2026-01-01", ...extra };
}
const live = (r: { occurrences: any[] }) => r.occurrences.filter((o) => !o.endDate || o.endDate >= TODAY);

describe("روز و تاریخ", () => {
  it("نامِ فارسیِ روز را با هر نیم‌فاصله/کاراکترِ عربی می‌فهمد", () => {
    expect(parseDay("شنبه")).toBe(6);
    expect(parseDay("سه‌شنبه")).toBe(2);
    expect(parseDay("سه شنبه")).toBe(2);
    expect(parseDay("پنج‌شنبه")).toBe(4);
    expect(parseDay("يكشنبه")).toBe(0);
    expect(parseDay(5)).toBe(5);
    expect(parseDay("۳")).toBe(3);
    expect(parseDay("هشتنبه")).toBeNull();
    expect(parseDay(7)).toBeNull();
  });

  it("تاریخِ میلادی، جلالی و امروز/فردا را تبدیل می‌کند", () => {
    expect(parseDateInput("2026-09-10", TODAY)).toBe("2026-09-10");
    expect(parseDateInput("1405/07/01", TODAY)).toBe("2026-09-23");
    expect(parseDateInput("۱۴۰۵-۰۶-۱۴", TODAY)).toBe(TODAY);
    expect(parseDateInput("امروز", TODAY)).toBe(TODAY);
    expect(parseDateInput("فردا", TODAY)).toBe("2026-09-06");
    expect(parseDateInput("2026-02-30", TODAY)).toBeNull();
    expect(parseDateInput("1405/07/31", TODAY)).toBeNull(); // مهر ۳۰ روزه است
    expect(parseDateInput("یه روزی", TODAY)).toBeNull();
  });

  it("jalaliToIso با toJalali رفت‌وبرگشتِ دقیق دارد، حتی دورِ نوروز", () => {
    expect(jalaliToIso(1405, 1, 1)).toBe("2026-03-21");
    expect(jalaliToIso(1404, 12, 29)).toBe("2026-03-20");
    expect(jalaliToIso(1403, 12, 30)).toBe("2025-03-20"); // ۱۴۰۳ کبیسه است
    expect(jalaliToIso(1404, 12, 30)).toBeNull();
  });

  it("sameWeekIso داخلِ هفته‌ی شنبه‌شروع می‌ماند", () => {
    expect(sameWeekIso("2026-09-05", 0)).toBe("2026-09-06"); // شنبه → یکشنبه‌ی بعدش
    expect(sameWeekIso("2026-09-10", 6)).toBe("2026-09-05"); // پنجشنبه → شنبه‌ی همان هفته
    expect(sameWeekIso("2026-09-10", 5)).toBe("2026-09-11"); // → جمعه
  });
});

describe("add — تک‌روزه و دوره", () => {
  it("date یعنی فقط همان روز، با روزِ هفته‌ی درست از خودِ تاریخ", () => {
    const r = applyOps([], [], [{ op: "add", name: "خرید", date: "2026-09-10", days: ["شنبه"] }], TODAY);
    expect(r.problems).toHaveLength(0);
    const o = r.occurrences[0];
    expect(o.jsDay).toBe(4); // پنجشنبه، نه شنبه‌ای که مدل اشتباهی کنارش گذاشته
    expect(o.startDate).toBe("2026-09-10");
    expect(o.endDate).toBe("2026-09-10");
    expect(r.applied[0]).toContain("فقط");
  });

  it("dates چند روزِ مشخص می‌سازد", () => {
    const r = applyOps([], [], [{ op: "add", name: "آزمون", dates: ["فردا", "1405/06/20"] }], TODAY);
    expect(r.occurrences.map((o) => o.startDate)).toEqual(["2026-09-06", "2026-09-11"]);
  });

  it("days با نامِ فارسی و دوره‌ی months", () => {
    const r = applyOps([], [], [{ op: "add", name: "ریاضی", days: ["یکشنبه", "سه‌شنبه"], months: 3 }], TODAY);
    expect(r.occurrences.map((o) => o.jsDay)).toEqual([0, 2]);
    expect(r.occurrences[0].startDate).toBe(TODAY);
    expect(r.occurrences[0].endDate).toBe("2026-12-04");
  });

  it("from/until و weeks", () => {
    const a = applyOps([], [], [{ op: "add", name: "کلاس", days: ["دوشنبه"], from: "2026-09-14", until: "1405/08/30" }], TODAY);
    expect(a.occurrences[0].startDate).toBe("2026-09-14");
    expect(a.occurrences[0].endDate).toBe("2026-11-21");
    const b = applyOps([], [], [{ op: "add", name: "کلاس", days: ["دوشنبه"], weeks: 2 }], TODAY);
    expect(b.occurrences[0].endDate).toBe("2026-09-18");
  });

  it("پایانِ قبل از شروع رد می‌شود", () => {
    const r = applyOps([], [], [{ op: "add", name: "غلط", days: [1], from: "2026-10-01", until: "2026-09-01" }], TODAY);
    expect(r.changed).toBe(false);
    expect(r.problems[0]).toContain("قبل از شروعش");
  });

  it("تداخل فقط وقتی است که دوره‌ها هم‌پوشانی داشته باشند", () => {
    const ended = [occ("x", "کلاسِ تمام‌شده", 1, "۱۰:۰۰ – ۱۱:۰۰", { endDate: "2026-08-01" })];
    const r = applyOps(ended, [], [{ op: "add", name: "جدید", days: [1], start: "10:00", end: "11:00" }], TODAY);
    expect(r.problems).toHaveLength(0);
    const oneOff = [occ("y", "یک‌بار", 1, "۱۰:۰۰ – ۱۱:۰۰", { startDate: "2026-09-21", endDate: "2026-09-21" })];
    expect(findConflict(oneOff, 1, 600, 660, undefined, { from: "2026-09-07", to: "2026-09-07" })).toBeNull();
    expect(findConflict(oneOff, 1, 600, 660, undefined, { from: TODAY })?.name).toBe("یک‌بار");
  });
});

describe("فقط یک روز از یک برنامه‌ی تکراری", () => {
  const BASE = [occ("a", "ورزش", 6, "۱۸:۰۰ – ۱۹:۰۰"), occ("b", "کلاس", 1, "۰۸:۰۰ – ۰۹:۰۰")];

  it("delete با date فقط همان روز را برمی‌دارد و بقیه‌ی هفته‌ها می‌مانند", () => {
    const r = applyOps(BASE, [], [{ op: "delete", ref: 2, date: "2026-09-07" }], TODAY);
    expect(r.problems).toHaveLength(0);
    const pieces = r.occurrences.filter((o) => o.name === "کلاس");
    expect(pieces).toHaveLength(2);
    expect(pieces.find((o) => o.id === "b")!.endDate).toBe("2026-09-06");
    expect(pieces.find((o) => o.id !== "b")!.startDate).toBe("2026-09-08");
  });

  it("move با date → فقط همان روز به روزِ دیگرِ همان هفته", () => {
    const r = applyOps(BASE, [], [{ op: "move", ref: 1, date: TODAY, toDay: "یکشنبه" }], TODAY);
    expect(r.problems).toHaveLength(0);
    const moved = r.occurrences.find((o) => o.jsDay === 0)!;
    expect(moved.startDate).toBe("2026-09-06");
    expect(moved.endDate).toBe("2026-09-06");
    expect(moved.time).toBe("۱۸:۰۰ – ۱۹:۰۰");
    // شنبه‌های بعدی هنوز ورزش دارند
    expect(r.occurrences.some((o) => o.jsDay === 6 && o.startDate === "2026-09-06")).toBe(true);
  });

  it("retime با date فقط ساعتِ همان روز را عوض می‌کند", () => {
    const r = applyOps(BASE, [], [{ op: "retime", ref: 1, date: "2026-09-12", start: "20:00", end: "21:00" }], TODAY);
    expect(r.problems).toHaveLength(0);
    const single = r.occurrences.find((o) => o.startDate === "2026-09-12" && o.endDate === "2026-09-12")!;
    expect(single.time).toBe("۲۰:۰۰ – ۲۱:۰۰");
    expect(r.occurrences.find((o) => o.id === "a")!.endDate).toBe("2026-09-11");
  });

  it("date‌ای که برنامه در آن نیست، پیامِ روشن می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "delete", ref: 1, date: "2026-09-07" }], TODAY);
    expect(r.changed).toBe(false);
    expect(r.problems[0]).toContain("برنامه‌ای ندارد");
  });

  it("برنامه‌ی تک‌روزه با move روی همان هفته جابه‌جا می‌شود", () => {
    const list = [occ("o", "خرید", 4, "", { startDate: "2026-09-10", endDate: "2026-09-10" })];
    const r = applyOps(list, [], [{ op: "move", ref: 1, toDay: "جمعه" }], TODAY);
    expect(r.occurrences).toHaveLength(1);
    expect(r.occurrences[0].startDate).toBe("2026-09-11");
    expect(r.occurrences[0].jsDay).toBe(5);
  });
});

describe("update و زنجیره‌ی عملیات", () => {
  const BASE = [occ("a", "ورزش", 6, "۱۸:۰۰ – ۱۹:۰۰", { tag: "سلامت" })];

  it("اسم، اهمیت، تگ، اعلان و دوره را عوض می‌کند", () => {
    const r = applyOps(BASE, [], [{
      op: "update", ref: 1, name: "باشگاه", importance: "high", tag: null, notify: false, until: "2026-12-01",
    }], TODAY);
    expect(r.problems).toHaveLength(0);
    const o = r.occurrences[0];
    expect(o.name).toBe("باشگاه");
    expect(o.importance).toBe("high");
    expect(o.tag).toBeUndefined();
    expect(o.notify).toBe(false);
    expect(o.endDate).toBe("2026-12-01");
  });

  it("update بدونِ تغییر پیام می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "update", ref: 1 }], TODAY);
    expect(r.problems[0]).toContain("تغییری نگفتی");
  });

  it("retime و بعد update روی همان ref به ردیفِ تازه می‌رسد", () => {
    const r = applyOps(BASE, [], [
      { op: "retime", ref: 1, start: "07:00", end: "08:00" },
      { op: "update", ref: 1, name: "دویدن" },
    ], TODAY);
    expect(r.problems).toHaveLength(0);
    const cur = live(r);
    expect(cur).toHaveLength(1);
    expect(cur[0].name).toBe("دویدن");
    expect(cur[0].time).toBe("۰۷:۰۰ – ۰۸:۰۰");
  });

  it("delete با from از همان تاریخ به بعد می‌بندد", () => {
    const r = applyOps(BASE, [], [{ op: "delete", ref: 1, from: "2026-09-19" }], TODAY);
    expect(r.occurrences[0].endDate).toBe("2026-09-18");
  });
});

describe("ساعتِ ساختگی", () => {
  it("نشانه‌های زمان را می‌شناسد", () => {
    expect(mentionsTime("ساعت ۸ ورزش")).toBe(true);
    expect(mentionsTime("عصرها باشگاه")).toBe(true);
    expect(mentionsTime("۸:۳۰ کلاس")).toBe(true);
    expect(mentionsTime("از ۸ تا ۱۰ درس")).toBe(true);
    expect(mentionsTime("هر روز ورزش")).toBe(false);
    expect(mentionsTime("یه دوره‌ی ۳ ماهه ریاضی هفته‌ای ۲ جلسه")).toBe(false);
    expect(mentionsTime("۳ تا ۵ روز در هفته")).toBe(false);
  });

  it("وقتی کاربر ساعتی نگفته، start/end مدل از add و move پاک می‌شود", () => {
    const ops = [
      { op: "add", name: "ورزش", days: [6], start: "08:00", end: "09:00" },
      { op: "move", ref: 1, toDay: 2, start: "10:00" },
      { op: "retime", ref: 2, start: "11:00" },
    ];
    const { ops: out, stripped } = stripInventedTimes(ops, ["هر روز ورزش بذار"]);
    expect(stripped).toBe(2);
    expect(out[0].start).toBeUndefined();
    expect(out[1].start).toBeUndefined();
    expect(out[2].start).toBe("11:00");
    expect(stripInventedTimes(ops, ["ورزش ساعت ۸"]).stripped).toBe(0);
  });
});

describe("describeSchedule", () => {
  it("تمام‌شده و مخفی را نشان نمی‌دهد ولی شماره‌ها ثابت می‌مانند؛ تک‌روزه را برچسب می‌زند", () => {
    const list = [
      occ("a", "قدیمی", 6, "", { endDate: "2026-08-01" }),
      occ("b", "مخفی", 1, ""),
      occ("c", "خرید", 4, "۱۰:۰۰", { startDate: "2026-09-10", endDate: "2026-09-10" }),
    ];
    const text = describeSchedule(list, { todayIso: TODAY, removed: new Set(["b|1"]) });
    expect(text).not.toContain("قدیمی");
    expect(text).not.toContain("مخفی");
    expect(text).toContain("#3");
    expect(text).toContain("فقط 2026-09-10");
    expect(text).toContain("10:00");
    expect(jsDayOfIso("2026-09-10")).toBe(4);
  });
});
