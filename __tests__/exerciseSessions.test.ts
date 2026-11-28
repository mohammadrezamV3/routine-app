import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/realtime", async (orig) => ({ ...(await orig<any>()), withLiveSync: (_k: unknown, h: any) => h }));

import { prisma } from "@/lib/prisma";
import { GET as getLog, POST as postLog } from "@/app/api/exercise/log/route";
import { GET as getRange } from "@/app/api/exercise/log/range/route";
import { setDayDone } from "@/lib/exerciseLogWrite";
import {
  SessionEntry, applySessionWrite, checkSessionWrite, defaultSessionNo, foldSessions, isSessionFullyDone, nextSessionNo, sessionStatus,
} from "@/lib/exerciseSessions";
import { as, req, j, makeUser, cleanupUsers } from "./helpers/mentorTestUtils";

const S = (no: number, p: Partial<SessionEntry> = {}): SessionEntry => ({ no, completed: false, completedItems: [], started: false, plannedCount: null, ...p });

describe("exerciseSessions (منطق خالص)", () => {
  it("جلسه‌ی کامل فقط با پایان و همه‌ی حرکت‌ها؛ ثبت قدیمی کامل است", () => {
    expect(isSessionFullyDone(S(1, { completed: true }))).toBe(true); // قدیمی
    expect(isSessionFullyDone(S(1, { completed: true, plannedCount: 3, completedItems: ["a", "b"] }))).toBe(false);
    expect(isSessionFullyDone(S(1, { completed: true, plannedCount: 2, completedItems: ["a", "b"] }))).toBe(true);
    expect(isSessionFullyDone(S(1, { completed: false, plannedCount: 2, completedItems: ["a", "b"] }))).toBe(false);
    expect(isSessionFullyDone(S(1, { completed: true, plannedCount: 0 }))).toBe(false);
  });

  it("وضعیت جلسه: new/active/resumable/done", () => {
    expect(sessionStatus(undefined)).toBe("new");
    expect(sessionStatus(S(1))).toBe("new");
    expect(sessionStatus(S(1, { started: true }))).toBe("active");
    expect(sessionStatus(S(1, { completed: true, plannedCount: 3, completedItems: ["a"] }))).toBe("resumable");
    expect(sessionStatus(S(1, { completed: true, plannedCount: 1, completedItems: ["a"] }))).toBe("done");
  });

  it("قانون نوشتن: کامل دوباره شروع نمی‌شود، بازپخش پایان بی‌خطر است، جلسه‌ی تازه بدون فاصله", () => {
    const done = S(1, { completed: true, plannedCount: 1, completedItems: ["a"] });
    expect(checkSessionWrite([done], { session: 1, started: true })).toEqual({ ok: false, code: "SESSION_DONE" });
    expect(checkSessionWrite([done], { session: 1, completed: false, completedItems: [] })).toEqual({ ok: false, code: "SESSION_DONE" });
    expect(checkSessionWrite([done], { session: 1, completed: true, completedItems: ["a"] }).ok).toBe(true);
    expect(checkSessionWrite([done], { session: 2, started: true }).ok).toBe(true);
    expect(checkSessionWrite([done], { session: 3, started: true })).toEqual({ ok: false, code: "SESSION_GAP" });
    expect(checkSessionWrite([], { session: 11, started: true })).toEqual({ ok: false, code: "SESSION_LIMIT" });
    const partial = S(1, { completed: true, plannedCount: 3, completedItems: ["a"] });
    expect(checkSessionWrite([partial], { session: 1, started: true }).ok).toBe(true);
  });

  it("ادامه‌ی جلسه‌ی ناقص پایان را برمی‌دارد؛ اجتماع روز و شماره‌ها", () => {
    const partial = S(1, { completed: true, plannedCount: 3, completedItems: ["a"], started: true });
    const resumed = applySessionWrite([partial], { session: 1, started: true });
    expect(resumed[0]).toMatchObject({ completed: false, completedItems: ["a"] });
    const two = applySessionWrite([S(1, { completed: true, completedItems: ["a"], started: true })], { session: 2, completed: false, completedItems: ["b"] });
    const day = foldSessions(two);
    expect(day.completed).toBe(true);
    expect(day.completedItems).toEqual(["a", "b"]);
    expect(nextSessionNo(two)).toBe(3);
    expect(defaultSessionNo(two)).toBe(2);
    expect(defaultSessionNo([])).toBe(1);
  });
});

