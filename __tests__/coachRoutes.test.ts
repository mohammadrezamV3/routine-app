import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

// فقط فراخوانی شبکه‌ی مدل mock می‌شود؛ بقیه‌ی aiClient (parseJsonResponse، recordAiUsage) واقعی می‌مونه
let aiImpl: () => any = () => {
  throw new Error("AI not configured for this test");
};
const callAiChat = vi.fn(async (..._args: any[]) => aiImpl());
vi.mock("@/lib/aiClient", async (orig) => ({
  ...(await orig<any>()),
  callAiChat: (...a: any[]) => callAiChat(...a),
}));

import { prisma } from "@/lib/prisma";
import { GET as getGoal, POST as postGoal, PATCH as patchGoal } from "@/app/api/mentorships/[id]/goal/route";
import { GET as getWeeks } from "@/app/api/mentorships/[id]/weeks/route";
import { POST as postSeen } from "@/app/api/mentorships/[id]/weeks/seen/route";
import { GET as getSpace } from "@/app/api/mentorships/[id]/space/route";
import { GET as getToday } from "@/app/api/mentor/today/route";
import { GET as getStudents } from "@/app/api/mentor/students/route";
import { GET as getByUsername } from "@/app/api/mentors/by-username/[username]/route";
import { POST as nomoProgram } from "@/app/api/mentor/nomo/program/route";
import { POST as nomoWeek } from "@/app/api/mentor/nomo/week/route";
import { POST as nomoNudge } from "@/app/api/mentor/nomo/nudge/route";
import { snapshotCoachWeeks } from "@/lib/coachWeekServer";
import { COACH_NOMO_DAILY_LIMIT } from "@/lib/coachNomo";
import { lastFinishedWeekStart, weekStartOf, addDaysIso } from "@/lib/coachWeek";
import { dateFromIso } from "@/lib/mentorServer";
import {
  as, req, j, makeUser, makeMentor, cleanupUsers, connect, requestMentorship, activeProgram, setPrivacy, today,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const p = (id: string) => ({ params: { id } });
const goalBody = (over: Record<string, unknown> = {}) => ({ title: "هفته‌ای 3 جلسه", metric: "WORKOUT_SESSIONS", target: 3, weeks: 4, ...over });

async function mkRel() {
  const mentor = await makeMentor();
  const student = await makeUser();
  const mid = await connect(student, mentor);
  const outsider = await makeUser();
  return { mentor, student, mid, outsider };
}

// ───────────────────────── IDOR و نقش‌ها ─────────────────────────

describe("coach routes: IDOR and roles", () => {
  let f: Awaited<ReturnType<typeof mkRel>>;
  beforeAll(async () => {
    f = await mkRel();
    as(f.mentor);
    const r = await postGoal(req("POST", "x", goalBody()), p(f.mid));
    expect(r.status).toBe(200);
  });

  it("third user gets 404 on goal/weeks/space/seen", async () => {
    as(f.outsider);
    const id = f.mid;
    expect((await getGoal(req("GET", "x"), p(id))).status).toBe(404);
    expect((await postGoal(req("POST", "x", goalBody()), p(id))).status).toBe(404);
    expect((await patchGoal(req("PATCH", "x", { action: "end" }), p(id))).status).toBe(404);
    expect((await getWeeks(req("GET", "/api/x/weeks"), p(id))).status).toBe(404);
    expect((await getWeeks(req("GET", "/api/x/weeks?list=1"), p(id))).status).toBe(404);
    expect((await getSpace(req("GET", "x"), p(id))).status).toBe(404);
    expect((await postSeen(req("POST", "x", { weekStart: weekStartOf(today()) }), p(id))).status).toBe(404);
  });

  it("third user gets 404 on nomo for someone else's mentorship", async () => {
    // outsider هم باید پروفایل مربی داشته باشه تا به چک همکاری برسه
    const other = await makeMentor();
    as(other);
    for (const [fn, body] of [
      [nomoProgram, { mentorshipId: f.mid, prompt: "برنامه", type: "ROUTINE" }],
      [nomoWeek, { mentorshipId: f.mid, weekStart: weekStartOf(today()) }],
      [nomoNudge, { mentorshipId: f.mid }],
    ] as const) {
      const res = await fn(req("POST", "x", body));
      expect(res.status).toBe(404);
    }
    expect(callAiChat).not.toHaveBeenCalled();
  });

  it("unknown / malformed ids are 404", async () => {
    as(f.mentor);
    expect((await getSpace(req("GET", "x"), p("nope"))).status).toBe(404);
    expect((await getGoal(req("GET", "x"), p("x".repeat(100)))).status).toBe(404);
  });

  it("student cannot create/end a goal or mark seen, but can read goal/weeks/space", async () => {
    as(f.student);
    expect((await postGoal(req("POST", "x", goalBody()), p(f.mid))).status).toBe(404);
    expect((await patchGoal(req("PATCH", "x", { action: "end" }), p(f.mid))).status).toBe(404);
    expect((await postSeen(req("POST", "x", { weekStart: weekStartOf(today()) }), p(f.mid))).status).toBe(404);
    const g = await j(await getGoal(req("GET", "x"), p(f.mid)));
    expect(g.goal.title).toBe("هفته‌ای 3 جلسه");
    expect((await getWeeks(req("GET", "/api/x/weeks"), p(f.mid))).status).toBe(200);
    const sp = await j(await getSpace(req("GET", "x"), p(f.mid)));
    expect(sp.role).toBe("STUDENT");
    expect(sp.privacy).toMatchObject({ shareSleep: false, showProgress: true });
  });

  it("student cannot call nomo (404) and no AI call is made", async () => {
    as(f.student);
    const res = await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect([403, 404]).toContain(res.status);
    expect(callAiChat).not.toHaveBeenCalled();
  });

  it("mentor sees role MENTOR and privacy null in space", async () => {
    as(f.mentor);
    const sp = await j(await getSpace(req("GET", "x"), p(f.mid)));
    expect(sp.role).toBe("MENTOR");
    expect(sp.privacy).toBeNull();
  });

  it("unauthenticated is rejected", async () => {
    as(null);
    expect((await getSpace(req("GET", "x"), p(f.mid))).status).toBe(401);
    expect((await getToday()).status).toBe(401);
  });
});

// ───────────────────────── چرخه‌ی هدف ─────────────────────────

describe("coach goal lifecycle", () => {
  it("create -> second create ends the first -> PATCH end -> conflict when none", async () => {
    const f = await mkRel();
    as(f.mentor);
    const r1 = await j(await postGoal(req("POST", "x", goalBody({ title: "اول" })), p(f.mid)));
    expect(r1.goal).toMatchObject({ title: "اول", status: "ACTIVE", target: 3, weeks: 4, metric: "WORKOUT_SESSIONS" });
    expect(r1.goal.history).toHaveLength(4);

    const r2 = await j(await postGoal(req("POST", "x", goalBody({ title: "دوم", metric: "ROUTINE_RATE", target: 80 })), p(f.mid)));
    expect(r2.goal.status).toBe("ACTIVE");
    expect(r2.goal.id).not.toBe(r1.goal.id);

    const rows = await prisma.mentorGoal.findMany({ where: { mentorshipId: f.mid }, orderBy: { createdAt: "asc" } });
    expect(rows.map((x) => x.status)).toEqual(["ENDED", "ACTIVE"]);
    expect(rows[0].endedAt).not.toBeNull();

    const g = await j(await getGoal(req("GET", "x"), p(f.mid)));
    expect(g.goal.id).toBe(r2.goal.id);
    expect(g.past.map((x: any) => x.id)).toEqual([r1.goal.id]);

    const end = await patchGoal(req("PATCH", "x", { action: "end" }), p(f.mid));
    expect(end.status).toBe(200);
    expect((await j(end)).goal.status).toBe("ENDED");
    expect((await j(await getGoal(req("GET", "x"), p(f.mid)))).goal).toBeNull();

    expect((await patchGoal(req("PATCH", "x", { action: "end" }), p(f.mid))).status).toBe(409);
    expect((await patchGoal(req("PATCH", "x", { action: "boom" }), p(f.mid))).status).toBe(400);
  });

  it("validation limits give 400", async () => {
    const f = await mkRel();
    as(f.mentor);
    const bad: Record<string, unknown>[] = [
      { title: "" },
      { title: "x".repeat(81) },
      { metric: "NOPE" },
      { target: 0 },
      { target: 15 }, // سقف جلسه در هفته 14
      { target: "abc" },
      { weeks: 0 },
      { weeks: 53 },
      { weeks: 1.5 },
      { startDate: "2020-01-01" },
      { startDate: "not-a-date" },
    ];
    for (const over of bad) {
      const res = await postGoal(req("POST", "x", goalBody(over)), p(f.mid));
      expect(res.status, JSON.stringify(over)).toBe(400);
    }
    expect((await postGoal(req("POST", "x", goalBody({ metric: "ROUTINE_RATE", target: 101 })), p(f.mid))).status).toBe(400);
    expect(await prisma.mentorGoal.count({ where: { mentorshipId: f.mid } })).toBe(0);
    // مرزها معتبرن
    expect((await postGoal(req("POST", "x", goalBody({ target: 14, weeks: 52 })), p(f.mid))).status).toBe(200);
    expect((await postGoal(req("POST", "x", goalBody({ metric: "ROUTINE_RATE", target: 100, weeks: 1 })), p(f.mid))).status).toBe(200);
  });

  it("startDate rounds to the Saturday of that week", async () => {
    const f = await mkRel();
    as(f.mentor);
    const r = await j(await postGoal(req("POST", "x", goalBody({ startDate: today() })), p(f.mid)));
    expect(r.goal.startDate).toBe(weekStartOf(today()));
    expect(r.goal.endDate).toBe(addDaysIso(weekStartOf(today()), 4 * 7 - 1));
  });

  it("paused/ended mentorship has no goal access", async () => {
    const f = await mkRel();
    await prisma.mentorship.update({ where: { id: f.mid }, data: { status: "ENDED" } });
    as(f.mentor);
    expect((await postGoal(req("POST", "x", goalBody()), p(f.mid))).status).toBe(404);
  });
});

// ───────────────────────── حریم خصوصی گزارش هفته ─────────────────────────

describe("coach weeks: privacy and seen", () => {
  let f: Awaited<ReturnType<typeof mkRel>>;
  let lastWeek: string;
  const weekUrl = (w: string) => `/api/x/weeks?week=${w}`;

  beforeAll(async () => {
    f = await mkRel();
    lastWeek = lastFinishedWeekStart(today());
    // همکاری 30 روز پیش شروع شده تا هفته‌ی گذشته قابل خواندن باشه
    await prisma.mentorship.update({ where: { id: f.mid }, data: { startedAt: new Date(Date.now() - 30 * 86_400_000) } });
    // عکس هفته‌ی گذشته با روتین 80% و خواب 7 ساعت، خلاصه‌ی نومو و علامت دیده شدن
    const days = Array.from({ length: 7 }, (_, i) => ({ date: addDaysIso(lastWeek, i), routineRate: 80, workout: null, sleepMinutes: 420 }));
    await prisma.mentorWeekSnapshot.create({
      data: {
        mentorshipId: f.mid,
        weekStart: dateFromIso(lastWeek),
        data: { weekIndex: 1, complete: true, routineRate: 80, routineDelta: 5, workoutsDone: null, workoutsPlanned: null, sleepAvgMinutes: 420, streak: 4, days, grade: "great" },
        summary: "SECRET-SUMMARY",
        seenAt: new Date(),
      },
    });
  });

  it("past snapshot: values visible, sleep hidden until shareSleep is on, then gone again", async () => {
    as(f.mentor);
    let r = (await j(await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid)))).report;
    expect(r.routineRate).toBe(80);
    expect(r.streak).toBe(4);
    expect(r.sleepAvgMinutes).toBeNull(); // shareSleep پیش‌فرض خاموش
    expect(r.days.every((d: any) => d.sleepMinutes === null)).toBe(true);

    expect((await setPrivacy(f.student, f.mid, { shareSleep: true })).status).toBe(200);
    as(f.mentor);
    r = (await j(await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid)))).report;
    expect(r.sleepAvgMinutes).toBe(420);
    expect(r.days.every((d: any) => d.sleepMinutes === 420)).toBe(true);

    expect((await setPrivacy(f.student, f.mid, { shareSleep: false })).status).toBe(200);
    as(f.mentor);
    r = (await j(await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid)))).report;
    expect(r.sleepAvgMinutes).toBeNull();
    expect(r.days.every((d: any) => d.sleepMinutes === null)).toBe(true);
    // لیست هم همین
    const list = (await j(await getWeeks(req("GET", "/api/x/weeks?list=1"), p(f.mid)))).weeks as any[];
    const item = list.find((w) => w.weekStart === lastWeek);
    expect(item.sleepAvgMinutes).toBeNull();
    expect(item.days).toEqual([]);
  });

  it("showProgress=false: progress fields are null (not 0), also in the past snapshot and the space timeline", async () => {
    expect((await setPrivacy(f.student, f.mid, { showProgress: false })).status).toBe(200);
    as(f.mentor);
    const cur = (await j(await getWeeks(req("GET", "/api/x/weeks"), p(f.mid)))).report;
    for (const k of ["routineRate", "routineDelta", "streak", "workoutsDone", "workoutsPlanned", "sleepAvgMinutes"]) expect(cur[k], k).toBeNull();
    expect(cur.days.every((d: any) => d.routineRate === null && d.workout === null)).toBe(true);
    expect(cur.grade).toBe("none");

    const past = (await j(await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid)))).report;
    expect(past.routineRate).toBeNull();
    expect(past.streak).toBeNull();
    expect(past.days.every((d: any) => d.routineRate === null)).toBe(true);
    expect(past.grade).toBe("none");

    const sp = await j(await getSpace(req("GET", "x"), p(f.mid)));
    const ev = sp.events.find((e: any) => e.kind === "week");
    expect(ev.routineRate).toBeNull();
    expect(JSON.stringify(sp)).not.toContain('"routineRate":0');

    // برگشت به حالت باز
    expect((await setPrivacy(f.student, f.mid, { showProgress: true })).status).toBe(200);
    as(f.mentor);
    expect((await j(await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid)))).report.routineRate).toBe(80);
  });

  it("module:EXERCISE not shared: workout fields are null (not 0)", async () => {
    // snapshot با تمرین، ولی شاگرد ماژول ورزش رو به اشتراک نذاشته و مربی هم برنامه‌ی تمرین نداره
    const w2 = addDaysIso(lastWeek, -7);
    const days = Array.from({ length: 7 }, (_, i) => ({ date: addDaysIso(w2, i), routineRate: null, workout: i < 3, sleepMinutes: null }));
    const snapData = { weekIndex: 1, complete: true, routineRate: null, routineDelta: null, workoutsDone: 3, workoutsPlanned: 4, sleepAvgMinutes: null, streak: null, days, grade: "good" };
    await prisma.mentorWeekSnapshot.upsert({
      where: { mentorshipId_weekStart: { mentorshipId: f.mid, weekStart: dateFromIso(w2) } },
      create: { mentorshipId: f.mid, weekStart: dateFromIso(w2), data: snapData },
      update: { data: snapData },
    });
    await prisma.mentorship.update({ where: { id: f.mid }, data: { startedAt: new Date(Date.now() - 60 * 86_400_000) } });
    as(f.mentor);
    const r = (await j(await getWeeks(req("GET", weekUrl(w2)), p(f.mid)))).report;
    expect(r.workoutsDone).toBeNull();
    expect(r.workoutsPlanned).toBeNull();
    expect(r.days.every((d: any) => d.workout === null)).toBe(true);
    expect(r.grade).toBe("none");
  });

  it("summary and seenAt are visible to mentor only", async () => {
    as(f.mentor);
    const m = (await j(await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid)))).report;
    expect(m.summary).toBe("SECRET-SUMMARY");
    expect(typeof m.seenAt).toBe("string");

    as(f.student);
    const sRes = await getWeeks(req("GET", weekUrl(lastWeek)), p(f.mid));
    const s = (await j(sRes)).report;
    expect(s.summary).toBeNull();
    expect(s.seenAt).toBeNull();
    const list = (await j(await getWeeks(req("GET", "/api/x/weeks?list=1"), p(f.mid)))).weeks as any[];
    expect(list.every((w) => w.summary === null && w.seenAt === null)).toBe(true);
    expect(JSON.stringify(await j(await getSpace(req("GET", "x"), p(f.mid))))).not.toContain("SECRET-SUMMARY");
  });

  it("week param validation: bad date 400, future / before start 404", async () => {
    as(f.mentor);
    expect((await getWeeks(req("GET", "/api/x/weeks?week=2026-13-45"), p(f.mid))).status).toBe(400);
    expect((await getWeeks(req("GET", "/api/x/weeks?week=garbage"), p(f.mid))).status).toBe(400);
    expect((await getWeeks(req("GET", weekUrl(addDaysIso(today(), 21))), p(f.mid))).status).toBe(404);
    expect((await getWeeks(req("GET", weekUrl("2001-01-01")), p(f.mid))).status).toBe(404);
  });

  it("seen: sets seenAt once, validates body, mentor only", async () => {
    const g = await mkRel();
    const ws = lastFinishedWeekStart(today());
    await prisma.mentorWeekSnapshot.create({
      data: { mentorshipId: g.mid, weekStart: dateFromIso(ws), data: { days: [], grade: "none" } },
    });
    as(g.mentor);
    expect((await postSeen(req("POST", "x", { weekStart: "bad" }), p(g.mid))).status).toBe(400);
    expect((await postSeen(req("POST", "x", {}), p(g.mid))).status).toBe(400);
    // هر روز هفته به شنبه گرد می‌شه
    expect((await postSeen(req("POST", "x", { weekStart: addDaysIso(ws, 3) }), p(g.mid))).status).toBe(200);
    const a = await prisma.mentorWeekSnapshot.findFirst({ where: { mentorshipId: g.mid } });
    expect(a!.seenAt).not.toBeNull();
    await postSeen(req("POST", "x", { weekStart: ws }), p(g.mid));
    const b = await prisma.mentorWeekSnapshot.findFirst({ where: { mentorshipId: g.mid } });
    expect(b!.seenAt!.getTime()).toBe(a!.seenAt!.getTime());
  });
});

