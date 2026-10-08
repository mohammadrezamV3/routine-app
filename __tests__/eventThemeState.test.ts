import { describe, it, expect } from "vitest";
import {
  tehranDateIso,
  sanitizeEventThemeState,
  resolveActiveEventTheme,
  currentOccurrence,
  nextOccurrence,
  eventTimeline,
  buildReleaseState,
  EMPTY_EVENT_THEME_STATE,
  type EventThemeState,
} from "@/lib/eventThemeState";
import type { EventTheme, EventOccurrence } from "@/lib/eventThemes";

describe("تم‌های مناسبتی - وضعیت و جدول‌زمان", () => {
  // کاتالوگ آزمایشی
  const halloween: EventTheme = {
    id: "halloween",
    name: "هالووین",
    greeting: "شب خنده‌رو!",
    icon: "ghost",
    decoration: "bats",
    swatch: ["#ff6b35", "#f7931e", "#1a1a1a"],
    occurrences: [
      { start: "2026-10-31", end: "2026-11-02" },
      { start: "2027-10-31", end: "2027-11-02" },
    ],
  };

  const newyear: EventTheme = {
    id: "newyear",
    name: "سال نو میلادی",
    greeting: "سال نو مبارک!",
    icon: "sparkles",
    decoration: "fireworks",
    swatch: ["#ffd700", "#c0c0c0", "#1a1a2e"],
    occurrences: [
      { start: "2026-12-31", end: "2027-01-02" },
      { start: "2027-12-31", end: "2028-01-02" },
    ],
  };

  const valentine: EventTheme = {
    id: "valentine",
    name: "روز عشق",
    greeting: "روزت پر از عشق!",
    icon: "heart",
    decoration: "hearts",
    swatch: ["#ff1744", "#ff69b4", "#fff"],
    occurrences: [
      { start: "2027-02-14", end: "2027-02-14" },
    ],
  };

  const catalog: EventTheme[] = [halloween, newyear, valentine];

  describe("tehranDateIso — تبدیل تاریخ به وقت تهران", () => {
    it("ساعت 20:29 UTC آخرین لحظه‌ی 2026-12-31", () => {
      const dt = new Date("2026-12-31T20:29:00Z");
      expect(tehranDateIso(dt)).toBe("2026-12-31");
    });

    it("ساعت 20:31 UTC = 2027-01-01 تهران (UTC+3:30)", () => {
      const dt = new Date("2026-12-31T20:31:00Z");
      expect(tehranDateIso(dt)).toBe("2027-01-01");
    });

    it("صفر ساعت UTC = 03:30 تهران صبح", () => {
      const dt = new Date("2026-10-02T00:00:00Z");
      expect(tehranDateIso(dt)).toBe("2026-10-02");
    });

    it("23:00 UTC قبل از تهران نیمه‌شب = روز قبل تهران", () => {
      const dt = new Date("2026-10-02T23:00:00Z");
      expect(tehranDateIso(dt)).toBe("2026-10-03");
    });

    it("00:30 UTC = 04:00 تهران صبح", () => {
      const dt = new Date("2026-10-02T00:30:00Z");
      expect(tehranDateIso(dt)).toBe("2026-10-02");
    });
  });

  describe("sanitizeEventThemeState — تصحیح ورودی ناشناخته", () => {
    it("null → { active: null }", () => {
      expect(sanitizeEventThemeState(null, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("undefined → { active: null }", () => {
      expect(sanitizeEventThemeState(undefined, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("آرایه → { active: null }", () => {
      expect(sanitizeEventThemeState([], catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("رشته → { active: null }", () => {
      expect(sanitizeEventThemeState("invalid", catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("بدون فیلد active → { active: null }", () => {
      expect(sanitizeEventThemeState({}, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("{ active: null } → { active: null }", () => {
      expect(sanitizeEventThemeState({ active: null }, catalog)).toEqual({ active: null });
    });

    it("active آرایه → { active: null }", () => {
      expect(sanitizeEventThemeState({ active: [] }, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("active رشته → { active: null }", () => {
      expect(sanitizeEventThemeState({ active: "invalid" }, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("id نامعلوم در کاتالوگ → { active: null }", () => {
      const state = {
        active: {
          id: "unknown-theme",
          releasedAt: "2026-10-03T12:00:00Z",
          endsAt: "2026-10-05",
        },
      };
      expect(sanitizeEventThemeState(state, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("releasedAt نامعتبر ISO → { active: null }", () => {
      const state = {
        active: {
          id: "halloween",
          releasedAt: "not-a-date",
          endsAt: "2026-11-02",
        },
      };
      expect(sanitizeEventThemeState(state, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("endsAt فرمت نادرست (بدون خط‌تیره) → { active: null }", () => {
      const state = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "20261102",
        },
      };
      expect(sanitizeEventThemeState(state, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });

    it("endsAt null معتبر است", () => {
      const state = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: null,
        },
      };
      expect(sanitizeEventThemeState(state, catalog)).toEqual(state);
    });

    it("valid state درست بازگشت می‌شود", () => {
      const state = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-02",
        },
      };
      expect(sanitizeEventThemeState(state, catalog)).toEqual(state);
    });

    it("endsAt عدد (نه رشته) → { active: null }", () => {
      const state = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: 20261102 as any,
        },
      };
      expect(sanitizeEventThemeState(state, catalog)).toEqual(EMPTY_EVENT_THEME_STATE);
    });
  });

  describe("resolveActiveEventTheme — تم فعال", () => {
    it("state.active = null → null", () => {
      const state: EventThemeState = { active: null };
      const now = new Date("2026-10-31T12:00:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBeNull();
    });

    it("id موجود + endsAt null → id برگردان (هیچ انقضایی نیست)", () => {
      const state: EventThemeState = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: null,
        },
      };
      const now = new Date("2026-11-05T12:00:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBe("halloween");
    });

    it("id موجود + endsAt آینده → id برگردان", () => {
      const state: EventThemeState = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-10",
        },
      };
      const now = new Date("2026-11-05T12:00:00Z"); // 2026-11-05 تهران
      expect(resolveActiveEventTheme(state, now, catalog)).toBe("halloween");
    });

    it("id موجود + endsAt امروز = هنوز فعال", () => {
      const state: EventThemeState = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-02",
        },
      };
      // 2026-11-02T20:00:00Z = 2026-11-02 تهران (هنوز اندکی تا نیمه‌شب)
      const now = new Date("2026-11-02T20:00:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBe("halloween");
    });

    it("id موجود + endsAt دیروز = منقضی", () => {
      const state: EventThemeState = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-02",
        },
      };
      // 2026-11-03T20:00:00Z = 2026-11-03 تهران
      const now = new Date("2026-11-03T20:00:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBeNull();
    });

    it("id نامعلوم → null", () => {
      const state: EventThemeState = {
        active: {
          id: "unknown",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-10",
        },
      };
      const now = new Date("2026-11-05T12:00:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBeNull();
    });
  });

  describe("currentOccurrence — وقوع جاری", () => {
    it("درون بازه: start = پایان = today", () => {
      const valentine2 = valentine;
      // 2027-02-14
      const now = new Date("2027-02-14T12:00:00Z"); // 2027-02-14 تهران
      expect(currentOccurrence(valentine2, now)?.start).toBe("2027-02-14");
      expect(currentOccurrence(valentine2, now)?.end).toBe("2027-02-14");
    });

    it("درون بازه چند روزه", () => {
      const now = new Date("2026-11-01T12:00:00Z"); // 2026-11-01 تهران
      expect(currentOccurrence(halloween, now)?.start).toBe("2026-10-31");
      expect(currentOccurrence(halloween, now)?.end).toBe("2026-11-02");
    });

    it("روز پایان بازه = هنوز جاری", () => {
      const now = new Date("2026-11-02T20:00:00Z"); // 2026-11-02 تهران
      expect(currentOccurrence(halloween, now)).not.toBeNull();
      expect(currentOccurrence(halloween, now)?.end).toBe("2026-11-02");
    });

    it("روز بعد پایان بازه = null", () => {
      const now = new Date("2026-11-03T00:00:00Z"); // 2026-11-03 تهران
      expect(currentOccurrence(halloween, now)).toBeNull();
    });

    it("قبل شروع بازه = null", () => {
      const now = new Date("2026-10-30T12:00:00Z"); // 2026-10-30 تهران
      expect(currentOccurrence(halloween, now)).toBeNull();
    });

    it("بین دو وقوع = null", () => {
      const now = new Date("2027-02-20T12:00:00Z"); // 2027-02-20 تهران
      expect(currentOccurrence(halloween, now)).toBeNull();
    });
  });

  describe("nextOccurrence — وقوع بعدی", () => {
    it("وقوع جاری = برگردان وقوع جاری", () => {
      const now = new Date("2026-11-01T12:00:00Z");
      expect(nextOccurrence(halloween, now)).toEqual(halloween.occurrences[0]);
    });

    it("اولین روز وقوع = برگردان وقوع", () => {
      const now = new Date("2026-10-31T12:00:00Z");
      expect(nextOccurrence(halloween, now)?.start).toBe("2026-10-31");
    });

    it("بعد وقوع جاری = وقوع بعدی", () => {
      const now = new Date("2026-11-03T12:00:00Z");
      expect(nextOccurrence(halloween, now)).toEqual(halloween.occurrences[1]);
    });

    it("قبل هیچ وقوع، اما وقوع بعدی موجود = برگردان", () => {
      const now = new Date("2025-10-01T12:00:00Z");
      // 2025-10-01 قبل از تمام وقوع‌های halloween است، اما 2026-10-31 موجود است
      expect(nextOccurrence(halloween, now)).toEqual(halloween.occurrences[0]);
    });

    it("بعد همه‌ی وقوع‌ها = null", () => {
      const now = new Date("2028-12-01T12:00:00Z");
      expect(nextOccurrence(halloween, now)).toBeNull();
    });

    it("روز بعد آخرین وقوع = null", () => {
      const now = new Date("2027-11-03T12:00:00Z");
      expect(nextOccurrence(halloween, now)).toBeNull();
    });
  });

  describe("eventTimeline — جدول‌زمان وقوع‌ها", () => {
    it("خالی از کاتالوگ خالی", () => {
      const now = new Date("2026-10-03T12:00:00Z");
      expect(eventTimeline([], now, 24)).toEqual([]);
    });

    it("وقوع جاری = status live-window", () => {
      const now = new Date("2026-11-01T12:00:00Z"); // 2026-11-01 تهران
      const result = eventTimeline(catalog, now, 24);
      const halloween1 = result.find((item) => item.theme.id === "halloween" && item.occurrence.start === "2026-10-31");
      expect(halloween1?.status).toBe("live-window");
    });

    it("وقوع آینده = status upcoming", () => {
      const now = new Date("2026-12-20T12:00:00Z");
      const result = eventTimeline(catalog, now, 2); // 2 ماه = تا 2027-02-20
      const newyear1 = result.find((item) => item.theme.id === "newyear" && item.occurrence.start === "2026-12-31");
      expect(newyear1?.status).toBe("upcoming");
    });

    it("وقوع گذشته (قبل from) = حذف شود", () => {
      const now = new Date("2026-11-03T12:00:00Z"); // بعد از halloween
      const result = eventTimeline(catalog, now, 24);
      // halloween.occurrences[0] (2026-10-31) end = 2026-11-02، قبل از today
      const halloween1 = result.find((item) => item.theme.id === "halloween" && item.occurrence.start === "2026-10-31");
      expect(halloween1).toBeUndefined();
    });

    it("محدوده ماه‌ها: از today تا today + months", () => {
      const now = new Date("2026-10-03T00:00:00Z"); // 2026-10-03
      // 24 ماه = تا 2028-10-03
      const result = eventTimeline(catalog, now, 24);
      // halloween (2026-10-31)، newyear (2026-12-31، 2027-12-31)، valentine (2027-02-14) = همه شامل
      const ids = new Set(result.map((item) => `${item.theme.id}/${item.occurrence.start}`));
      expect(ids.has("halloween/2026-10-31")).toBe(true);
      expect(ids.has("newyear/2026-12-31")).toBe(true);
      expect(ids.has("valentine/2027-02-14")).toBe(true);
      expect(ids.has("newyear/2027-12-31")).toBe(true);
    });

    it("بازه محدود: وقوع‌های دور خارج", () => {
      const now = new Date("2026-10-03T00:00:00Z");
      // 1 ماه = تا 2026-11-03
      const result = eventTimeline(catalog, now, 1);
      // halloween (2026-10-31، end 2026-11-02) = شامل
      // newyear (2026-12-31) = خارج (بعد از 2026-11-03)
      const ids = new Set(result.map((item) => item.theme.id));
      expect(ids.has("halloween")).toBe(true);
      expect(ids.has("newyear")).toBe(false);
    });

    it("مرتب‌سازی: بر اساس start، سپس theme id", () => {
      const now = new Date("2026-10-03T00:00:00Z");
      const result = eventTimeline(catalog, now, 24);
      // پیشرفت expected: halloween (31 اکتبر) → newyear (31 دسامبر) → valentine (14 فوریه) → newyear دوم (31 دسامبر 27)
      const starts = result.map((item) => item.occurrence.start);
      // چک مرتب‌سازی تاریخی
      for (let i = 1; i < starts.length; i++) {
        if (starts[i] === starts[i - 1]) {
          // اگر تاریخ یکی‌ست، باید بر اساس id مرتب باشد
          const a = result[i - 1].theme.id;
          const b = result[i].theme.id;
          expect(a.localeCompare(b) <= 0).toBe(true);
        } else {
          expect(starts[i].localeCompare(starts[i - 1]) >= 0).toBe(true);
        }
      }
    });

    it("end = start در روز جاری = شامل", () => {
      // valentine: 2027-02-14 تا 2027-02-14
      const now = new Date("2027-02-14T12:00:00Z");
      const result = eventTimeline(catalog, now, 24);
      const valentine1 = result.find((item) => item.theme.id === "valentine");
      expect(valentine1?.status).toBe("live-window");
    });

    it("پیش‌فرض months = 24", () => {
      const now = new Date("2026-10-03T00:00:00Z");
      const result1 = eventTimeline(catalog, now);
      const result2 = eventTimeline(catalog, now, 24);
      expect(result1).toEqual(result2);
    });
  });

  describe("buildReleaseState — وضعیت انتشار", () => {
    it("درون وقوع = endsAt = پایان وقوع", () => {
      const now = new Date("2026-11-01T12:00:00Z");
      const state = buildReleaseState(halloween, now);
      expect(state.active).not.toBeNull();
      expect(state.active?.id).toBe("halloween");
      expect(state.active?.endsAt).toBe("2026-11-02");
      expect(new Date(state.active?.releasedAt || "").getTime()).toBe(now.getTime());
    });

    it("برون وقوع = endsAt = null", () => {
      const now = new Date("2026-11-03T12:00:00Z");
      const state = buildReleaseState(halloween, now);
      expect(state.active).not.toBeNull();
      expect(state.active?.id).toBe("halloween");
      expect(state.active?.endsAt).toBeNull();
    });

    it("هیچ وقوع نیست = endsAt = null", () => {
      const now = new Date("2025-09-01T12:00:00Z");
      const state = buildReleaseState(halloween, now);
      expect(state.active?.id).toBe("halloween");
      expect(state.active?.endsAt).toBeNull();
    });

    it("releasedAt = now ISO", () => {
      const now = new Date("2026-11-01T12:30:45.123Z");
      const state = buildReleaseState(halloween, now);
      expect(state.active?.releasedAt).toBe("2026-11-01T12:30:45.123Z");
    });

    it("theme id ثابت می‌ماند", () => {
      const now = new Date("2026-11-01T12:00:00Z");
      const state = buildReleaseState(valentine, now);
      expect(state.active?.id).toBe("valentine");
    });

    it("روز اول وقوع = status درون (live)", () => {
      const now = new Date("2026-10-31T12:00:00Z");
      const state = buildReleaseState(halloween, now);
      expect(state.active?.endsAt).toBe("2026-11-02");
    });

    it("روز آخر وقوع = status درون (live)", () => {
      const now = new Date("2026-11-02T20:00:00Z");
      const state = buildReleaseState(halloween, now);
      expect(state.active?.endsAt).toBe("2026-11-02");
    });
  });

  describe("حالات حدی — مرز نیمه‌شب تهران", () => {
    it("17:00 UTC شب 31 اکتبر = 2026-10-31 تهران (20:30)، UTC+3:30", () => {
      // 2026-10-31T17:00:00Z + 3:30 = 2026-10-31T20:30:00 تهران
      const dt = new Date("2026-10-31T17:00:00Z");
      expect(tehranDateIso(dt)).toBe("2026-10-31");
      expect(currentOccurrence(halloween, dt)).not.toBeNull();
    });

    it("20:29 UTC = 2026-10-31T23:59 تهران = هنوز Oct 31", () => {
      // 2026-10-31T20:29:00Z + 3:30 = 2026-10-31T23:59:00 تهران
      const dt = new Date("2026-10-31T20:29:00Z");
      expect(tehranDateIso(dt)).toBe("2026-10-31");
      expect(currentOccurrence(halloween, dt)).not.toBeNull();
    });

    it("20:30 UTC = نیمه‌شب تهران = شروع روز بعد (Nov 1)", () => {
      // 2026-10-31T20:30:00Z + 3:30 = 2026-11-01T00:00:00 تهران
      const dt = new Date("2026-10-31T20:30:00Z");
      expect(tehranDateIso(dt)).toBe("2026-11-01");
      expect(currentOccurrence(halloween, dt)).not.toBeNull();
    });

    it("endsAt same day: 2026-11-02T20:29Z = هنوز فعال", () => {
      const state: EventThemeState = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-02",
        },
      };
      const now = new Date("2026-11-02T20:29:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBe("halloween");
    });

    it("endsAt next day: 2026-11-02T20:31Z = منقضی", () => {
      const state: EventThemeState = {
        active: {
          id: "halloween",
          releasedAt: "2026-10-31T12:00:00Z",
          endsAt: "2026-11-02",
        },
      };
      const now = new Date("2026-11-02T20:31:00Z");
      expect(resolveActiveEventTheme(state, now, catalog)).toBeNull();
    });
  });
});
