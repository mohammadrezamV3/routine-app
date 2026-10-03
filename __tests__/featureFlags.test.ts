import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// فلگ‌های ذخیره‌شده و نقش کاربر mock می‌شن تا گیت *واقعی* روت‌ها
// (sessionFeatureBlocked → featureBlocked → getFeatureFlags) اجرا بشه.
let stored: unknown = null;
let who: { isSuperAdmin: boolean; isAdmin: boolean } = { isSuperAdmin: false, isAdmin: false };
let sessionUser: string | null = "u_test_flags";

vi.mock("@/lib/appSettings", () => ({
  getAppSetting: vi.fn(async (_k: string, fb: unknown) => (stored ?? fb)),
  setAppSetting: vi.fn(async () => {}),
  invalidateAppSettingsCache: vi.fn(),
}));
vi.mock("@/lib/adminFlag", () => ({ getAdminFlags: vi.fn(async () => who) }));
vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => (sessionUser ? { user: { id: sessionUser, isSuperAdmin: who.isSuperAdmin } } : null)),
}));

import {
  FEATURE_KEYS, FEATURE_META, FEATURE_GROUPS, defaultFlags, normalizeFlags, featureChain, resolveFeatureMap, featureVisible,
} from "@/lib/featureFlags";
import { getFeatureFlags, isFeatureEnabled, serverHomePath } from "@/lib/featureFlagsServer";
import { GET as sleepGET } from "@/app/api/sleep/route";
import { GET as calendarGET } from "@/app/api/trade/economic-calendar/route";
import { GET as friendsRequestsGET } from "@/app/api/friends/requests/route";
import { GET as achievementsGET } from "@/app/api/achievements/route";

const OFF_MSG = "این بخش موقتا غیرفعال است";
const USER = { isSuperAdmin: false, isAdmin: false };
const ADMIN = { isSuperAdmin: false, isAdmin: true };
const OWNER = { isSuperAdmin: true, isAdmin: true };

beforeEach(() => {
  stored = null;
  who = USER;
  sessionUser = "u_test_flags";
});

describe("normalizeFlags", () => {
  it("ردیف خالی/نامعتبر → پیش‌فرض‌ها", () => {
    expect(normalizeFlags(null)).toEqual(defaultFlags());
    expect(normalizeFlags("x")).toEqual(defaultFlags());
  });

  it("ردیف قدیمی (فقط شش کلید قبلی) کار می‌کنه و کلیدهای تازه پیش‌فرض می‌گیرن", () => {
    const old = { roadmaps: "on", weeklyAnalysis: "admins", tradeChat: "off", routineAssistant: "on", mentors: "on", dashboard: "on", _rev: 2 };
    const f = normalizeFlags(old);
    expect(f.roadmaps).toBe("on");
    expect(f.weeklyAnalysis).toBe("admins");
    expect(f.tradeChat).toBe("off");
    for (const k of ["routine", "sleep", "streak", "exercise", "calorie", "trade", "tradeJournal", "economicCalendar", "friends", "blog", "about", "notifications"] as const) {
      expect(f[k]).toBe("on");
    }
  });

  it("پیش‌فرض‌های قبلی دست نخوردن", () => {
    const d = defaultFlags();
    expect(d.roadmaps).toBe("off");
    expect(d.weeklyAnalysis).toBe("off");
    expect(d.dashboard).toBe("on");
    expect(d.tradeChat).toBe("on");
  });

  it("مقدار نامعتبر یک کلید نادیده گرفته می‌شه و کلید ناشناخته حذف", () => {
    const f = normalizeFlags({ sleep: "maybe", trade: "off", bogus: "on" });
    expect(f.sleep).toBe("on");
    expect(f.trade).toBe("off");
    expect((f as any).bogus).toBeUndefined();
  });

  it("هر کلید متا، گروه معتبر و برچسب فارسی داره", () => {
    const groups = new Set(FEATURE_GROUPS.map((g) => g.key));
    for (const k of FEATURE_KEYS) {
      expect(groups.has(FEATURE_META[k].group)).toBe(true);
      expect(FEATURE_META[k].label.length).toBeGreaterThan(1);
      const p = FEATURE_META[k].parent;
      if (p) expect(FEATURE_KEYS).toContain(p);
    }
  });
});