// ───────────────────────── فضا: هرگز متن پیام ─────────────────────────

describe("coach space never exposes message text", () => {
  it("legacy and encrypted message rows do not leak into the JSON, but unread counts", async () => {
    const f = await mkRel();
    const legacy = "LEGACY-PLAINTEXT-بسیار-محرمانه";
    const cipher = "Q0lQSEVSVEVYVC1TRUNSRVQ=";
    await prisma.mentorMessage.create({ data: { mentorshipId: f.mid, senderId: f.student, legacyBody: legacy } });
    await prisma.mentorMessage.create({
      data: { mentorshipId: f.mid, senderId: f.student, ciphertext: cipher, iv: "aXZpdml2aXZpdml2", clientId: "c1-" + Math.random().toString(36).slice(2), senderKeyVersion: 1, recipientKeyVersion: 1, commitment: "cm", serverTag: "st" },
    });
    for (const who of [f.mentor, f.student]) {
      as(who);
      const res = await getSpace(req("GET", "x"), p(f.mid));
      expect(res.status).toBe(200);
      const text = JSON.stringify(await j(res));
      expect(text).not.toContain(legacy);
      expect(text).not.toContain("LEGACY-PLAINTEXT");
      expect(text).not.toContain(cipher);
      expect(text).not.toContain("legacyBody");
      expect(text).not.toContain("ciphertext");
    }
    as(f.mentor);
    expect((await j(await getSpace(req("GET", "x"), p(f.mid)))).unread).toBe(2);
    as(f.student);
    expect((await j(await getSpace(req("GET", "x"), p(f.mid)))).unread).toBe(0);
  });

  it("timeline holds program + goal + status events; todayTasks only for student", async () => {
    const f = await mkRel();
    await activeProgram(f.mentor, f.student, f.mid);
    as(f.mentor);
    await postGoal(req("POST", "x", goalBody()), p(f.mid));
    as(f.mentor);
    const m = await j(await getSpace(req("GET", "x"), p(f.mid)));
    const kinds = m.events.map((e: any) => e.kind);
    expect(kinds).toEqual(expect.arrayContaining(["program", "goal", "status"]));
    expect(m.todayTasks).toBeNull();
    expect(m.goal.title).toBe("هفته‌ای 3 جلسه");
    as(f.student);
    const s = await j(await getSpace(req("GET", "x"), p(f.mid)));
    expect(Array.isArray(s.todayTasks)).toBe(true);
    expect(s.todayTasks.length).toBeGreaterThan(0);
    expect(s.thisWeek.summary).toBeNull();
  });
});

