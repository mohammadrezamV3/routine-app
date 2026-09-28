import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";
import { prisma } from "@/lib/prisma";
import { GET as listTemplates, POST as postTemplate } from "@/app/api/mentor/templates/route";
import { GET as getTemplate, PATCH as patchTemplate, DELETE as deleteTemplate } from "@/app/api/mentor/templates/[id]/route";
import { GET as listReplies, POST as postReply } from "@/app/api/mentor/replies/route";
import { PATCH as patchReply, DELETE as deleteReply } from "@/app/api/mentor/replies/[id]/route";
import { GET as getAlerts, PUT as putAlerts } from "@/app/api/mentor/alerts/route";
import { GET as getReport } from "@/app/api/mentor/reports/route";
import { GET as getExport } from "@/app/api/mentor/export/route";
import { POST as postDuplicate } from "@/app/api/mentor-programs/[id]/duplicate/route";
import { POST as postProgram } from "@/app/api/mentor-programs/route";
import { activateDueForUser, scheduleState } from "@/lib/mentorSchedule";
import { runAdherenceAlerts, csvCell } from "@/lib/mentorReports";
import { rollupDays, doneStreak, idleRun, topMissedItems, isoRange, type SchedProgram } from "@/lib/mentorAdherence";
import { nextPeriodStart, rangeDuration, shiftedRange } from "@/lib/mentorProgramCopy";
import { dateFromIso } from "@/lib/mentorServer";
import {
  as, req, j, makeUser, makeMentor, cleanupUsers, connect, createProgramId, activeProgram, transition, setPrivacy,
  today, dayOffset, jsDayOf,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const p = (id: string) => ({ params: { id } });

// ───────────────────────── توابعِ خالص ─────────────────────────

describe("mentorProgramCopy", () => {
  it("shifts a range by the source duration", () => {
    expect(rangeDuration("2026-01-01", "2026-01-31")).toBe(30);
    expect(rangeDuration("2026-01-31", "2026-01-01")).toBeNull();
    expect(rangeDuration(null, "2026-01-01")).toBeNull();
    expect(shiftedRange(30, "2026-03-10")).toEqual({ startDate: "2026-03-10", endDate: "2026-04-09" });
    expect(shiftedRange(null, "2026-03-10")).toEqual({ startDate: "2026-03-10", endDate: null });
    expect(shiftedRange(30, null)).toEqual({ startDate: null, endDate: null });
  });

  it("next period starts the day after the source end, never in the past", () => {
    expect(nextPeriodStart("2026-05-10", "2026-05-01")).toBe("2026-05-11");
    expect(nextPeriodStart("2026-04-10", "2026-05-01")).toBe("2026-05-01");
    expect(nextPeriodStart(null, "2026-05-01")).toBe("2026-05-01");
  });
});

describe("mentorAdherence", () => {
  // دوشنبه ۲۰۲۶-۰۹-۲۱ تا یکشنبه ۲۰۲۶-۰۹-۲۷؛ امروز = ۲۷
  const dates = isoRange("2026-09-21", "2026-09-27");
  const prog: SchedProgram = { id: "p", fromIso: "2026-09-21", toIso: null, items: [{ id: "a", title: "الف", days: [0, 1, 2, 3, 4, 5, 6] }, { id: "b", title: "ب", days: [1, 3] }] };

  it("counts scheduled/completed/missed/unlogged and ignores today's pending items", () => {
    const logs = [
      { itemId: "a", date: "2026-09-21", status: "COMPLETED" as const },
      { itemId: "b", date: "2026-09-21", status: "COMPLETED" as const },
      { itemId: "a", date: "2026-09-22", status: "PARTIAL" as const },
      { itemId: "a", date: "2026-09-23", status: "MISSED" as const },
    ];
    const days = rollupDays([prog], logs, dates, "2026-09-27");
    const d21 = days[0];
    expect(d21).toMatchObject({ scheduled: 2, completed: 2 });
    expect(days[2]).toMatchObject({ scheduled: 2, missed: 1, unlogged: 1 }); // چهارشنبه: a=MISSED، b ثبت‌نشده
    expect(days[6]).toMatchObject({ scheduled: 0 }); // امروز، هنوز ثبتی نیست
    expect(topMissedItems([prog], logs, dates, "2026-09-27")[0]).toEqual({ title: "الف", count: 4 });
  });

  it("streak counts full days back from today and idle run counts days without any done item", () => {
    const logs = ["2026-09-24", "2026-09-25", "2026-09-26"].map((d) => ({ itemId: "a", date: d, status: "COMPLETED" as const }));
    const days = rollupDays([prog], logs, dates, "2026-09-27");
    expect(doneStreak(days, "2026-09-27")).toBe(3);
    expect(idleRun(days, "2026-09-27").days).toBe(0);

    const idle = rollupDays([prog], [{ itemId: "a", date: "2026-09-22", status: "COMPLETED" }], dates, "2026-09-27");
    expect(idleRun(idle, "2026-09-27")).toEqual({ days: 4, since: "2026-09-23" });
  });

  it("days outside the program window are not scheduled", () => {
    const closed: SchedProgram = { ...prog, fromIso: "2026-09-24", toIso: "2026-09-25" };
    const days = rollupDays([closed], [], dates, "2026-09-27");
    expect(days.filter((d) => d.scheduled > 0).map((d) => d.date)).toEqual(["2026-09-24", "2026-09-25"]);
  });
});

describe("csvCell", () => {
  it("quotes and neutralizes formulas", () => {
    expect(csvCell("ساده")).toBe("ساده");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });
});

describe("scheduleState", () => {
  it("marks accepted programs with a future start as scheduled", () => {
    expect(scheduleState({ status: "ACCEPTED", startDate: "2026-10-01" }, "2026-09-27")).toBe("scheduled");
    expect(scheduleState({ status: "ACCEPTED", startDate: "2026-09-27" }, "2026-09-27")).toBe("due");
    expect(scheduleState({ status: "ACTIVE", startDate: "2026-10-01" }, "2026-09-27")).toBeNull();
  });
});

// ───────────────────────── روت‌ها ─────────────────────────

async function setup() {
  const mentor = await makeMentor();
  const other = await makeMentor();
  const s1 = await makeUser();
  const s2 = await makeUser();
  const rel1 = await connect(s1, mentor);
  const rel2 = await connect(s2, mentor);
  return { mentor, other, s1, s2, rel1, rel2 };
}

describe("program templates", () => {
  it("creates from a program and from editor content, lists, renames, deletes; other mentors get 404", async () => {
    const { mentor, other, rel1 } = await setup();
    const pid = await createProgramId(mentor, rel1, { startDate: dayOffset(1), endDate: dayOffset(29), note: "یادداشت" });

    as(mentor);
    let r = await postTemplate(req("POST", "/api/mentor/templates", { name: "  قالب   یک ", programId: pid }));
    expect(r.status).toBe(200);
    const t1 = (await j(r)).template;
    expect(t1).toMatchObject({ name: "قالب یک", type: "ROUTINE", itemCount: 1, durationDays: 28, usedCount: 0 });

    r = await postTemplate(req("POST", "/api/mentor/templates", {
      name: "از ویرایشگر",
      program: { type: "WORKOUT", title: "حجم", items: [{ title: "اسکوات", repeat: "WEEKLY", days: [1, 3], sets: 4, reps: "8-10" }] },
    }));
    expect(r.status).toBe(200);
    const t2 = (await j(r)).template;
    expect(t2.durationDays).toBeNull();

    // اعتبارسنجی: بدونِ آیتم / بدونِ نام
    r = await postTemplate(req("POST", "/api/mentor/templates", { name: "خالی", program: { type: "ROUTINE", title: "x", items: [] } }));
    expect(r.status).toBe(400);
    r = await postTemplate(req("POST", "/api/mentor/templates", { name: " ", programId: pid }));
    expect(r.status).toBe(400);

    const list = (await j(await listTemplates())).templates;
    expect(list.map((t: any) => t.id).sort()).toEqual([t1.id, t2.id].sort());

    const detail = (await j(await getTemplate(req("GET", `/api/mentor/templates/${t2.id}`), p(t2.id)))).template;
    expect(detail.items[0]).toMatchObject({ title: "اسکوات", sets: 4, reps: "8-10", days: [1, 3] });

    // منتورِ دیگر: نه برنامه‌ی من را قالب می‌کند، نه قالبِ من را می‌بیند/تغییر می‌دهد
    as(other);
    expect((await postTemplate(req("POST", "/api/mentor/templates", { name: "دزدی", programId: pid }))).status).toBe(404);
    expect((await getTemplate(req("GET", `/api/mentor/templates/${t1.id}`), p(t1.id))).status).toBe(404);
    expect((await patchTemplate(req("PATCH", `/api/mentor/templates/${t1.id}`, { name: "x" }), p(t1.id))).status).toBe(404);
    expect((await deleteTemplate(req("DELETE", `/api/mentor/templates/${t1.id}`), p(t1.id))).status).toBe(404);
    expect((await j(await listTemplates())).templates).toEqual([]);

    as(mentor);
    r = await patchTemplate(req("PATCH", `/api/mentor/templates/${t1.id}`, { name: "نام تازه" }), p(t1.id));
    expect((await j(r)).template.name).toBe("نام تازه");
    expect((await deleteTemplate(req("DELETE", `/api/mentor/templates/${t1.id}`), p(t1.id))).status).toBe(200);
    expect(await prisma.mentorProgram.count({ where: { id: pid } })).toBe(1);
  });

  it("creating a program with templateId bumps only my template's usage", async () => {
    const { mentor, other, rel1 } = await setup();
    as(mentor);
    const t = (await j(await postTemplate(req("POST", "/api/mentor/templates", {
      name: "روتین", program: { type: "ROUTINE", title: "روتین", items: [{ title: "مطالعه", repeat: "DAILY" }] },
    })))).template;
    const r = await postProgram(req("POST", "/api/mentor-programs", { mentorshipId: rel1, type: "ROUTINE", title: "از قالب", templateId: t.id, items: [{ title: "مطالعه", repeat: "DAILY" }] }));
    expect(r.status).toBe(200);
    const row = await prisma.mentorProgramTemplate.findUnique({ where: { id: t.id } });
    expect(row?.usedCount).toBe(1);
    expect(row?.lastUsedAt).not.toBeNull();

    // منتورِ دیگر با idِ قالبِ من آمارش را عوض نمی‌کند
    const s = await makeUser();
    const rel = await connect(s, other);
    as(other);
    await postProgram(req("POST", "/api/mentor-programs", { mentorshipId: rel, type: "ROUTINE", title: "x", templateId: t.id, items: [] }));
    expect((await prisma.mentorProgramTemplate.findUnique({ where: { id: t.id } }))?.usedCount).toBe(1);
  });
});

describe("saved replies", () => {
  it("CRUD with validation and ownership", async () => {
    const mentor = await makeMentor();
    const other = await makeMentor();
    const student = await makeUser();

    as(mentor);
    let r = await postReply(req("POST", "/api/mentor/replies", { title: "یادآوری", body: "ثبت روزانه یادت نرود" }));
    expect(r.status).toBe(200);
    const rep = (await j(r)).reply;
    expect((await postReply(req("POST", "/api/mentor/replies", { title: "", body: "x" }))).status).toBe(400);
    expect((await postReply(req("POST", "/api/mentor/replies", { title: "x".repeat(41), body: "x" }))).status).toBe(400);

    r = await patchReply(req("PATCH", `/api/mentor/replies/${rep.id}`, { body: "متن تازه" }), p(rep.id));
    expect((await j(r)).reply).toMatchObject({ title: "یادآوری", body: "متن تازه" });

    as(other);
    expect((await patchReply(req("PATCH", `/api/mentor/replies/${rep.id}`, { body: "x" }), p(rep.id))).status).toBe(404);
    expect((await deleteReply(req("DELETE", `/api/mentor/replies/${rep.id}`), p(rep.id))).status).toBe(404);
    expect((await j(await listReplies())).replies).toEqual([]);

    // کاربرِ بدونِ پروفایلِ منتوری
    as(student);
    expect((await listReplies()).status).toBe(403);

    as(mentor);
    expect((await j(await listReplies())).replies).toHaveLength(1);
    expect((await deleteReply(req("DELETE", `/api/mentor/replies/${rep.id}`), p(rep.id))).status).toBe(200);
  });
});

describe("duplicate program", () => {
  it("copies items to another student with a shifted date range; rejects foreign ids and past dates", async () => {
    const { mentor, other, s1, rel1, rel2 } = await setup();
    const src = await activeProgram(mentor, s1, rel1, {
      type: "WORKOUT", title: "حجم", note: "یادداشت", startDate: today(), endDate: dayOffset(27),
      items: [{ title: "اسکوات", repeat: "WEEKLY", days: [1, 3, 5], sets: 4, reps: "8-10", weightKg: 60 }],
    });

    as(mentor);
    const start = dayOffset(10);
    let r = await postDuplicate(req("POST", `/api/mentor-programs/${src}/duplicate`, { mentorshipId: rel2, startDate: start }), p(src));
    expect(r.status).toBe(200);
    const copy = (await j(r)).program;
    expect(copy).toMatchObject({ status: "DRAFT", title: "حجم", note: "یادداشت", startDate: start, endDate: dayOffset(37), mentorshipId: rel2 });
    const items = await prisma.mentorProgramItem.findMany({ where: { programId: copy.id } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "اسکوات", sets: 4, reps: "8-10", weightKg: 60, days: [1, 3, 5] });
    expect(await prisma.mentorProgramLog.count({ where: { programId: copy.id } })).toBe(0);

    // همان شاگرد، بدونِ تاریخ
    r = await postDuplicate(req("POST", `/api/mentor-programs/${src}/duplicate`, { mentorshipId: rel1 }), p(src));
    expect((await j(r)).program).toMatchObject({ startDate: null, endDate: null });

    expect((await postDuplicate(req("POST", `/api/mentor-programs/${src}/duplicate`, { mentorshipId: rel2, startDate: dayOffset(-3) }), p(src))).status).toBe(400);

    as(other);
    expect((await postDuplicate(req("POST", `/api/mentor-programs/${src}/duplicate`, { mentorshipId: rel2 }), p(src))).status).toBe(404);
    const s3 = await makeUser();
    const relOther = await connect(s3, other);
    as(mentor);
    expect((await postDuplicate(req("POST", `/api/mentor-programs/${src}/duplicate`, { mentorshipId: relOther }), p(src))).status).toBe(404);
  });

  it("refuses a type outside the target relationship's scope", async () => {
    const mentor = await makeMentor();
    const s1 = await makeUser();
    const s2 = await makeUser();
    const rel1 = await connect(s1, mentor);
    as(s2);
    const { POST: postMentorship } = await import("@/app/api/mentorships/route");
    const rr = await postMentorship(req("POST", "/api/mentorships", { acceptMentorTerms: MENTOR_TERMS_VERSION, mentorId: mentor, categories: ["ROUTINE"] }));
    const rel2 = (await j(rr)).mentorship.id;
    const { mentorshipAction } = await import("./helpers/mentorTestUtils");
    await mentorshipAction(mentor, rel2, "accept");
    const src = await createProgramId(mentor, rel1, { type: "WORKOUT", items: [{ title: "پرس", repeat: "DAILY" }] });
    as(mentor);
    expect((await postDuplicate(req("POST", `/api/mentor-programs/${src}/duplicate`, { mentorshipId: rel2 }), p(src))).status).toBe(400);
  });
});

describe("scheduled start", () => {
  it("an accepted future program activates lazily on its start day and notifies both sides", async () => {
    const mentor = await makeMentor();
    const student = await makeUser();
    const rel = await connect(student, mentor);
    const id = await createProgramId(mentor, rel, { startDate: dayOffset(3), endDate: dayOffset(20) });
    await transition(mentor, id, "send");
    const a = await transition(student, id, "accept");
    expect((await j(a)).program.status).toBe("ACCEPTED");
    expect(await activateDueForUser(student)).toEqual([]);

    // روزِ شروع رسید
    await prisma.mentorProgram.update({ where: { id }, data: { startDate: dateFromIso(today()) } });
    expect(await activateDueForUser(student)).toEqual([id]);
    expect((await prisma.mentorProgram.findUnique({ where: { id } }))?.status).toBe("ACTIVE");
    const notes = await prisma.inAppNotification.findMany({ where: { type: "program.started", url: `/mentor-programs/${id}` } });
    expect(notes.map((n) => n.userId).sort()).toEqual([mentor, student].sort());
    // تکرار بی‌اثر است
    expect(await activateDueForUser(mentor)).toEqual([]);
  });
});

/** برنامه‌ی فعالِ روزانه که از n روز پیش شروع شده، با لاگ‌های دستی برای روزهای داده‌شده */
async function backdatedProgram(mentor: string, student: string, rel: string, startedDaysAgo: number, done: number[]) {
  const id = await activeProgram(mentor, student, rel, { items: [{ title: "مطالعه", repeat: "DAILY" }] });
  const start = dayOffset(-startedDaysAgo);
  await prisma.mentorProgram.update({ where: { id }, data: { startDate: dateFromIso(start), activatedAt: new Date(Date.now() - startedDaysAgo * 86_400_000) } });
  const item = await prisma.mentorProgramItem.findFirstOrThrow({ where: { programId: id } });
  for (const off of done) {
    await prisma.mentorProgramLog.create({ data: { programId: id, itemId: item.id, studentId: student, date: dateFromIso(dayOffset(-off)), status: "COMPLETED" } });
  }
  return id;
}

describe("adherence alerts", () => {
  it("settings validate the threshold", async () => {
    const mentor = await makeMentor();
    as(mentor);
    expect((await j(await getAlerts())).alertMissedDays).toBeNull();
    expect((await putAlerts(req("PUT", "/api/mentor/alerts", { alertMissedDays: 1 }))).status).toBe(400);
    expect((await putAlerts(req("PUT", "/api/mentor/alerts", { alertMissedDays: 15 }))).status).toBe(400);
    expect((await j(await putAlerts(req("PUT", "/api/mentor/alerts", { alertMissedDays: "۳" })))).alertMissedDays).toBe(3);
    expect((await j(await putAlerts(req("PUT", "/api/mentor/alerts", { alertMissedDays: null })))).alertMissedDays).toBeNull();
  });

  it("notifies once per idle run and never for a student who hides progress", async () => {
    const mentor = await makeMentor();
    const idle = await makeUser({ name: "بی‌کار" });
    const busy = await makeUser({ name: "منظم" });
    const hidden = await makeUser({ name: "مخفی" });
    const relIdle = await connect(idle, mentor);
    const relBusy = await connect(busy, mentor);
    const relHidden = await connect(hidden, mentor);
    await backdatedProgram(mentor, idle, relIdle, 6, [6, 5]); // ۴ روزِ آخر (تا دیروز) بی‌کار
    await backdatedProgram(mentor, busy, relBusy, 6, [6, 5, 4, 3, 2, 1]);
    await backdatedProgram(mentor, hidden, relHidden, 6, []);
    await setPrivacy(hidden, relHidden, { showProgress: false });

    // خاموش → هیچ
    expect(await runAdherenceAlerts(mentor)).toBe(0);

    as(mentor);
    await putAlerts(req("PUT", "/api/mentor/alerts", { alertMissedDays: 3 }));
    expect(await runAdherenceAlerts(mentor)).toBe(1);
    const notes = await prisma.inAppNotification.findMany({ where: { userId: mentor, type: "mentor.adherence" } });
    expect(notes).toHaveLength(1);
    expect(notes[0].url).toBe(`/mentor/students/${idle}`);
    // همان روز و همان دوره: دوباره نه
    expect(await runAdherenceAlerts(mentor)).toBe(0);
    expect(await prisma.mentorAdherenceAlert.count({ where: { mentorshipId: relIdle } })).toBe(1);
  });
});

describe("weekly report and export", () => {
  it("summarizes each active student and exports CSV within privacy", async () => {
    const mentor = await makeMentor();
    const other = await makeMentor();
    const s = await makeUser({ name: "گزارش" });
    const hidden = await makeUser({ name: "پنهان" });
    const rel = await connect(s, mentor);
    const relHidden = await connect(hidden, mentor);
    const pid = await backdatedProgram(mentor, s, rel, 6, [3, 2, 1]);
    await backdatedProgram(mentor, hidden, relHidden, 6, [1]);
    await setPrivacy(hidden, relHidden, { showProgress: false });

    as(mentor);
    const rep = await j(await getReport(req("GET", "/api/mentor/reports?offset=0")));
    const row = rep.students.find((x: any) => x.studentId === s);
    expect(row).toMatchObject({ progressHidden: false, completed: 3, streak: 3, idleDays: 0, activePrograms: 1 });
    expect(row.missed + row.unlogged).toBe(3); // روزهای ۶، ۵ و ۴ روز پیش
    expect(row.rate).toBe(50);
    expect(row.lastDoneDate).toBe(dayOffset(-1));
    const hid = rep.students.find((x: any) => x.studentId === hidden);
    expect(hid).toMatchObject({ progressHidden: true, scheduled: 0 });

    let r = await getExport(req("GET", `/api/mentor/export?studentId=${s}`));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/csv");
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]); // BOM برای اکسل
    const csv = new TextDecoder().decode(bytes);
    expect(csv).toContain("تاریخ,منبع,برنامه,آیتم");
    expect(csv).toContain(`${dayOffset(-1)},برنامه‌ی منتور,برنامه تست,مطالعه,انجام شد`);
    expect(csv.split("\r\n").filter((l) => l.includes("برنامه‌ی منتور"))).toHaveLength(6);

    expect((await getExport(req("GET", `/api/mentor/export?studentId=${hidden}`))).status).toBe(403);
    expect((await getExport(req("GET", `/api/mentor/export?studentId=${s}&from=2026-01-01&to=2026-12-31`))).status).toBe(400);

    as(other);
    expect((await getExport(req("GET", `/api/mentor/export?studentId=${s}`))).status).toBe(404);
    expect((await j(await getReport(req("GET", "/api/mentor/reports")))).students).toEqual([]);
    void pid;
    void jsDayOf;
  });
});