describe("API /api/exercise/log — چند جلسه", () => {
  let uid: string;
  let other: string;
  let planId: string;
  const DATE = "2026-11-20";
  const call = (body: object, headers?: Record<string, string>) => {
    const r = req("POST", "/api/exercise/log", { planId, date: DATE, ...body });
    if (headers) for (const [k, v] of Object.entries(headers)) r.headers.set(k, v);
    return postLog(r);
  };
  const get = async () => j(await getLog(req("GET", `/api/exercise/log?planId=${planId}&date=${DATE}`)));

  beforeAll(async () => {
    uid = await makeUser();
    other = await makeUser();
    for (const u of [uid, other]) await prisma.moduleAccess.create({ data: { userId: u, module: "EXERCISE", active: true } });
    const plan = await prisma.exercisePlan.create({ data: { userId: uid, level: "beginner", planData: [] } });
    planId = plan.id;
    as(uid);
  });
  afterAll(async () => { as(null); await cleanupUsers(); });

  it("لاگ قدیمی (بدون sessionNo) = جلسه‌ی 1 و خواندنش درست است", async () => {
    await prisma.exerciseLog.create({ data: { userId: uid, planId, date: new Date("2026-11-19T00:00:00Z"), completed: true } });
    const res = await j(await getLog(req("GET", `/api/exercise/log?planId=${planId}&date=2026-11-19`)));
    expect(res.completed).toBe(true);
    expect(res.sessions).toEqual([{ no: 1, completed: true, completedItems: [], started: false, plannedCount: null }]);
  });

  it("جلسه‌ی ناقص ادامه می‌یابد، کامل شروع‌دوباره نمی‌شود، جلسه‌ی جدید ساخته می‌شود", async () => {
    expect((await call({ session: 1, started: true })).status).toBe(200);
    expect((await call({ session: 1, completed: false, completedItems: ["a"] })).status).toBe(200);
    // پایان ناقص (1 از 2)
    expect((await call({ session: 1, completed: true, completedItems: ["a"], plannedCount: 2 })).status).toBe(200);
    let d = await get();
    expect(d.completed).toBe(true);
    expect(d.sessions[0]).toMatchObject({ no: 1, completed: true, plannedCount: 2 });
    // ادامه: شروع دوباره اجازه دارد و پایان را برمی‌دارد
    expect((await call({ session: 1, started: true })).status).toBe(200);
    d = await get();
    expect(d.sessions[0]).toMatchObject({ completed: false, completedItems: ["a"] });
    // کامل‌کردن
    expect((await call({ session: 1, completed: true, completedItems: ["a", "b"], plannedCount: 2 })).status).toBe(200);
    // شروع دوباره‌ی جلسه‌ی کامل ممنوع
    const again = await call({ session: 1, started: true });
    expect(again.status).toBe(409);
    expect((await j(again)).code).toBe("SESSION_DONE");
    expect((await call({ session: 1, completed: false, completedItems: [] })).status).toBe(409);
    // بازپخش همان پایان بی‌خطر
    expect((await call({ session: 1, completed: true, completedItems: ["a", "b"], plannedCount: 2 })).status).toBe(200);
    // جلسه‌ی جدید
    expect((await call({ session: 2, started: true })).status).toBe(200);
    expect((await call({ session: 2, completed: false, completedItems: ["c"] })).status).toBe(200);
    d = await get();
    expect(d.sessions.map((s: any) => s.no)).toEqual([1, 2]);
    expect(d.completedItems).toEqual(["a", "b", "c"]);
    expect(d.completed).toBe(true); // جلسه‌ی 1 کامل شده → روز انجام‌شده
    // فاصله ممنوع، سقف
    expect((await call({ session: 4, started: true })).status).toBe(400);
    expect((await call({ session: 99, started: true })).status).toBe(400);
    expect((await call({ session: 0, started: true })).status).toBe(400);
    expect((await call({ session: 1.5, started: true })).status).toBe(400);
    expect((await call({ session: 2, completed: true, plannedCount: 9999 })).status).toBe(400);
  });

  it("range روز را تجمیع می‌کند و sessions را می‌دهد", async () => {
    const res = await j(await getRange(req("GET", `/api/exercise/log/range?planId=${planId}&start=2026-11-19&end=2026-11-21`)));
    expect(res.logs[DATE].sessions).toHaveLength(2);
    expect(res.logs[DATE].completed).toBe(true);
    expect(res.logs["2026-11-19"].sessions).toHaveLength(1);
  });

  it("ساخت جلسه با requestId بازپخش‌پذیر است (idempotent)", async () => {
    const key = `req_${Math.random().toString(36).slice(2, 12)}`;
    const a = await call({ session: 3, started: true }, { "x-arion-request-id": key });
    const b = await call({ session: 3, started: true }, { "x-arion-request-id": key });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const rows = await prisma.exerciseLog.count({ where: { userId: uid, planId, date: new Date(`${DATE}T00:00:00Z`), sessionNo: 3 } });
    expect(rows).toBe(1);
  });

  it("IDOR: برنامه‌ی دیگران 404 و لاگ دیگران دیده نمی‌شود", async () => {
    as(other);
    expect((await call({ session: 1, started: true })).status).toBe(404);
    const r = await j(await getLog(req("GET", `/api/exercise/log?planId=${planId}&date=${DATE}`)));
    expect(r.sessions ?? []).toHaveLength(0);
    as(uid);
  });

  it("نومو: انجام‌شده/نشده روی چند جلسه", async () => {
    const date = new Date("2026-11-18T00:00:00Z");
    await setDayDone(uid, planId, date, true);
    expect(await prisma.exerciseLog.count({ where: { userId: uid, planId, date, completed: true } })).toBe(1);
    await setDayDone(uid, planId, date, true); // تکراری، جلسه‌ی جدید نمی‌سازد
    expect(await prisma.exerciseLog.count({ where: { userId: uid, planId, date } })).toBe(1);
    await setDayDone(uid, planId, date, false);
    expect(await prisma.exerciseLog.count({ where: { userId: uid, planId, date, completed: true } })).toBe(0);
  });
});