// ───────────────────────── امروز مربی و شاگردها ─────────────────────────

describe("mentor today inbox and students", () => {
  it("empty without a mentor profile", async () => {
    const u = await makeUser();
    as(u);
    const t = await j(await getToday());
    expect(t.profile).toBeNull();
    expect(t.counts).toEqual({ students: 0, doneToday: 0, waiting: 0 });
    expect(t.inbox).toEqual([]);
  });

  it("pending request outranks unread message; counts and hint", async () => {
    const f = await mkRel();
    const asker = await makeUser({ name: "درخواست‌دهنده" });
    const r = await requestMentorship(asker, f.mentor, "سلام مربی");
    expect(r.status).toBe(200);
    await prisma.mentorMessage.createMany({
      data: [
        { mentorshipId: f.mid, senderId: f.student, legacyBody: "a" },
        { mentorshipId: f.mid, senderId: f.student, legacyBody: "b" },
        { mentorshipId: f.mid, senderId: f.mentor, legacyBody: "mine-not-counted" },
      ],
    });
    as(f.mentor);
    const t = await j(await getToday());
    expect(t.profile).toMatchObject({ published: true, suspended: false });
    expect(t.counts.students).toBe(1);
    expect(t.counts.waiting).toBe(2);
    const kinds = t.inbox.map((i: any) => i.reason.kind);
    expect(kinds).toEqual(["request", "unread"]);
    expect(t.inbox[0].priority).toBeGreaterThan(t.inbox[1].priority);
    expect(t.inbox[0].reason.message).toBe("سلام مربی");
    expect(t.inbox[1].reason).toMatchObject({ kind: "unread", mentorshipId: f.mid, count: 2 });
    expect(t.students).toHaveLength(1);
    expect(t.students[0].mentorshipId).toBe(f.mid);
    expect(typeof t.hint).toBe("string");
    // متن پیام‌ها هرگز
    expect(JSON.stringify(t)).not.toMatch(/mine-not-counted|"legacyBody"/);
  });

  it("change request ranks above unread; once the unread is read it disappears", async () => {
    const f = await mkRel();
    const progId = await activeProgram(f.mentor, f.student, f.mid);
    await prisma.mentorProgram.update({ where: { id: progId }, data: { status: "DRAFT", changeRequestNote: "enc" } });
    await prisma.mentorMessage.create({ data: { mentorshipId: f.mid, senderId: f.student, legacyBody: "hi" } });
    as(f.mentor);
    let t = await j(await getToday());
    expect(t.inbox.map((i: any) => i.reason.kind)).toEqual(["change_request", "unread"]);
    await prisma.mentorMessage.updateMany({ where: { mentorshipId: f.mid }, data: { readAt: new Date() } });
    t = await j(await getToday());
    expect(t.inbox.map((i: any) => i.reason.kind)).toEqual(["change_request"]);
  });

  it("students route: new coach fields, goal summary, privacy-aware weekRate", async () => {
    const f = await mkRel();
    await prisma.mentorMessage.create({ data: { mentorshipId: f.mid, senderId: f.student, legacyBody: "x" } });
    as(f.mentor);
    await postGoal(req("POST", "x", goalBody({ title: "نزدیک", weeks: 2 })), p(f.mid));
    const res = await getStudents();
    expect(res.status).toBe(200);
    const row = (await j(res)).students.find((s: any) => s.mentorshipId === f.mid);
    expect(row).toBeTruthy();
    expect(row).toMatchObject({ unread: 1, paused: false, idleDays: 0, needsHelp: false, nearGoal: true });
    expect(row.goal).toEqual({ title: "نزدیک", weeksMet: 0, weeks: 2, weeksLeft: 2 });
    expect(row.user.id).toBe(f.student);
    expect(row.student).toBeTruthy(); // فیلد قدیمی برای سازگاری
    expect(Array.isArray(row.labels)).toBe(true);

    expect((await setPrivacy(f.student, f.mid, { showProgress: false })).status).toBe(200);
    as(f.mentor);
    const row2 = (await j(await getStudents())).students.find((s: any) => s.mentorshipId === f.mid);
    expect(row2.weekRate).toBeNull();
  });

  it("students route: idle student needs help; paused is not flagged", async () => {
    const f = await mkRel();
    await prisma.mentorship.update({ where: { id: f.mid }, data: { startedAt: new Date(Date.now() - 6 * 86_400_000) } });
    as(f.mentor);
    let row = (await j(await getStudents())).students.find((s: any) => s.mentorshipId === f.mid);
    expect(row.idleDays).toBeGreaterThanOrEqual(5);
    expect(row.needsHelp).toBe(true);
    let t = await j(await getToday());
    expect(t.inbox.some((i: any) => i.reason.kind === "idle" && i.reason.mentorshipId === f.mid)).toBe(true);
    await prisma.mentorship.update({ where: { id: f.mid }, data: { pausedAt: new Date() } });
    row = (await j(await getStudents())).students.find((s: any) => s.mentorshipId === f.mid);
    expect(row.paused).toBe(true);
    expect(row.needsHelp).toBe(false);
    t = await j(await getToday());
    expect(t.inbox.some((i: any) => i.reason.kind === "idle" && i.reason.mentorshipId === f.mid)).toBe(false);
  });
});

