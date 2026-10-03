import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false, name: "تست" } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { prisma } from "@/lib/prisma";
import { isoLocal } from "@/lib/jalali";
import { fullDays, weekIsos } from "@/lib/friendWeek";
import { GET as listFriends, POST as addFriend } from "@/app/api/friends/route";
import { PATCH as acceptFriend } from "@/app/api/friends/[id]/route";
import { GET as listRequests } from "@/app/api/friends/requests/route";
import { GET as searchUsers } from "@/app/api/friends/search/route";
import { GET as getProfile } from "@/app/api/users/[id]/profile/route";
import { as, req, j, makeUser, cleanupUsers, uniqueTag, setOccurrences, setDailyEntry } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

describe("نوار هفته‌ی دوستان (lib/friendWeek)", () => {
  it("روزهای کامل شمرده می‌شن و برچسب روزها 7 تا و به امروز ختم می‌شه", () => {
    expect(fullDays([100, 100, null, 30])).toBe(2);
    expect(fullDays(undefined)).toBe(0);
    const isos = weekIsos("2026-10-02");
    expect(isos).toHaveLength(7);
    expect(isos[6]).toBe("2026-10-02");
    expect(isos[0]).toBe("2026-09-26");
  });
});

async function befriend(a: string, b: string): Promise<string> {
  as(a);
  const r = await addFriend(req("POST", "/api/friends", { userId: b }));
  const id = (await j(r)).friendshipId as string;
  as(b);
  expect((await acceptFriend(req("PATCH", `/api/friends/${id}`), { params: { id } })).status).toBe(200);
  return id;
}

describe("API دوستان", () => {
  it("لیست دوستان آمار 7 روز (week) داره و امروز کامل = 100", async () => {
    const me = await makeUser();
    const friend = await makeUser();
    await befriend(me, friend);
    const now = new Date();
    await setOccurrences(friend, [{ id: "occ1", name: "مطالعه", jsDay: now.getDay(), time: "08:00" }]);
    await setDailyEntry(friend, isoLocal(now), { occ1: true });

    as(me);
    const d = await j(await listFriends(req("GET", "/api/friends")));
    const f = d.friends.find((x: any) => x.id === friend);
    expect(f.pct).toBe(100);
    expect(f.week).toHaveLength(7);
    expect(f.week[6]).toBe(100);
    expect(f.week.slice(0, 6).every((v: unknown) => v === null)).toBe(true);
  });

  it("درخواست‌ها: دریافتی و ارسالی جدا، هرکدوم فقط مال خود کاربر", async () => {
    const me = await makeUser();
    const other = await makeUser();
    const third = await makeUser();
    const stranger = await makeUser();
    as(me);
    await addFriend(req("POST", "/api/friends", { userId: other }));
    as(third);
    await addFriend(req("POST", "/api/friends", { userId: me }));
    as(stranger);
    await addFriend(req("POST", "/api/friends", { userId: third }));

    as(me);
    const d = await j(await listRequests());
    expect(d.sent.map((x: any) => x.id)).toEqual([other]);
    expect(d.requests.map((x: any) => x.id)).toEqual([third]);
    expect(JSON.stringify(d)).not.toContain(stranger);
  });

  it("جست‌وجو: آواتار و شناسه‌ی رابطه برمی‌گرده، discoverable خاموش پیدا نمی‌شه", async () => {
    const tag = uniqueTag().slice(0, 8);
    const me = await makeUser();
    const visible = await makeUser({ username: `fv${tag}` });
    const hidden = await makeUser({ username: `fh${tag}` });
    await prisma.user.update({ where: { id: visible }, data: { avatarUrl: "/uploads/a.png" } });
    await prisma.user.update({ where: { id: hidden }, data: { discoverable: false } });
    as(me);
    const sent = await j(await addFriend(req("POST", "/api/friends", { userId: visible })));

    const d = await j(await searchUsers(req("GET", `/api/friends/search?q=${tag}`)));
    expect(d.users.map((u: any) => u.id)).toEqual([visible]);
    expect(d.users[0].avatarUrl).toBe("/uploads/a.png");
    expect(d.users[0].status).toBe("pending_sent");
    expect(d.users[0].friendshipId).toBe(sent.friendshipId);
  });

  it("پروفایل: پیشرفت امروز/هفته فقط برای دوست تاییدشده", async () => {
    const me = await makeUser();
    const friend = await makeUser();
    const stranger = await makeUser();
    await befriend(me, friend);

    as(me);
    const pf = (await j(await getProfile(req("GET", `/api/users/${friend}/profile`), { params: { id: friend } }))).profile;
    expect(pf.relation).toBe("friends");
    expect(pf.today).not.toBeNull();
    expect(pf.week).toHaveLength(7);

    const ps = (await j(await getProfile(req("GET", `/api/users/${stranger}/profile`), { params: { id: stranger } }))).profile;
    expect(ps.relation).toBe("none");
    expect(ps.friendshipId).toBeNull();
    expect(ps.today).toBeNull();
    expect(ps.week).toBeNull();

    await addFriend(req("POST", "/api/friends", { userId: stranger }));
    const pp = (await j(await getProfile(req("GET", `/api/users/${stranger}/profile`), { params: { id: stranger } }))).profile;
    expect(pp.relation).toBe("pending_sent");
    expect(pp.today).toBeNull();
    as(stranger);
    const back = (await j(await getProfile(req("GET", `/api/users/${me}/profile`), { params: { id: me } }))).profile;
    expect(back.relation).toBe("pending_received");
  });
});
