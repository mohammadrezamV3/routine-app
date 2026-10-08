import { describe, it, expect, vi, beforeEach } from "vitest";

// lib/announcementsServer روی prisma می‌شینه؛ این‌جا prisma mock می‌شه تا
// قاعده‌ی انتخاب سمت سرور (مخاطب/زمان/بسته‌شده) بدون دیتابیس تست بشه.
const findMany = vi.fn();
const dismissFind = vi.fn();
const subFind = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    announcement: { findMany: (...a: unknown[]) => findMany(...a) },
    announcementDismissal: { findMany: (...a: unknown[]) => dismissFind(...a) },
    subscription: { findFirst: (...a: unknown[]) => subFind(...a) },
  },
}));

import {
  announcementStatus,
  audiencesFor,
  isAnnouncementFreePath,
  isSafeAnnouncementUrl,
  normalizePagePrefix,
  parseAnnouncementInput,
  pathMatches,
  pickPlacements,
  selectAnnouncements,
  validateAnnouncementMerged,
  type AnnouncementAudience,
  type AnnouncementDisplay,
  type AnnouncementPosition,
} from "@/lib/announcements";
import { announcementViewer, displayAnnouncementsFor, listAnnouncementsFor } from "@/lib/announcementsServer";

const NOW = new Date("2026-10-01T12:00:00Z");
const H = 3600_000;

function row(over: Partial<{
  id: string; active: boolean; startsAt: Date | null; expiresAt: Date | null; audience: AnnouncementAudience;
  showInList: boolean; display: AnnouncementDisplay; position: AnnouncementPosition; pages: string[]; priority: number; createdAt: Date;
}> = {}) {
  return {
    id: "a", active: true, startsAt: null, expiresAt: null, audience: "ALL" as AnnouncementAudience,
    showInList: true, display: "NONE" as AnnouncementDisplay, position: "TOP" as AnnouncementPosition, pages: [] as string[],
    priority: 0, createdAt: new Date(NOW.getTime() - H),
    title: "t", body: "b", tone: "INFO", dismissible: true, frequency: "UNTIL_DISMISSED", ctaLabel: null, ctaUrl: null, imageUrl: null,
    ...over,
  };
}

const guest = { loggedIn: false, paid: false };
const free = { loggedIn: true, paid: false };
const paid = { loggedIn: true, paid: true };

describe("مخاطب", () => {
  it("مهمان فقط همه/مهمان", () => expect(audiencesFor(guest).sort()).toEqual(["ALL", "GUESTS"]));
  it("کاربر بدون پلن پولی", () => expect(audiencesFor(free).sort()).toEqual(["ALL", "FREE", "USERS"]));
  it("کاربر پولی", () => expect(audiencesFor(paid).sort()).toEqual(["ALL", "PAID", "USERS"]));

  it("فیلتر هر مخاطب", () => {
    const rows = (["ALL", "USERS", "GUESTS", "PAID", "FREE"] as const).map((a) => row({ id: a, audience: a }));
    const ids = (v: typeof guest) => selectAnnouncements(rows, { mode: "list", now: NOW, viewer: v }).map((r) => r.id).sort();
    expect(ids(guest)).toEqual(["ALL", "GUESTS"]);
    expect(ids(free)).toEqual(["ALL", "FREE", "USERS"]);
    expect(ids(paid)).toEqual(["ALL", "PAID", "USERS"]);
  });
});

describe("زمان‌بندی", () => {
  it("وضعیت‌ها", () => {
    expect(announcementStatus(row({ active: false }), NOW)).toBe("disabled");
    expect(announcementStatus(row({ startsAt: new Date(NOW.getTime() + H) }), NOW)).toBe("scheduled");
    expect(announcementStatus(row({ expiresAt: new Date(NOW.getTime() - 1) }), NOW)).toBe("ended");
    expect(announcementStatus(row({ expiresAt: NOW }), NOW)).toBe("ended");
    expect(announcementStatus(row({ startsAt: NOW, expiresAt: new Date(NOW.getTime() + H) }), NOW)).toBe("live");
  });

  it("فقط زنده‌ها انتخاب می‌شن", () => {
    const rows = [
      row({ id: "live" }),
      row({ id: "future", startsAt: new Date(NOW.getTime() + H) }),
      row({ id: "past", expiresAt: new Date(NOW.getTime() - H) }),
      row({ id: "off", active: false }),
    ];
    expect(selectAnnouncements(rows, { mode: "list", now: NOW, viewer: guest }).map((r) => r.id)).toEqual(["live"]);
  });
});

