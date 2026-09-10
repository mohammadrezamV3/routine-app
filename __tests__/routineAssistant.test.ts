import { describe, it, expect } from "vitest";
import {
  applyOps, parseClock, findConflict, suggestFreeSlot, describeSchedule, findFreeSlot,
  MAX_OPS_PER_MESSAGE, MAX_OCCURRENCES, DEFAULT_AWAKE, MAX_REPEATS_PER_OP,
} from "@/lib/routineAssistant";

const TODAY = "2026-09-05";

// شنبه=6، یکشنبه=0 … مثل Date.getDay
function occ(id: string, name: string, jsDay: number, time: string) {
  return { id, name, jsDay, time, startDate: "2026-01-01" };
}

const BASE = [
  occ("a", "کلاس زبان", 6, "۰۸:۰۰ – ۰۹:۳۰"),
  occ("b", "باشگاه", 6, "۱۸:۰۰ – ۱۹:۳۰"),
  occ("c", "مطالعه", 1, "۲۰:۰۰ – ۲۱:۰۰"),
];

describe("parseClock", () => {
  it("ارقامِ فارسی و لاتین هر دو را می‌پذیرد", () => {
    expect(parseClock("۸:۳۰")?.min).toBe(8 * 60 + 30);
    expect(parseClock("08:30")?.min).toBe(8 * 60 + 30);
  });
  it("ساعتِ بدونِ دقیقه را ۰۰ می‌گیرد", () => {
    expect(parseClock("9")?.min).toBe(9 * 60);
  });
  it("ساعتِ خارج از بازه یا بدشکل را رد می‌کند", () => {
    expect(parseClock("25:00")).toBeNull();
    expect(parseClock("10:75")).toBeNull();
    expect(parseClock("فردا")).toBeNull();
    expect(parseClock(undefined)).toBeNull();
    expect(parseClock(830)).toBeNull();
  });
});

describe("findConflict / suggestFreeSlot", () => {
  it("تداخلِ واقعی را پیدا می‌کند و روزِ دیگر را نه", () => {
    expect(findConflict(BASE, 6, 9 * 60, 10 * 60)?.name).toBe("کلاس زبان");
    expect(findConflict(BASE, 1, 9 * 60, 10 * 60)).toBeNull();
  });
  it("خودِ برنامه را در حالتِ ویرایش نادیده می‌گیرد", () => {
    expect(findConflict(BASE, 6, 8 * 60, 9 * 60, "a")).toBeNull();
  });
  it("نزدیک‌ترین بازه‌ی آزادِ هم‌طول را پیشنهاد می‌دهد", () => {
    const slot = suggestFreeSlot(BASE, 6, 8 * 60, 9 * 60); // یک ساعته، روی کلاس زبان
    expect(slot).not.toBeNull();
    expect(slot!.startFa).toBe("۰۹:۳۰");
    expect(slot!.endFa).toBe("۱۰:۳۰");
  });
  it("اگر تا آخرِ روز جا نباشد null می‌دهد", () => {
    const full = [occ("x", "پر", 3, "۰۰:۰۰ – ۲۳:۵۹")];
    expect(suggestFreeSlot(full, 3, 10 * 60, 11 * 60)).toBeNull();
  });
});

