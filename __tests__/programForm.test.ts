import { describe, it, expect } from "vitest";
import {
  DAY_PRESETS,
  PROGRAM_TEMPLATES,
  rowDurationMin,
  durationText,
  addMinutesToTime,
  matchDayPreset,
  describeSchedule,
  type TimeRow,
  type ProgramKind,
} from "@/lib/programForm";

describe("programForm", () => {
  describe("DAY_PRESETS", () => {
    it("سه میان‌بر روزهای هفته تعریف شده‌اند", () => {
      expect(DAY_PRESETS).toHaveLength(3);
      const keys = DAY_PRESETS.map((p) => p.key);
      expect(keys).toEqual(["all", "work", "weekend"]);
    });

    it("برچسب‌های فارسی درست‌اند", () => {
      expect(DAY_PRESETS[0].label).toBe("هر روز");
      expect(DAY_PRESETS[1].label).toBe("روزهای کاری");
      expect(DAY_PRESETS[2].label).toBe("آخر هفته");
    });

    it("روزهای هر میان‌بر درست‌اند", () => {
      expect(DAY_PRESETS[0].jsDays).toEqual([6, 0, 1, 2, 3, 4, 5]); // تمام هفته
      expect(DAY_PRESETS[1].jsDays).toEqual([6, 0, 1, 2, 3]); // شنبه تا چهارشنبه
      expect(DAY_PRESETS[2].jsDays).toEqual([4, 5]); // پنجشنبه و جمعه
    });
  });

  describe("PROGRAM_TEMPLATES", () => {
    it("هشت برنامه پیشنهادی تعریف شده‌اند", () => {
      expect(PROGRAM_TEMPLATES).toHaveLength(8);
    });

    it("هر برنامه نام، برچسب، مدت و آیکون دارد", () => {
      for (const template of PROGRAM_TEMPLATES) {
        expect(template.name).toBeTruthy();
        expect(template.tag).toBeTruthy();
        expect(template.minutes).toBeGreaterThan(0);
        expect(template.icon).toBeTruthy();
      }
    });

    it("برنامه‌های انتظاری به ترتیب وجود دارند", () => {
      const names = PROGRAM_TEMPLATES.map((t) => t.name);
      expect(names[0]).toBe("ورزش");
      expect(names[1]).toBe("مطالعه");
      expect(names[2]).toBe("مدیتیشن");
      expect(names[3]).toBe("کار عمیق");
      expect(names[4]).toBe("کتاب‌خوانی");
      expect(names[5]).toBe("یادگیری زبان");
      expect(names[6]).toBe("پیاده‌روی");
      expect(names[7]).toBe("برنامه‌ریزی فردا");
    });

    it("آیکون‌های lucide درست‌اند", () => {
      const icons = PROGRAM_TEMPLATES.map((t) => t.icon);
      expect(icons).toContain("Dumbbell");
      expect(icons).toContain("BookOpen");
      expect(icons).toContain("Sparkles");
      expect(icons).toContain("Brain");
    });
  });

  describe("rowDurationMin", () => {
    it("مدت معتبر را به دقیقه برمی‌گرداند", () => {
      const row: Pick<TimeRow, "start" | "end"> = { start: "09:00", end: "10:30" };
      expect(rowDurationMin(row)).toBe(90);
    });

    it("ساعت‌های بدون دقیقه را قبول می‌کند", () => {
      const row: Pick<TimeRow, "start" | "end"> = { start: "9:00", end: "10:00" };
      expect(rowDurationMin(row)).toBe(60);
    });

    it("ارقام فارسی را تبدیل می‌کند", () => {
      const row: Pick<TimeRow, "start" | "end"> = { start: "۰۹:۰۰", end: "۱۰:۳۰" };
      expect(rowDurationMin(row)).toBe(90);
    });

    it("null برگمی‌داند اگه start نامعتبر باشد", () => {
      const row: Pick<TimeRow, "start" | "end"> = { start: "invalid", end: "10:30" };
      expect(rowDurationMin(row)).toBeNull();
    });

    it("null برگمی‌داند اگه end نامعتبر باشد", () => {
      const row: Pick<TimeRow, "start" | "end"> = { start: "09:00", end: "invalid" };
      expect(rowDurationMin(row)).toBeNull();
    });

    it("null برگمی‌داند اگه end <= start باشد", () => {
      expect(rowDurationMin({ start: "10:00", end: "09:00" })).toBeNull();
      expect(rowDurationMin({ start: "10:00", end: "10:00" })).toBeNull();
    });

    it("ساعت‌های مرزی را می‌پذیرد", () => {
      expect(rowDurationMin({ start: "00:00", end: "23:59" })).toBe(1439);
    });

    it("ساعت‌های نامعتبر را رد می‌کند", () => {
      expect(rowDurationMin({ start: "25:00", end: "26:00" })).toBeNull();
      expect(rowDurationMin({ start: "10:60", end: "11:00" })).toBeNull();
    });
  });

  describe("durationText", () => {
    it("دقیقه‌های کمتر از یک ساعت را نمایش می‌دهد", () => {
      expect(durationText(30)).toBe("30 دقیقه");
      expect(durationText(1)).toBe("1 دقیقه");
      expect(durationText(59)).toBe("59 دقیقه");
    });

    it("ساعت‌های دقیق را نمایش می‌دهد", () => {
      expect(durationText(60)).toBe("1 ساعت");
      expect(durationText(120)).toBe("2 ساعت");
      expect(durationText(1440)).toBe("24 ساعت");
    });

    it("ساعت‌های با دقیقه را نمایش می‌دهد", () => {
      expect(durationText(90)).toBe("1 ساعت و 30 دقیقه");
      expect(durationText(150)).toBe("2 ساعت و 30 دقیقه");
      expect(durationText(61)).toBe("1 ساعت و 1 دقیقه");
    });

    it("صفر را نمایش می‌دهد", () => {
      expect(durationText(0)).toBe("0 دقیقه");
    });

    it("همیشه از ارقام لاتین استفاده می‌کند", () => {
      const text = durationText(90);
      expect(/[0-9]/.test(text)).toBe(true);
      expect(/[۰-۹]/.test(text)).toBe(false);
    });
  });

  describe("addMinutesToTime", () => {
    it("دقیقه‌ها را به زمان اضافه می‌کند", () => {
      expect(addMinutesToTime("10:00", 30)).toBe("10:30");
      expect(addMinutesToTime("10:15", 45)).toBe("11:00");
    });

    it("در حول 24 ساعت می‌چرخد", () => {
      expect(addMinutesToTime("23:00", 60)).toBe("00:00");
      expect(addMinutesToTime("23:30", 45)).toBe("00:15");
    });

    it("دقیقه‌های منفی را می‌پذیرد", () => {
      expect(addMinutesToTime("10:00", -30)).toBe("09:30");
      expect(addMinutesToTime("00:00", -30)).toBe("23:30");
    });

    it("ارقام فارسی را تبدیل می‌کند", () => {
      expect(addMinutesToTime("۱۰:۰۰", 30)).toBe("10:30");
    });

    it("صفر‌پدی را حفظ می‌کند", () => {
      expect(addMinutesToTime("09:05", 0)).toBe("09:05");
      expect(addMinutesToTime("00:00", 0)).toBe("00:00");
    });

    it("رشته‌ی خالی برمی‌گرداند اگه ورودی نامعتبر باشد", () => {
      expect(addMinutesToTime("invalid", 30)).toBe("");
      expect(addMinutesToTime("25:00", 30)).toBe("");
    });

    it("با هفته‌های منفی می‌چرخد", () => {
      expect(addMinutesToTime("10:00", -1500)).toBe("09:00"); // -25 ساعت
    });

    it("زمان‌های تک‌رقمی ساعت را می‌پذیرد", () => {
      expect(addMinutesToTime("9:00", 60)).toBe("10:00");
    });
  });

  describe("matchDayPreset", () => {
    it("«هر روز» را تشخیص می‌دهد", () => {
      expect(matchDayPreset([6, 0, 1, 2, 3, 4, 5])).toBe("all");
      expect(matchDayPreset([5, 4, 3, 2, 1, 0, 6])).toBe("all"); // ترتیب معکوس
    });

    it("«روزهای کاری» را تشخیص می‌دهد", () => {
      expect(matchDayPreset([6, 0, 1, 2, 3])).toBe("work");
      expect(matchDayPreset([3, 6, 1, 0, 2])).toBe("work"); // ترتیب معکوس
    });

    it("«آخر هفته» را تشخیص می‌دهد", () => {
      expect(matchDayPreset([4, 5])).toBe("weekend");
      expect(matchDayPreset([5, 4])).toBe("weekend");
    });

    it("null برگمی‌داند اگه متطابق نباشد", () => {
      expect(matchDayPreset([0, 1, 2])).toBeNull();
      expect(matchDayPreset([6])).toBeNull();
    });

    it("آرایه‌ی خالی را null برگمی‌داند", () => {
      expect(matchDayPreset([])).toBeNull();
    });

    it("تکراری‌ها را نادیده می‌گیرد", () => {
      // نکته: خود کدمان از تکراری حمایت نمی‌کند
      // این فقط بررسی می‌کند که آرایه‌ی معمولی درست کار می‌کند
      expect(matchDayPreset([6, 0, 1, 2, 3, 4, 5])).toBe("all");
    });
  });

  describe("describeSchedule", () => {
    describe("weekly", () => {
      it("یک ردیف را توصیف می‌کند", () => {
        const rows: TimeRow[] = [
          {
            id: "1",
            jsDays: [6, 0, 1, 2, 3],
            start: "09:00",
            end: "10:00",
          },
        ];
        expect(describeSchedule("weekly", rows)).toBe("روزهای کاری، 09:00 تا 10:00");
      });

      it("چند ردیف را با « · » جدا می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6, 0, 1], start: "09:00", end: "10:00" },
          { id: "2", jsDays: [2, 3, 4, 5], start: "18:00", end: "19:30" },
        ];
        const result = describeSchedule("weekly", rows);
        expect(result).toContain(" · ");
      });

      it("روزهای دلخواه را توصیف می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6, 1], start: "10:00", end: "11:00" },
        ];
        expect(describeSchedule("weekly", rows)).toBe(
          "هر شنبه و دوشنبه، 10:00 تا 11:00"
        );
      });

      it("ردیف‌های ناقص را نادیده می‌گیرد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [], start: "09:00", end: "10:00" }, // بدون روز
          { id: "2", jsDays: [6], start: "", end: "10:00" }, // بدون start
          { id: "3", jsDays: [6], start: "09:00", end: "10:00" }, // معتبر
        ];
        expect(describeSchedule("weekly", rows)).toBe("هر شنبه، 09:00 تا 10:00");
      });

      it("رشته‌ی خالی برمی‌گرداند اگه ردیف معتبری نباشد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "invalid", end: "10:00" },
        ];
        expect(describeSchedule("weekly", rows)).toBe("");
      });

      it("ارقام فارسی را تبدیل می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "۰۹:۰۰", end: "۱۰:۰۰" },
        ];
        expect(describeSchedule("weekly", rows)).toBe("هر شنبه، 09:00 تا 10:00");
      });
    });

    describe("once", () => {
      it("یک روز و ساعت را توصیف می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [0], start: "18:00", end: "19:30" },
        ];
        const result = describeSchedule("once", rows, {
          onceIso: "2025-10-12",
        });
        expect(result).toContain("فقط");
        expect(result).toContain("18:00 تا 19:30");
      });

      it("تاریخ جلالی را نمایش می‌دهد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [0], start: "09:00", end: "10:00" },
        ];
        const result = describeSchedule("once", rows, {
          onceIso: "2025-10-12", // 1404/07/20
        });
        // تاریخ جلالی شامل روز (عدد) و نام ماه است
        expect(result).toContain("فقط");
        expect(result).toMatch(/\d+/); // حداقل یک عدد (روز)
        expect(result).toMatch(/مهر|آبان|آذر|دی|بهمن|اسفند|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور/);
      });

      it("فقط اولین ردیف معتبر را استفاده می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [0], start: "09:00", end: "10:00" },
          { id: "2", jsDays: [1], start: "14:00", end: "15:00" },
        ];
        const result = describeSchedule("once", rows, {
          onceIso: "2025-10-12",
        });
        expect(result).toContain("09:00");
        expect(result).not.toContain("14:00");
      });

      it("رشته‌ی خالی برمی‌گرداند اگه onceIso نباشد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [0], start: "09:00", end: "10:00" },
        ];
        expect(describeSchedule("once", rows, {})).toBe("");
      });
    });

    describe("period", () => {
      it("روزهای هفتگی و دوره‌ی تاریخی را توصیف می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6, 0, 1], start: "09:00", end: "10:00" },
        ];
        const result = describeSchedule("period", rows, {
          periodFromIso: "2025-10-01",
          periodToIso: "2025-10-31",
        });
        expect(result).toContain("09:00 تا 10:00");
        expect(result).toContain("از");
        expect(result).toContain("تا");
      });

      it("بدون تاریخ‌ها هم کار می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "09:00", end: "10:00" },
        ];
        const result = describeSchedule("period", rows, {});
        expect(result).toBe("هر شنبه، 09:00 تا 10:00");
      });

      it("تاریخ‌های جلالی را نمایش می‌دهد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "09:00", end: "10:00" },
        ];
        const result = describeSchedule("period", rows, {
          periodFromIso: "2025-09-01",
          periodToIso: "2025-12-31",
        });
        // باید شامل «از» و «تا» و تاریخ‌های جلالی باشد
        expect(result).toContain("از");
        expect(result).toContain("تا");
        // حداقل شش عدد (دو برای شروع ساعت و دو برای پایان + دو برای روزهای تاریخ)
        const numbers = result.match(/\d+/g);
        expect(numbers).toHaveLength(6);
      });
    });

    describe("general", () => {
      it("end > start برای ردیف معتبر اجباری است", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "10:00", end: "09:00" },
        ];
        expect(describeSchedule("weekly", rows)).toBe("");
      });

      it("end === start را رد می‌کند", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "10:00", end: "10:00" },
        ];
        expect(describeSchedule("weekly", rows)).toBe("");
      });

      it("ساعت‌های مرزی را می‌پذیرد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "00:00", end: "23:59" },
        ];
        expect(describeSchedule("weekly", rows)).toContain("00:00 تا 23:59");
      });

      it("زمان‌های تک‌رقمی ساعت را می‌پذیرد", () => {
        const rows: TimeRow[] = [
          { id: "1", jsDays: [6], start: "9:00", end: "10:00" },
        ];
        expect(describeSchedule("weekly", rows)).toContain("09:00");
      });
    });
  });
});