// ───────────────────────── by-username ─────────────────────────

describe("GET /api/mentors/by-username/[username]", () => {
  const uname = () => "cu" + Math.random().toString(36).slice(2, 10);
  const call = (u: string) => getByUsername(req("GET", "x"), { params: { username: u } });

  it("published mentor resolves (case-insensitive); unpublished/suspended/unknown/invalid are 404", async () => {
    const name = uname();
    const mentor = await makeMentor({ username: name });
    const viewer = await makeUser();
    as(viewer);
    let res = await call(name);
    expect(res.status).toBe(200);
    expect((await j(res)).mentorId).toBe(mentor);
    expect((await call(name.toUpperCase())).status).toBe(200);

    await prisma.mentorProfile.update({ where: { userId: mentor }, data: { published: false } });
    expect((await call(name)).status).toBe(404);
    await prisma.mentorProfile.update({ where: { userId: mentor }, data: { published: true, suspendedAt: new Date() } });
    expect((await call(name)).status).toBe(404);
    await prisma.mentorProfile.update({ where: { userId: mentor }, data: { suspendedAt: null, identityStatus: "PENDING" } });
    expect((await call(name)).status).toBe(404);
    await prisma.mentorProfile.update({ where: { userId: mentor }, data: { identityStatus: "VERIFIED" } });
    expect((await call(name)).status).toBe(200);

    expect((await call("zz-no-such-user-123")).status).toBe(404);
    expect((await call("a")).status).toBe(404);
    expect((await call("bad name!")).status).toBe(404);
    // کاربر عادی بدون پروفایل
    const plain = uname();
    await makeUser({ username: plain });
    expect((await call(plain)).status).toBe(404);
    as(null);
    expect((await call(name)).status).toBe(401);
  });
});