describe("applyOps — افزودن", () => {
  it("برنامه‌ی جدید را روی چند روز می‌نشاند", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "دویدن", days: [0, 2], start: "۰۶:۰۰", end: "۰۷:۰۰" }], TODAY);
    expect(r.applied).toHaveLength(2);
    expect(r.problems).toHaveLength(0);
    expect(r.occurrences.filter((o) => o.name === "دویدن")).toHaveLength(2);
    expect(r.occurrences.find((o) => o.name === "دویدن")!.time).toBe("۰۶:۰۰ – ۰۷:۰۰");
    expect(r.occurrences.find((o) => o.name === "دویدن")!.startDate).toBe(TODAY);
  });

  it("«پر بودنِ» ساعت را با پیشنهادِ وقتِ آزاد جواب می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "جلسه", days: [6], start: "۰۸:۳۰", end: "۰۹:۰۰" }], TODAY);
    expect(r.applied).toHaveLength(0);
    expect(r.changed).toBe(false);
    expect(r.problems[0]).toContain("کلاس زبان");
    expect(r.problems[0]).toContain("پر است");
    expect(r.problems[0]).toContain("۰۹:۳۰");
  });

  it("روزِ نامشخص، اسمِ خالی و ساعتِ بدشکل هرکدام پیامِ خودشان را دارند", () => {
    const r = applyOps(BASE, [], [
      { op: "add", name: "بی‌روز", days: [], start: "۱۰:۰۰" },
      { op: "add", name: "", days: [1], start: "۱۰:۰۰" },
      { op: "add", name: "بدساعت", days: [1], start: "بعدازظهر" },
    ], TODAY);
    expect(r.problems).toHaveLength(3);
    expect(r.problems[0]).toContain("روزی مشخص نکردی");
    expect(r.problems[1]).toContain("اسمی نگفتی");
    expect(r.problems[2]).toContain("ساعتِ شروع");
  });

  it("پایانِ قبل از شروع را رد می‌کند", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "برعکس", days: [1], start: "۱۰:۰۰", end: "۰۹:۰۰" }], TODAY);
    expect(r.applied).toHaveLength(0);
    expect(r.problems[0]).toContain("بعد از ساعتِ شروع");
  });

  it("روزِ نامعتبر (۹) را نادیده می‌گیرد و روزی باقی نمی‌ماند", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "خارج", days: [9, -1], start: "۱۰:۰۰" }], TODAY);
    expect(r.problems[0]).toContain("روزی مشخص نکردی");
  });

  it("به سقفِ تعدادِ برنامه احترام می‌گذارد", () => {
    const many = Array.from({ length: MAX_OCCURRENCES }, (_, i) => occ(`m${i}`, `م${i}`, 4, "۰۰:۰۰"));
    const r = applyOps(many, [], [{ op: "add", name: "اضافه", days: [2], start: "۱۰:۰۰" }], TODAY);
    expect(r.problems[0]).toContain("سقف");
  });
});

describe("applyOps — تکرارِ درون‌روزی (repeatEveryMin)", () => {
  it("با فاصله‌ی مشخص چند بار در یک روز اضافه می‌کند، تا آخرِ بیداری", () => {
    const r = applyOps(BASE, [], [
      { op: "add", name: "ترید", days: [4], start: "۰۸:۰۰", end: "۰۸:۰۵", repeatEveryMin: 60 },
    ], TODAY);
    const created = r.occurrences.filter((o) => o.name === "ترید");
    expect(created).toHaveLength(15); // ۰۸:۰۰ تا ۲۲:۰۰ هر ساعت (پیش‌فرضِ DEFAULT_AWAKE)
    expect(created[0].time).toBe("۰۸:۰۰ – ۰۸:۰۵");
    expect(created[created.length - 1].time).toBe("۲۲:۰۰ – ۲۲:۰۵");
    expect(r.applied[0]).toContain("۱۵ بار اضافه شد");
    expect(r.problems).toHaveLength(0);
  });

  it("بدونِ ساعتِ شروع از اولِ بیداری شروع می‌کند و طولِ پیش‌فرض ۵ دقیقه می‌گیرد", () => {
    const r = applyOps(BASE, [], [
      { op: "add", name: "استراحتِ چشم", days: [4], repeatEveryMin: 120 },
    ], TODAY);
    const created = r.occurrences.filter((o) => o.name === "استراحتِ چشم");
    expect(created[0].time).toBe("۰۸:۰۰ – ۰۸:۰۵");
  });

  it("repeatUntil را به‌عنوانِ آخرین ساعتِ شروع رعایت می‌کند", () => {
    const r = applyOps(BASE, [], [
      { op: "add", name: "کشش", days: [4], start: "۰۸:۰۰", end: "۰۸:۱۰", repeatEveryMin: 30, repeatUntil: "۰۹:۰۰" },
    ], TODAY);
    const created = r.occurrences.filter((o) => o.name === "کشش");
    expect(created.map((o) => o.time)).toEqual([
      "۰۸:۰۰ – ۰۸:۱۰", "۰۸:۳۰ – ۰۸:۴۰", "۰۹:۰۰ – ۰۹:۱۰",
    ]);
  });

  it("اسلاتِ تداخل‌دار را رد می‌کند، بقیه را اضافه می‌کند و در پیام می‌گوید", () => {
    // شنبه ۰۸:۰۰–۰۹:۳۰ کلاس زبان اشغال است؛ ۰۸:۰۰ و ۰۹:۰۰ هردو داخلِ همین
    // بازه‌اند و رد می‌شوند، فقط ۱۰:۰۰ آزاد است
    const r = applyOps(BASE, [], [
      { op: "add", name: "یادآوری", days: [6], start: "۰۸:۰۰", end: "۰۸:۱۰", repeatEveryMin: 60, repeatUntil: "۱۰:۰۰" },
    ], TODAY);
    const created = r.occurrences.filter((o) => o.name === "یادآوری");
    expect(created).toHaveLength(1);
    expect(created[0].time).toBe("۱۰:۰۰ – ۱۰:۱۰");
    expect(r.applied[0]).toContain("۲ بار به‌خاطرِ تداخل");
  });

  it("بازه‌ی تکرارِ خارج از محدوده را رد می‌کند و چیزی اضافه نمی‌کند", () => {
    const r = applyOps(BASE, [], [
      { op: "add", name: "غلط", days: [4], start: "۰۸:۰۰", repeatEveryMin: 1 },
    ], TODAY);
    expect(r.occurrences.some((o) => o.name === "غلط")).toBe(false);
    expect(r.problems[0]).toContain("بازه‌ی تکرار");
  });

  it("به سقفِ MAX_REPEATS_PER_OP احترام می‌گذارد", () => {
    const r = applyOps([], [], [
      { op: "add", name: "زیاد", days: [4], start: "۰۰:۰۰", end: "۰۰:۰۵", repeatEveryMin: 5, repeatUntil: "۲۳:۵۵" },
    ], TODAY, { startMin: 0, endMin: 24 * 60 - 1 });
    const created = r.occurrences.filter((o) => o.name === "زیاد");
    expect(created.length).toBeLessThanOrEqual(MAX_REPEATS_PER_OP);
  });
});