describe("حالت لیست و نمایش", () => {
  const rows = [
    row({ id: "listOnly", createdAt: new Date(NOW.getTime() - 3 * H) }),
    row({ id: "popupOnly", showInList: false, display: "POPUP", priority: 1, createdAt: new Date(NOW.getTime() - 2 * H) }),
    row({ id: "both", display: "BANNER", priority: 5, createdAt: new Date(NOW.getTime() - H) }),
  ];
  it("لیست فقط showInList، جدیدترین اول", () => {
    expect(selectAnnouncements(rows, { mode: "list", now: NOW, viewer: guest }).map((r) => r.id)).toEqual(["both", "listOnly"]);
  });
  it("نمایش فقط پاپ‌آپ/بنر، اولویت بالاتر اول", () => {
    expect(selectAnnouncements(rows, { mode: "display", now: NOW, viewer: guest }).map((r) => r.id)).toEqual(["both", "popupOnly"]);
  });
  it("بسته‌شده‌ها از نمایش حذف ولی در لیست می‌مونن", () => {
    expect(selectAnnouncements(rows, { mode: "display", now: NOW, viewer: free, dismissed: ["both"] }).map((r) => r.id)).toEqual(["popupOnly"]);
    expect(selectAnnouncements(rows, { mode: "list", now: NOW, viewer: free, dismissed: ["both"] }).map((r) => r.id)).toContain("both");
  });
  it("هم‌اولویت: جدیدتر جلوتر", () => {
    const r2 = [row({ id: "old", display: "POPUP", createdAt: new Date(NOW.getTime() - 5 * H) }), row({ id: "new", display: "POPUP" })];
    expect(selectAnnouncements(r2, { mode: "display", now: NOW, viewer: guest }).map((r) => r.id)).toEqual(["new", "old"]);
  });
});

describe("صفحه‌ها", () => {
  it("خالی = همه‌جا", () => expect(pathMatches([], "/trade/calendar")).toBe(true));
  it("«/» فقط صفحه‌ی اصلی", () => {
    expect(pathMatches(["/"], "/")).toBe(true);
    expect(pathMatches(["/"], "/dashboard")).toBe(false);
  });
  it("پیشوند کامل بخش، نه نیمه", () => {
    expect(pathMatches(["/trade"], "/trade")).toBe(true);
    expect(pathMatches(["/trade"], "/trade/calendar")).toBe(true);
    expect(pathMatches(["/trade"], "/trader")).toBe(false);
    expect(pathMatches(["/dashboard", "/weekly"], "/weekly/")).toBe(true);
  });
  it("هیچ‌وقت روی ادمین و ورود", () => {
    expect(isAnnouncementFreePath("/admin")).toBe(true);
    expect(isAnnouncementFreePath("/admin/announcements")).toBe(true);
    expect(isAnnouncementFreePath("/auth/login")).toBe(true);
    expect(isAnnouncementFreePath("/authors")).toBe(false);
    const rows = [row({ id: "x", display: "POPUP" })];
    expect(selectAnnouncements(rows, { mode: "display", now: NOW, viewer: guest, path: "/admin/users" })).toEqual([]);
    expect(selectAnnouncements(rows, { mode: "display", now: NOW, viewer: guest, path: "/dashboard" })).toHaveLength(1);
  });
  it("فیلتر صفحه در انتخاب", () => {
    const rows = [row({ id: "dash", display: "BANNER", pages: ["/dashboard"] }), row({ id: "home", display: "BANNER", pages: ["/"] })];
    expect(selectAnnouncements(rows, { mode: "display", now: NOW, viewer: guest, path: "/" }).map((r) => r.id)).toEqual(["home"]);
  });
  it("نرمال‌سازی پیشوند", () => {
    expect(normalizePagePrefix("Dashboard/")).toBe("/dashboard");
    expect(normalizePagePrefix("/")).toBe("/");
    expect(normalizePagePrefix("/a b")).toBeNull();
    expect(normalizePagePrefix("//evil")).toBeNull();
    expect(normalizePagePrefix("<script>")).toBeNull();
  });
});

describe("جایگاه‌ها", () => {
  it("یک پاپ‌آپ در لحظه و یک بنر در هر جایگاه (به ترتیب اولویت)", () => {
    const items = [
      { id: "p1", display: "POPUP", position: "TOP" },
      { id: "b1", display: "BANNER", position: "TOP" },
      { id: "p2", display: "POPUP", position: "TOP" },
      { id: "b2", display: "BANNER", position: "TOP" },
      { id: "c1", display: "BANNER", position: "BOTTOM_LEFT" },
    ] as { id: string; display: AnnouncementDisplay; position: AnnouncementPosition }[];
    const r = pickPlacements(items);
    expect(r.popup?.id).toBe("p1");
    expect(r.banners.TOP?.id).toBe("b1");
    expect(r.banners.BOTTOM_LEFT?.id).toBe("c1");
    // بستن پاپ‌آپ اول → نفر بعدی صف
    const r2 = pickPlacements(items, ["p1", "b1"]);
    expect(r2.popup?.id).toBe("p2");
    expect(r2.banners.TOP?.id).toBe("b2");
  });
});