describe("زنجیره‌ی مادر/زیربخش", () => {
  it("featureChain", () => {
    expect(featureChain("tradeChat")).toEqual(["tradeChat", "tradeChart", "trade"]);
    expect(featureChain("sleep")).toEqual(["sleep"]);
  });

  it("ترید خاموش → همه‌ی زیربخش‌های ترید خاموش (Owner همچنان مجاز)", () => {
    const flags = normalizeFlags({ trade: "off" });
    const m = resolveFeatureMap(flags, USER);
    expect(m.trade).toBe(false);
    expect(m.economicCalendar).toBe(false);
    expect(m.tradeChat).toBe(false);
    expect(m.sleep).toBe(true);
    expect(resolveFeatureMap(flags, OWNER).economicCalendar).toBe(true);
  });

  it("حالت admins فقط برای ادمین", () => {
    const flags = normalizeFlags({ friends: "admins" });
    expect(resolveFeatureMap(flags, USER).friends).toBe(false);
    expect(resolveFeatureMap(flags, ADMIN).friends).toBe(true);
  });

  it("featureVisible قبل از رسیدن وضعیت پیش‌فرض رو نشون می‌ده", () => {
    expect(featureVisible(null, "sleep")).toBe(true);
    expect(featureVisible(null, "roadmaps")).toBe(false);
    expect(featureVisible({ sleep: false }, "sleep")).toBe(false);
    expect(featureVisible({}, "economicCalendar")).toBe(true);
  });
});

describe("featureFlagsServer", () => {
  it("مهاجرت قدیمی داشبورد (بدون _rev) حفظ شده", async () => {
    stored = { dashboard: "admins" };
    expect((await getFeatureFlags()).dashboard).toBe("on");
    stored = { dashboard: "admins", _rev: 2 };
    expect((await getFeatureFlags()).dashboard).toBe("admins");
  });

  it("isFeatureEnabled مادر رو هم چک می‌کنه", async () => {
    stored = { trade: "off", _rev: 2 };
    expect(await isFeatureEnabled("tradeNotes", "u")).toBe(false);
    expect(await isFeatureEnabled("sleep", "u")).toBe(true);
  });

  it("صفحه‌ی اصلی: داشبورد → روتین → پنل کاربری", async () => {
    stored = { _rev: 2 };
    expect(await serverHomePath("u")).toBe("/dashboard");
    stored = { dashboard: "off", _rev: 2 };
    expect(await serverHomePath("u")).toBe("/weekly");
    stored = { dashboard: "off", routine: "off", _rev: 2 };
    expect(await serverHomePath("u")).toBe("/account");
  });
});

describe("گیت روت‌ها", () => {
  const req = (url: string) => new NextRequest(`http://localhost${url}`);

  it("خواب خاموش → GET /api/sleep پیام غیرفعال", async () => {
    stored = { sleep: "off", _rev: 2 };
    const res = await sleepGET(req("/api/sleep?from=2026-09-01&to=2026-09-02"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(OFF_MSG);
  });

  it("ترید خاموش → تقویم اقتصادی هم بسته‌ست", async () => {
    stored = { trade: "off", _rev: 2 };
    const res = await calendarGET(req("/api/trade/economic-calendar"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(OFF_MSG);
  });

  it("دوستان فقط ادمین‌ها → کاربر عادی بسته، ادمین از گیت رد می‌شه", async () => {
    stored = { friends: "admins", _rev: 2 };
    const res = await friendsRequestsGET();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(OFF_MSG);

    who = ADMIN;
    const res2 = await friendsRequestsGET();
    const body = await res2.json().catch(() => ({}));
    expect(body.error).not.toBe(OFF_MSG);
  });

  it("استریک خاموش → /api/achievements بسته؛ مهمان هم بسته", async () => {
    stored = { streak: "off", _rev: 2 };
    expect((await (await achievementsGET()).json()).error).toBe(OFF_MSG);
    sessionUser = null;
    expect((await achievementsGET()).status).toBe(403);
  });
});