describe("applyOps — تغییرِ ساعت / جابه‌جایی / حذف", () => {
  it("ساعت را عوض می‌کند و شناسه‌ی تازه می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "retime", ref: 1, start: "۱۰:۰۰", end: "۱۱:۰۰" }], TODAY);
    expect(r.problems).toHaveLength(0);
    const moved = r.occurrences.find((o) => o.name === "کلاس زبان")!;
    expect(moved.time).toBe("۱۰:۰۰ – ۱۱:۰۰");
    expect(moved.id).not.toBe("a");
    expect(r.applied[0]).toContain("۰۸:۰۰ – ۰۹:۳۰");
  });

  it("به روزِ دیگر منتقل می‌کند و ساعتِ قبلی را نگه می‌دارد", () => {
    const r = applyOps(BASE, [], [{ op: "move", ref: 3, toDay: 4 }], TODAY);
    expect(r.problems).toHaveLength(0);
    const m = r.occurrences.find((o) => o.name === "مطالعه")!;
    expect(m.jsDay).toBe(4);
    expect(m.time).toBe("۲۰:۰۰ – ۲۱:۰۰");
    expect(r.applied[0]).toContain("پنجشنبه");
  });

  it("جابه‌جایی به روزی که همان ساعتش پر است رد می‌شود", () => {
    const list = [...BASE, occ("d", "قرار", 4, "۲۰:۰۰ – ۲۱:۰۰")];
    const r = applyOps(list, [], [{ op: "move", ref: 3, toDay: 4 }], TODAY);
    expect(r.applied).toHaveLength(0);
    expect(r.problems[0]).toContain("قرار");
  });

  it("جابه‌جایی به همان روز پیامِ روشن می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "move", ref: 3, toDay: 1 }], TODAY);
    expect(r.problems[0]).toContain("همین حالا هم");
  });

  it("حذف می‌کند و کلیدهای removed همان برنامه را پاک می‌کند", () => {
    const r = applyOps(BASE, ["c|1", "a|6"], [{ op: "delete", ref: 3 }], TODAY);
    expect(r.occurrences.find((o) => o.name === "مطالعه")).toBeUndefined();
    expect(r.removed).toEqual(["a|6"]);
    expect(r.applied[0]).toContain("مطالعه");
  });

  it("ارجاعِ ناموجود/غیرعددی پیامِ روشن می‌دهد، نه کرش", () => {
    const r = applyOps(BASE, [], [
      { op: "delete", ref: 99 },
      { op: "delete", ref: "دومی" },
      { op: "delete" },
    ], TODAY);
    expect(r.problems).toHaveLength(3);
    expect(r.occurrences).toHaveLength(3);
    expect(r.changed).toBe(false);
  });

  it("عملیاتِ ناشناخته را بی‌صدا رد نمی‌کند", () => {
    const r = applyOps(BASE, [], [{ op: "nuke" } as any], TODAY);
    expect(r.problems[0]).toContain("بلد نیستم");
  });
});