// ───────────────────────── نومو ─────────────────────────

describe("coach nomo", () => {
  const okProgram = (n = 3) => ({
    title: "برنامه",
    weeks: 4,
    items: Array.from({ length: n }, (_, i) => ({ title: `کار ${i}`, days: [1, 3], durationMin: 20, startTime: "07:00" })),
  });
  const reply = (obj: unknown) => ({ text: JSON.stringify(obj), usage: { inputTokens: 10, outputTokens: 10 }, durationMs: 5, truncated: false });
  const usedRows = (uid: string, success?: boolean) =>
    prisma.aiUsageRecord.count({ where: { userId: uid, feature: "COACH_NOMO", ...(success === undefined ? {} : { success }) } });

  it("program: success consumes quota, output is clamped (30 items, bad days, weeks)", async () => {
    const f = await mkRel();
    const items = Array.from({ length: 45 }, (_, i) => ({ title: `t${i}`, days: [0, 9, 2, 2, -1, "x"], sets: 500, reps: 12, startTime: "25:99" }));
    aiImpl = () => reply({ title: "P", weeks: 99, items: [{ title: "بدون روز", days: [8] }, ...items] });
    as(f.mentor);
    const res = await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "یک برنامه", type: "WORKOUT" }));
    expect(res.status).toBe(200);
    const body = await j(res);
    expect(body.draft.items).toHaveLength(30);
    expect(body.draft.weeks).toBe(12);
    expect(body.draft.items[0].days).toEqual([0, 2]);
    expect(body.draft.items[0].startTime).toBeNull();
    expect(body.draft.items[0].sets).toBeNull(); // 500 خارج از حد
    expect(body.draft.items[0].reps).toBe(12);
    expect(body.quota).toMatchObject({ unlimited: false, used: 1, limit: COACH_NOMO_DAILY_LIMIT, remaining: COACH_NOMO_DAILY_LIMIT - 1 });
    expect(await usedRows(f.mentor, true)).toBe(1);
    // ورودی مدل شامل متن پیام نیست
    const sent = JSON.stringify(callAiChat.mock.calls.at(-1));
    expect(sent).toContain("یک برنامه");
  });

  it("program: ROUTINE drops sets/reps; validation errors are 400", async () => {
    const f = await mkRel();
    aiImpl = () => reply({ title: "R", items: [{ title: "a", days: [1], sets: 3, reps: 3 }] });
    as(f.mentor);
    const ok = await j(await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "x", type: "ROUTINE" })));
    expect(ok.draft.items[0].sets).toBeNull();
    expect(ok.draft.items[0].reps).toBeNull();
    expect((await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "   ", type: "ROUTINE" }))).status).toBe(400);
    expect((await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "x", type: "OTHER" }))).status).toBe(400);
    expect((await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "x".repeat(501), type: "ROUTINE" }))).status).toBe(400);
  });

  it("AI failure / garbage output -> 503 and quota is not consumed", async () => {
    const f = await mkRel();
    as(f.mentor);
    aiImpl = () => {
      throw new Error("gateway down");
    };
    let res = await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "x", type: "ROUTINE" }));
    expect(res.status).toBe(503);
    expect(await usedRows(f.mentor, true)).toBe(0);

    aiImpl = () => ({ text: "not json at all", usage: { inputTokens: 1, outputTokens: 1 }, durationMs: 1, truncated: false });
    res = await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect(res.status).toBe(503);
    aiImpl = () => reply({ title: "bad", items: [] });
    res = await nomoProgram(req("POST", "x", { mentorshipId: f.mid, prompt: "x", type: "ROUTINE" }));
    expect(res.status).toBe(503);
    aiImpl = () => ({ text: "{", usage: { inputTokens: 1, outputTokens: 1 }, durationMs: 1, truncated: true });
    res = await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect(res.status).toBe(503);
    // هیچ‌کدوم از سهمیه کم نکرد
    expect(await usedRows(f.mentor, true)).toBe(0);
    // سهمیه‌ی گزارش‌شده هنوز کامله
    aiImpl = () => reply({ suggestions: ["آفرین"] });
    const ok = await j(await nomoNudge(req("POST", "x", { mentorshipId: f.mid })));
    expect(ok.quota.used).toBe(1);
  });

  it("quota exhaustion -> 429 with quotaExhausted and no AI call", async () => {
    const f = await mkRel();
    await prisma.aiUsageRecord.createMany({
      data: Array.from({ length: COACH_NOMO_DAILY_LIMIT }, () => ({ userId: f.mentor, feature: "COACH_NOMO" as const, model: "m", success: true })),
    });
    callAiChat.mockClear();
    as(f.mentor);
    const res = await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect(res.status).toBe(429);
    const body = await j(res);
    expect(body.quotaExhausted).toBe(true);
    expect(body.quota).toMatchObject({ used: COACH_NOMO_DAILY_LIMIT, remaining: 0 });
    expect(callAiChat).not.toHaveBeenCalled();
  });

  it("failed usage rows and rows older than 24h do not count toward the quota", async () => {
    const f = await mkRel();
    await prisma.aiUsageRecord.createMany({
      data: [
        ...Array.from({ length: COACH_NOMO_DAILY_LIMIT }, () => ({ userId: f.mentor, feature: "COACH_NOMO" as const, model: "m", success: false })),
        ...Array.from({ length: 5 }, () => ({ userId: f.mentor, feature: "COACH_NOMO" as const, model: "m", success: true, createdAt: new Date(Date.now() - 25 * 3600_000) })),
      ],
    });
    aiImpl = () => reply({ suggestions: ["a", "b", "c", "d", " "] });
    as(f.mentor);
    const res = await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect(res.status).toBe(200);
    const body = await j(res);
    expect(body.suggestions).toEqual(["a", "b", "c"]); // حداکثر 3
    expect(body.quota.used).toBe(1);
  });

  it("burst limit: 7th call within a minute is 429 (without quotaExhausted)", async () => {
    const f = await mkRel();
    aiImpl = () => reply({ suggestions: ["x"] });
    as(f.mentor);
    let last: Response | null = null;
    for (let i = 0; i < 7; i++) last = await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect(last!.status).toBe(429);
    expect((await j(last!)).quotaExhausted).toBeUndefined();
  });

  it("week: needs data (409), stores summary on the snapshot for the mentor only, clamps to 3 lines", async () => {
    const f = await mkRel();
    const ws = lastFinishedWeekStart(today());
    await prisma.mentorship.update({ where: { id: f.mid }, data: { startedAt: new Date(Date.now() - 30 * 86_400_000) } });
    as(f.mentor);
    // هفته‌ی بدون هیچ داده
    expect((await nomoWeek(req("POST", "x", { mentorshipId: f.mid, weekStart: ws }))).status).toBe(409);
    expect((await nomoWeek(req("POST", "x", { mentorshipId: f.mid, weekStart: "bad" }))).status).toBe(400);
    expect((await nomoWeek(req("POST", "x", { mentorshipId: f.mid, weekStart: addDaysIso(today(), 14) }))).status).toBe(400);

    await prisma.mentorWeekSnapshot.create({
      data: { mentorshipId: f.mid, weekStart: dateFromIso(ws), data: { weekIndex: 1, complete: true, routineRate: 60, days: [], grade: "good" } },
    });
    aiImpl = () => reply({ lines: ["یک", "دو", "سه", "چهار"] });
    const res = await nomoWeek(req("POST", "x", { mentorshipId: f.mid, weekStart: ws }));
    expect(res.status).toBe(200);
    expect((await j(res)).summary).toBe("یک\nدو\nسه");
    const m = (await j(await getWeeks(req("GET", `/api/x/weeks?week=${ws}`), p(f.mid)))).report;
    expect(m.summary).toBe("یک\nدو\nسه");
    as(f.student);
    expect((await j(await getWeeks(req("GET", `/api/x/weeks?week=${ws}`), p(f.mid)))).report.summary).toBeNull();
  });

  it("model input never contains message text", async () => {
    const f = await mkRel();
    await prisma.mentorMessage.create({ data: { mentorshipId: f.mid, senderId: f.student, legacyBody: "TOP-SECRET-CHAT-TEXT" } });
    aiImpl = () => reply({ suggestions: ["x"] });
    callAiChat.mockClear();
    as(f.mentor);
    await nomoNudge(req("POST", "x", { mentorshipId: f.mid }));
    expect(callAiChat).toHaveBeenCalled();
    expect(JSON.stringify(callAiChat.mock.calls)).not.toContain("TOP-SECRET-CHAT-TEXT");
  });
});

