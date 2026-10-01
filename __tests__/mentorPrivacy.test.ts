import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { prisma } from "@/lib/prisma";
import { GET as studentView } from "@/app/api/mentor/students/[studentId]/route";
import { GET as getPrivacy } from "@/app/api/mentorships/[id]/privacy/route";
import {
  as,
  req,
  j,
  makeUser,
  makeMentor,
  cleanupUsers,
  connect,
  setPrivacy,
  setOccurrences,
  setDailyEntry,
  activeProgram,
  today,
  jsDayOf,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

async function view(mentorId: string | null, studentId: string, qs = "") {
  as(mentorId);
  return studentView(req("GET", `/api/mentor/students/${studentId}${qs}`), { params: { studentId } });
}
async function viewJ(mentorId: string, studentId: string) {
  const r = await view(mentorId, studentId);
  expect(r.status).toBe(200);
  return j(r);
}

let student: string;
let mA: string;
let mB: string;
let msA: string;
let msB: string;
const wd = jsDayOf(today());

beforeAll(async () => {
  student = await makeUser({ name: "شاگرد" });
  mA = await makeMentor();
  mB = await makeMentor();
  msA = await connect(student, mA);
  msB = await connect(student, mB);
  await setOccurrences(student, [
    { id: "w1", name: "اسکوات سنگین", jsDay: wd, time: "08:00", tag: "Workout", importance: "high" },
    { id: "s1", name: "حل تمرین ریاضی", jsDay: wd, time: "10:00", tag: "Study" },
    { id: "u1", name: "نوبت دکتر محرمانه", jsDay: wd, time: "12:00" },
  ]);
  await setDailyEntry(student, today(), { w1: true, s1: false });
});

describe("نمای منتور — دسترسی", () => {
  it("ناشناس ۴۰۱؛ منتور بی‌ربط ۴۰۴؛ شاگرد به نمای خودش ۴۰۴", async () => {
    expect((await view(null, student)).status).toBe(401);
    const stranger = await makeMentor();
    expect((await view(stranger, student)).status).toBe(404);
    expect((await view(student, student)).status).toBe(404);
    expect((await view(mA, "nonexistent")).status).toBe(404);
  });

  it("بازه‌ی بیش از ۳۱ روز یا نامعتبر ۴۰۰", async () => {
    expect((await view(mA, student, "?from=2026-01-01&to=2026-03-01")).status).toBe(400);
    expect((await view(mA, student, "?from=x&to=y")).status).toBe(400);
  });

  it("پیش‌فرض: هیچ برنامه‌ای مشترک نیست → بدون اسلات و ماژول؛ ایمیل/شماره لو نمی‌رود", async () => {
    const v = await viewJ(mA, student);
    expect(v.routine).toEqual({ scheduleHidden: false, slots: [] });
    expect(v.modules).toEqual({ exercise: null, calorie: null });
    expect(Object.keys(v.student).sort()).toEqual(["avatarUrl", "golden", "id", "lastName", "name", "username"]);
    expect(JSON.stringify(v)).not.toMatch(/@example\.com|passwordHash/);
  });
});

describe("حریم خصوصی — تنظیمات", () => {
  it("فقط شاگرد GET/PUT می‌کند؛ منتور و غریبه ۴۰۴", async () => {
    expect((await setPrivacy(mA, msA, { shareAllPrograms: true })).status).toBe(404);
    expect((await setPrivacy(await makeUser(), msA, { shareAllPrograms: true })).status).toBe(404);
    as(mA);
    expect((await getPrivacy(req("GET", "/x"), { params: { id: msA } })).status).toBe(404);
    as(student);
    const g = await j(await getPrivacy(req("GET", "/x"), { params: { id: msA } }));
    expect(g.privacy.shareAllPrograms).toBe(false);
    const keys = g.scopes.map((s: any) => s.key);
    expect(keys).toEqual(expect.arrayContaining(["routine:Workout", "routine:Study", "routine:نوبت دکتر محرمانه","module:EXERCISE", "module:CALORIE"]));
    expect((await j(await getPrivacy(req("GET", "/x"), { params: { id: msA } }))).privacy.shareAllPrograms).toBe(false);
  });

  it("کلیدهای نامعتبر دور ریخته می‌شوند؛ مقدار غیر بولین ۴۰۰", async () => {
    const r = await setPrivacy(student, msA, {
      sharedPrograms: ["routine:Workout", "module:HACK", "evil", 42, "routine:", "routine:Workout", { a: 1 }, "module:EXERCISE"],
    });
    expect(r.status).toBe(200);
    expect((await j(r)).privacy.sharedPrograms).toEqual(["routine:Workout", "module:EXERCISE"]);
    expect((await setPrivacy(student, msA, { showSchedule: "yes" })).status).toBe(400);
    expect((await setPrivacy(student, msA, { sharedPrograms: "routine:Workout" })).status).toBe(400);
    // فیلد ناشناخته (status) نادیده گرفته می‌شود
    await setPrivacy(student, msA, { status: "ENDED", mentorId: "x" } as any);
    expect((await prisma.mentorship.findUnique({ where: { id: msA } }))!.status).toBe("ACTIVE");
  });
});

describe("حریم خصوصی — پروجکشن", () => {
  it("کلید تکی: فقط همان برنامه؛ اسم تسک مخفی → «مشغول»؛ پیشرفت دیده می‌شود", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: false, sharedPrograms: ["routine:Workout"], showTaskName: false, showProgress: true, showSchedule: true, showProgramName: true });
    const v = await viewJ(mA, student);
    expect(v.routine.slots).toHaveLength(1);
    const s = v.routine.slots[0];
    expect(s).toMatchObject({ jsDay: wd, time: "08:00", program: "Workout", title: "مشغول", details: null });
    expect(s.done).toEqual({ [today()]: true });
    const txt = JSON.stringify(v);
    expect(txt).not.toContain("اسکوات");
    expect(txt).not.toContain("ریاضی");
    expect(txt).not.toContain("Study");
    expect(txt).not.toContain("دکتر");
  });

  it("Select All: همه دیده می‌شوند؛ برنامه‌ی بی‌برچسب با اسم تسک مخفی → program null (اسم لو نمی‌رود)", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: true, sharedPrograms: [], showTaskName: false });
    const v = await viewJ(mA, student);
    expect(v.routine.slots).toHaveLength(3);
    const untagged = v.routine.slots.find((s: any) => s.time === "12:00");
    expect(untagged.program).toBeNull();
    expect(untagged.title).toBe("مشغول");
    expect(JSON.stringify(v)).not.toContain("دکتر");
    expect(v.modules.exercise).not.toBeNull();
    expect(v.modules.calorie).not.toBeNull();
  });

  it("showTaskName=true → اسم‌ها دیده می‌شوند؛ showTaskDetails → importance", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: true, showTaskName: true, showTaskDetails: true });
    const v = await viewJ(mA, student);
    const w = v.routine.slots.find((s: any) => s.time === "08:00");
    expect(w.title).toBe("اسکوات سنگین");
    expect(w.details).toEqual({ importance: "high" });
    const u = v.routine.slots.find((s: any) => s.time === "12:00");
    expect(u.program).toBe("نوبت دکتر محرمانه");
  });

  it("showProgramName=false → program null", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: true, showProgramName: false, showTaskName: true });
    const v = await viewJ(mA, student);
    expect(v.routine.slots.every((s: any) => s.program === null)).toBe(true);
    await setPrivacy(student, msA, { showProgramName: true });
  });

  it("showSchedule=false → هیچ اسلاتی", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: true, showSchedule: false });
    const v = await viewJ(mA, student);
    expect(v.routine).toEqual({ scheduleHidden: true, slots: [] });
    await setPrivacy(student, msA, { showSchedule: true });
  });

  it("showProgress=false → done null (و کالری/ورزش بدون progress)", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: true, showProgress: false });
    const v = await viewJ(mA, student);
    expect(v.routine.slots.length).toBe(3);
    expect(v.routine.slots.every((s: any) => s.done === null)).toBe(true);
    expect(v.modules.calorie.progress).toBeNull();
    await setPrivacy(student, msA, { showProgress: true });
  });

  it("ماژول فقط وقتی مشترک است", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: false, sharedPrograms: ["module:CALORIE"] });
    const v = await viewJ(mA, student);
    expect(v.modules.exercise).toBeNull();
    expect(v.modules.calorie).not.toBeNull();
    expect(v.routine.slots).toEqual([]);
  });

  it("تنظیمات منتور A روی منتور B اثری ندارد", async () => {
    await setPrivacy(student, msA, { shareAllPrograms: true, showTaskName: true });
    const vb = await viewJ(mB, student);
    expect(vb.routine.slots).toEqual([]);
    expect(vb.modules).toEqual({ exercise: null, calorie: null });
    expect(JSON.stringify(vb)).not.toContain("اسکوات");
    // و برعکس
    await setPrivacy(student, msB, { sharedPrograms: ["routine:Study"], showTaskName: true });
    const va = await viewJ(mA, student);
    expect(va.routine.slots).toHaveLength(3);
    const vb2 = await viewJ(mB, student);
    expect(vb2.routine.slots.map((s: any) => s.title)).toEqual(["حل تمرین ریاضی"]);
  });

  it("آینه‌ی برنامه‌ی منتور A در روتین شاگرد، حتی با Select All، برای منتور B دیده نمی‌شود؛ برنامه‌های A در لیست B نیستند", async () => {
    const pid = await activeProgram(mA, student, msA, { title: "برنامه‌ی سری A", items: [{ title: "تمرین سری A", repeat: "DAILY" }] });
    await setPrivacy(student, msB, { shareAllPrograms: true, showTaskName: true, showProgramName: true });
    const vb = await viewJ(mB, student);
    const txt = JSON.stringify(vb);
    expect(txt).not.toContain("سری A");
    expect(vb.programs).toEqual([]);
    // A برنامه‌ی خودش را می‌بیند
    const va = await viewJ(mA, student);
    expect(va.programs.map((p: any) => p.id)).toContain(pid);
    // و در لیست scopeهای شاگرد نیست
    as(student);
    const g = await j(await getPrivacy(req("GET", "/x"), { params: { id: msB } }));
    expect(g.scopes.map((s: any) => s.key)).not.toContain("routine:برنامه‌ی سری A");
  });

  it("رابطه‌ی پایان‌یافته یا منتور تعلیق‌شده → ۴۰۴", async () => {
    const s2 = await makeUser();
    const m2 = await makeMentor();
    const ms2 = await connect(s2, m2);
    await setPrivacy(s2, ms2, { shareAllPrograms: true });
    expect((await view(m2, s2)).status).toBe(200);
    await prisma.mentorProfile.update({ where: { userId: m2 }, data: { suspendedAt: new Date() } });
    expect((await view(m2, s2)).status).toBe(404);
    await prisma.mentorProfile.update({ where: { userId: m2 }, data: { suspendedAt: null } });
    expect((await view(m2, s2)).status).toBe(200);
    await prisma.mentorship.update({ where: { id: ms2 }, data: { status: "ENDED" } });
    expect((await view(m2, s2)).status).toBe(404);
  });
});