describe("applyOps — ترکیبی و سقف", () => {
  it("عملیاتِ پشت‌سرهم روی نتیجه‌ی قبلی سوار می‌شوند", () => {
    // اول کلاس زبان از ۸ می‌رود ۱۰، بعد یک برنامه‌ی تازه سرِ ۸ می‌نشیند
    const r = applyOps(BASE, [], [
      { op: "retime", ref: 1, start: "۱۰:۰۰", end: "۱۱:۰۰" },
      { op: "add", name: "صبحانه", days: [6], start: "۰۸:۰۰", end: "۰۹:۰۰" },
    ], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.applied).toHaveLength(2);
    expect(r.occurrences.find((o) => o.name === "صبحانه")!.time).toBe("۰۸:۰۰ – ۰۹:۰۰");
  });

  it("ref بعد از حذف هم به برنامه‌ی درست اشاره می‌کند", () => {
    const r = applyOps(BASE, [], [{ op: "delete", ref: 1 }, { op: "delete", ref: 2 }], TODAY);
    expect(r.applied).toHaveLength(2);
    expect(r.occurrences.map((o) => o.name)).toEqual(["مطالعه"]);
  });

  it("بیش از سقفِ عملیات را می‌برد و صریح می‌گوید", () => {
    const ops = Array.from({ length: MAX_OPS_PER_MESSAGE + 3 }, (_, i) => ({
      op: "add", name: `ب${i}`, days: [2], start: `${String(i).padStart(2, "0")}:00`,
    }));
    const r = applyOps([], [], ops, TODAY);
    expect(r.applied).toHaveLength(MAX_OPS_PER_MESSAGE);
    expect(r.problems.some((p) => p.includes("حداکثر"))).toBe(true);
  });
});

describe("describeSchedule", () => {
  it("شماره‌ی ردیفِ ۱-پایه می‌دهد و شناسه‌ی واقعی را لو نمی‌دهد", () => {
    const text = describeSchedule(BASE);
    expect(text).toContain("#1");
    expect(text).toContain("#3");
    expect(text).not.toContain("custom-");
    expect(text).not.toContain("\"a\"");
  });
  it("برنامه‌ی خالی را صریح می‌گوید", () => {
    expect(describeSchedule([])).toContain("ثبت نشده");
  });
});

// ── رفتارِ تازه: ساعت اختیاری است و بن‌بست نمی‌دهیم ───────────────────────