describe("اعتبارسنجی ورودی", () => {
  it("پیش‌فرض‌ها = فقط لیست اعلان‌ها", () => {
    const r = parseAnnouncementInput({ title: "x", body: "y" }, false);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toMatchObject({ showInList: true, display: "NONE", audience: "ALL", pages: [], priority: 0, dismissible: true, frequency: "UNTIL_DISMISSED" });
    }
  });
  it("enum و لینک نامعتبر رد می‌شن", () => {
    expect(parseAnnouncementInput({ title: "x", body: "y", display: "FOO" }, false).ok).toBe(false);
    expect(parseAnnouncementInput({ title: "x", body: "y", ctaUrl: "javascript:alert(1)" }, false).ok).toBe(false);
    expect(parseAnnouncementInput({ title: "x", body: "y", imageUrl: "http://x.com/a.png" }, false).ok).toBe(false);
    expect(parseAnnouncementInput({ title: "x", body: "y", priority: 1000 }, false).ok).toBe(false);
    expect(parseAnnouncementInput({ title: "x", body: "y", pages: ["/ok", "bad path"] }, false).ok).toBe(false);
  });
  it("لینک امن", () => {
    expect(isSafeAnnouncementUrl("/subscription")).toBe(true);
    expect(isSafeAnnouncementUrl("https://example.com/x")).toBe(true);
    expect(isSafeAnnouncementUrl("//evil.com")).toBe(false);
    expect(isSafeAnnouncementUrl("data:text/html,x")).toBe(false);
  });
  it("partial فقط فیلدهای فرستاده", () => {
    const r = parseAnnouncementInput({ active: false }, true);
    expect(r.ok && Object.keys(r.data)).toEqual(["active"]);
  });
  it("قوانین ترکیبی", () => {
    const base = { showInList: true, display: "NONE" as const, startsAt: null, expiresAt: null, ctaLabel: null, ctaUrl: null };
    expect(validateAnnouncementMerged(base)).toBeNull();
    expect(validateAnnouncementMerged({ ...base, showInList: false })).not.toBeNull();
    expect(validateAnnouncementMerged({ ...base, startsAt: new Date(NOW.getTime() + H), expiresAt: NOW })).not.toBeNull();
    expect(validateAnnouncementMerged({ ...base, ctaLabel: "خرید" })).not.toBeNull();
  });
});

describe("سمت سرور", () => {
  beforeEach(() => {
    findMany.mockReset();
    dismissFind.mockReset();
    subFind.mockReset();
  });

  it("بیننده: مهمان بدون کوئری، پلن پولی از اشتراک", async () => {
    expect(await announcementViewer(null)).toEqual(guest);
    expect(subFind).not.toHaveBeenCalled();
    subFind.mockResolvedValueOnce({ id: "s" });
    expect(await announcementViewer("u1")).toEqual(paid);
    const where = subFind.mock.calls[0][0].where;
    expect(where).toMatchObject({ userId: "u1", status: "ACTIVE", plan: { priceMonthly: { gt: 0 } } });
    subFind.mockResolvedValueOnce(null);
    expect(await announcementViewer("u1")).toEqual(free);
  });

  it("نمایش: مخاطب در کوئری، بسته‌شده‌های کاربر حذف", async () => {
    findMany.mockResolvedValue([row({ id: "a", display: "POPUP", priority: 2 }), row({ id: "b", display: "BANNER" })]);
    dismissFind.mockResolvedValue([{ announcementId: "a" }]);
    const items = await displayAnnouncementsFor("u1", free, NOW);
    expect(items.map((i) => i.id)).toEqual(["b"]);
    const where = findMany.mock.calls[0][0].where;
    expect(where.audience.in.sort()).toEqual(["ALL", "FREE", "USERS"]);
    expect(where.display).toEqual({ not: "NONE" });
    expect(dismissFind.mock.calls[0][0].where).toEqual({ userId: "u1" });
  });

  it("نمایش مهمان: بدون کوئری بسته‌شده", async () => {
    findMany.mockResolvedValue([row({ id: "g", display: "POPUP", audience: "GUESTS" })]);
    const items = await displayAnnouncementsFor(null, guest, NOW);
    expect(items.map((i) => i.id)).toEqual(["g"]);
    expect(dismissFind).not.toHaveBeenCalled();
  });

  it("لیست: فقط showInList و حذف دوباره‌ی ردیف خارج از بازه/مخاطب", async () => {
    findMany.mockResolvedValue([row({ id: "ok" }), row({ id: "paidOnly", audience: "PAID" }), row({ id: "later", startsAt: new Date(NOW.getTime() + H) })]);
    const rows = await listAnnouncementsFor(guest, 20, NOW);
    expect(rows.map((r) => r.id)).toEqual(["ok"]);
    expect(findMany.mock.calls[0][0].where.showInList).toBe(true);
  });
});