// ───────────────────────── snapshotCoachWeeks ─────────────────────────

describe("snapshotCoachWeeks", () => {
  it("is idempotent: two runs create one snapshot and one notification; mentor inbox then seen flow", async () => {
    const f = await mkRel();
    const ws = lastFinishedWeekStart(today());
    const old = new Date(Date.now() - 90 * 86_400_000);
    // خیلی قدیمی تا در صدر دسته‌ی ۲۰تایی بیاد
    await prisma.mentorship.update({ where: { id: f.mid }, data: { startedAt: new Date("2020-01-01T00:00:00Z") } });
    // برنامه‌ی روتین مربی که هفته‌ی گذشته رو پوشش می‌ده (بدون تیک → روتین 0%، نمره‌ی low)
    const progId = await activeProgram(f.mentor, f.student, f.mid);
    await prisma.mentorProgram.update({ where: { id: progId }, data: { activatedAt: old, startDate: null } });
    // خواب هفته‌ی گذشته
    const sleepDay = addDaysIso(ws, 2);
    await prisma.sleepEntry.create({
      data: { userId: f.student, date: dateFromIso(sleepDay), sleptAt: new Date(sleepDay + "T00:00:00Z"), wokeAt: new Date(sleepDay + "T08:00:00Z") },
    });
    await setPrivacy(f.student, f.mid, { shareSleep: true });

    const now = new Date();
    await snapshotCoachWeeks(now);
    await snapshotCoachWeeks(new Date(now.getTime() + 16 * 60_000));
    await snapshotCoachWeeks(new Date(now.getTime() + 32 * 60_000));

    const snaps = await prisma.mentorWeekSnapshot.findMany({ where: { mentorshipId: f.mid } });
    expect(snaps).toHaveLength(1);
    expect(snaps[0].notifiedAt).not.toBeNull();
    const notes = await prisma.inAppNotification.findMany({ where: { userId: f.mentor, type: "mentor.week_report" } });
    expect(notes).toHaveLength(1);
    expect(notes[0].url).toContain(`w=${ws}`);
    expect(await prisma.inAppNotification.count({ where: { userId: f.student, type: "mentor.week_report" } })).toBe(0);

    // inbox: week_ready
    as(f.mentor);
    const t = await j(await getToday());
    const wr = t.inbox.find((i: any) => i.reason.kind === "week_ready");
    expect(wr.reason.weekStart).toBe(ws);

    // sleep در عکس هست و با shareSleep نمایش داده می‌شه، با خاموش‌کردن از همون عکس هم محو می‌شه
    let r = (await j(await getWeeks(req("GET", `/api/x/weeks?week=${ws}`), p(f.mid)))).report;
    expect(r.sleepAvgMinutes).toBe(480);
    await setPrivacy(f.student, f.mid, { shareSleep: false });
    as(f.mentor);
    r = (await j(await getWeeks(req("GET", `/api/x/weeks?week=${ws}`), p(f.mid)))).report;
    expect(r.sleepAvgMinutes).toBeNull();
    expect(r.days.every((d: any) => d.sleepMinutes === null)).toBe(true);

    // seen: از صندوق می‌ره و مربی seenAt می‌بینه، شاگرد نه
    expect((await postSeen(req("POST", "x", { weekStart: ws }), p(f.mid))).status).toBe(200);
    const t2 = await j(await getToday());
    expect(t2.inbox.some((i: any) => i.reason.kind === "week_ready")).toBe(false);
    expect((await j(await getWeeks(req("GET", `/api/x/weeks?week=${ws}`), p(f.mid)))).report.seenAt).not.toBeNull();
    as(f.student);
    expect((await j(await getWeeks(req("GET", `/api/x/weeks?week=${ws}`), p(f.mid)))).report.seenAt).toBeNull();
  });

  it("paused, ended or no-data (grade none) mentorships get no notification", async () => {
    const paused = await mkRel();
    await prisma.mentorship.update({ where: { id: paused.mid }, data: { startedAt: new Date("2020-01-02T00:00:00Z"), pausedAt: new Date() } });
    const empty = await mkRel();
    await prisma.mentorship.update({ where: { id: empty.mid }, data: { startedAt: new Date("2020-01-03T00:00:00Z") } });
    await snapshotCoachWeeks(new Date(Date.now() + 3 * 3600_000));
    expect(await prisma.inAppNotification.count({ where: { userId: paused.mentor, type: "mentor.week_report" } })).toBe(0);
    expect(await prisma.mentorWeekSnapshot.count({ where: { mentorshipId: paused.mid } })).toBe(0);
    // بدون داده: عکس ساخته می‌شه (ضدتکرار) ولی اعلان نه
    expect(await prisma.inAppNotification.count({ where: { userId: empty.mentor, type: "mentor.week_report" } })).toBe(0);
  });
});