describe("برنامه‌ی بدونِ ساعت", () => {
  it("«امروز ورزش دارم» بدونِ ساعت ثبت می‌شود، نه با ساعتِ حدسی", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "ورزش", days: [6] }], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.changed).toBe(true);
    const added = r.occurrences.find((o) => o.name === "ورزش")!;
    expect(added.jsDay).toBe(6);
    expect(added.time).toBe("");
    expect(r.applied[0]).toContain("بدونِ ساعت");
    expect(r.options).toContain("برای «ورزش» ساعت هم بگذار");
  });

  it("برنامه‌ی بی‌ساعت با هیچ‌چیز تداخل ندارد — حتی روزِ کاملا پر", () => {
    const full = [occ("f", "پر", 3, "۰۰:۰۰ – ۲۳:۵۹")];
    const r = applyOps(full, [], [{ op: "add", name: "خرید", days: [3] }], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.occurrences.find((o) => o.name === "خرید")!.time).toBe("");
  });

  it("چند برنامه‌ی بی‌ساعت در یک روز کنارِ هم می‌نشینند", () => {
    const r = applyOps([], [], [
      { op: "add", name: "ورزش", days: [1] },
      { op: "add", name: "خرید", days: [1] },
    ], TODAY);
    expect(r.applied).toHaveLength(2);
    expect(r.occurrences.every((o) => o.time === "")).toBe(true);
  });

  it("ساعتِ شروعِ بدشکل هنوز خطاست (فرقِ «نگفتن» با «غلط گفتن»)", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "مطالعه", days: [1], start: "بعدازظهر" }], TODAY);
    expect(r.changed).toBe(false);
    expect(r.problems[0]).toContain("ساعتِ شروع");
  });

  it("جابه‌جاییِ برنامه‌ی بی‌ساعت، بی‌ساعت می‌ماند", () => {
    const list = [{ id: "u", name: "ورزش", jsDay: 6, time: "", startDate: "2026-01-01" }];
    const r = applyOps(list, [], [{ op: "move", ref: 1, toDay: 2 }], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.occurrences[0].jsDay).toBe(2);
    expect(r.occurrences[0].time).toBe("");
    expect(r.applied[0]).toContain("بدونِ ساعت");
  });

  it("retime بدونِ ساعت یعنی «ساعتش را بردار»", () => {
    const r = applyOps(BASE, [], [{ op: "retime", ref: 1 }], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.occurrences.find((o) => o.name === "کلاس زبان")!.time).toBe("");
    expect(r.applied[0]).toContain("برداشته شد");
  });

  it("برداشتنِ ساعت از برنامه‌ای که از قبل بی‌ساعت است، پیامِ روشن می‌دهد", () => {
    const list = [{ id: "u", name: "ورزش", jsDay: 6, time: "", startDate: "2026-01-01" }];
    const r = applyOps(list, [], [{ op: "retime", ref: 1 }], TODAY);
    expect(r.changed).toBe(false);
    expect(r.problems[0]).toContain("از قبل بی‌ساعت");
  });

  it("می‌شود بعدا به برنامه‌ی بی‌ساعت ساعت داد", () => {
    const list = [{ id: "u", name: "ورزش", jsDay: 1, time: "", startDate: "2026-01-01" }];
    const r = applyOps(list, [], [{ op: "retime", ref: 1, start: "07:00", end: "08:00" }], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.occurrences[0].time).toBe("۰۷:۰۰ – ۰۸:۰۰");
  });
});

describe("گزینه‌ها — هیچ بن‌بستی بدونِ راهِ ادامه", () => {
  it("تداخل، گزینه‌ی ثبت در وقتِ آزاد را پیشنهاد می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "جلسه", days: [6], start: "08:30", end: "09:00" }], TODAY);
    expect(r.options.some((o) => o.includes("۰۹:۳۰"))).toBe(true);
    expect(r.options.some((o) => o.includes("روزِ دیگر"))).toBe(true);
  });

  it("نبودِ روز، گزینه‌های امروز/فردا می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "add", name: "مطالعه", days: [], start: "10:00" }], TODAY);
    expect(r.options.some((o) => o.includes("امروز"))).toBe(true);
    expect(r.options.some((o) => o.includes("فردا"))).toBe(true);
  });

  it("ارجاعِ ناموجود، گزینه‌ی دیدنِ فهرست می‌دهد", () => {
    const r = applyOps(BASE, [], [{ op: "delete", ref: 99 }], TODAY);
    expect(r.options.some((o) => o.includes("نشانم بده"))).toBe(true);
  });

  it("بیش از چهار گزینه نمی‌دهد و تکراری هم نه", () => {
    const r = applyOps(BASE, [], [
      { op: "add", name: "الف", days: [6], start: "08:30" },
      { op: "add", name: "ب", days: [6], start: "08:30" },
      { op: "add", name: "پ", days: [6], start: "08:30" },
    ], TODAY);
    expect(r.options.length).toBeLessThanOrEqual(4);
    expect(new Set(r.options).size).toBe(r.options.length);
  });

  it("وقتی همه‌چیز درست پیش رفت، گزینه‌ی «اصلاح» می‌دهد نه خطا", () => {
    const r = applyOps([], [], [{ op: "add", name: "مطالعه", days: [1] }], TODAY);
    expect(r.problems).toHaveLength(0);
    expect(r.options).toContain("برای «مطالعه» ساعت هم بگذار");
  });
});

describe("findFreeSlot", () => {
  it("سقفِ بازه را رعایت می‌کند", () => {
    expect(findFreeSlot([], 1, 8 * 60, 60, 8 * 60 + 30)).toBeNull();
    expect(findFreeSlot([], 1, 8 * 60, 60, 9 * 60)!.startMin).toBe(8 * 60);
  });
});
