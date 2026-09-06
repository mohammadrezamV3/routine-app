import { describe, it, expect } from "vitest";
import {
  applyOps, parseClock, findConflict, suggestFreeSlot, describeSchedule,
  MAX_OPS_PER_MESSAGE, MAX_OCCURRENCES,
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
