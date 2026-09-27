import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { prisma } from "@/lib/prisma";
import { GET as discover } from "@/app/api/mentors/route";
import { GET as mentorPage } from "@/app/api/mentors/[mentorId]/route";
import { POST as postMentorship, GET as listMentorships } from "@/app/api/mentorships/route";
import { PATCH as patchMentorship } from "@/app/api/mentorships/[id]/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/mentorships/[id]/messages/route";
import { GET as getPrivacy } from "@/app/api/mentorships/[id]/privacy/route";
import { GET as dashboard } from "@/app/api/mentor/dashboard/route";
import { GET as studentView } from "@/app/api/mentor/students/[studentId]/route";
import { GET as listPrograms, POST as postProgram } from "@/app/api/mentor-programs/route";
import { GET as getProgram, PUT as putProgram, DELETE as deleteProgram } from "@/app/api/mentor-programs/[id]/route";
import { POST as postTransition } from "@/app/api/mentor-programs/[id]/transition/route";
import { POST as postLog } from "@/app/api/mentor-programs/[id]/logs/route";
import { POST as postFeedback } from "@/app/api/mentor-programs/[id]/feedback/route";
import { POST as readFeedback } from "@/app/api/mentor-programs/[id]/feedback/read/route";
import { GET as getNotifs } from "@/app/api/notifications/route";
import { POST as uploadDoc } from "@/app/api/mentors/me/documents/route";
import { GET as ownerDoc } from "@/app/api/mentors/me/documents/[docId]/route";
import { GET as adminDoc } from "@/app/api/admin/mentors/documents/[docId]/route";
import { POST as verify } from "@/app/api/admin/mentors/[profileId]/verification/route";
import {
  as,
  req,
  j,
  formReq,
  fileForm,
  pdfBytes,
  makeUser,
  makeMentor,
  makeMentorProfile,
  cleanupUsers,
  connect,
  activeProgram,
  createProgramId,
  setPrivacy,
  setOccurrences,
  setDailyEntry,
  readOccurrences,
  uniqueTag,
  today,
  jsDayOf,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const P = (id: string) => ({ params: { id } });

describe("سناریو ۱ — مسیرِ کاملِ منتور/شاگرد با برنامه‌ی تمرینی", () => {
  it("ثبت‌نام → کشف → درخواست → قبول → اجازه → برنامه‌ی WORKOUT → قبول → اجرا → پایشِ منتور → فیدبک → اعلانِ شاگرد", async () => {
    const tag = uniqueTag();
    // «ثبت‌نام» دو کاربر؛ یکی پروفایلِ منتوری می‌سازد
    const mentor = await makeUser({ username: `${tag}coach`.slice(0, 20), name: "مربی", lastName: "سناریو" });
    const student = await makeUser({ username: `${tag}st`.slice(0, 20), name: "شاگرد" });
    await makeMentorProfile(mentor, { headline: `مربی ${tag}`, bio: "بیو", categories: ["FITNESS"], published: true });

    // کشف با q
    as(student);
    const found = await j(await discover(req("GET", `/api/mentors?q=${tag}coach`)));
    expect(found.mentors).toHaveLength(1);
    expect(found.mentors[0].userId).toBe(mentor);
    expect(found.mentors[0].name).toBe("مربی سناریو");

    // درخواست
    const r = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, message: "می‌خوام قوی بشم" }));
    expect(r.status).toBe(200);
    const msId = (await j(r)).mentorship.id;
    as(student);
    expect((await j(await mentorPage(req("GET", "/x"), { params: { mentorId: mentor } }))).myMentorship).toMatchObject({ id: msId, status: "PENDING" });

    // منتور درخواست را در داشبورد می‌بیند و قبول می‌کند
    as(mentor);
    let dash = await j(await dashboard());
    expect(dash.requests.map((x: any) => x.id)).toEqual([msId]);
    expect(dash.stats.pendingRequests).toBe(1);
    as(mentor);
    expect((await patchMentorship(req("PATCH", "/x", { action: "accept" }), P(msId))).status).toBe(200);

    // شاگرد اجازه‌ی بدنسازی می‌دهد
    expect((await setPrivacy(student, msId, { sharedPrograms: ["module:EXERCISE"] })).status).toBe(200);
    as(mentor);
    const sv = await j(await studentView(req("GET", `/api/mentor/students/${student}`), { params: { studentId: student } }));
    expect(sv.modules.exercise).toEqual({ hasPlan: false });
    expect(sv.modules.calorie).toBeNull();

    // منتور برنامه‌ی WORKOUT می‌سازد و می‌فرستد
    as(mentor);
    const cr = await postProgram(
      req("POST", "/api/mentor-programs", {
        mentorshipId: msId,
        type: "WORKOUT",
        title: "هایپرتروفی",
        items: [
          { title: "پرس سینه", repeat: "DAILY", sets: 4, reps: "8-12", weightKg: 60, restSec: 90 },
          { title: "اسکوات", repeat: "DAILY", sets: 5, reps: "5", weightKg: 100 },
        ],
      })
    );
    expect(cr.status).toBe(200);
    const pid = (await j(cr)).program.id;
    as(mentor);
    expect((await postTransition(req("POST", "/x", { action: "send" }), P(pid))).status).toBe(200);

    // شاگرد اعلان می‌گیرد و قبول می‌کند
    as(student);
    let notifs = await j(await getNotifs(req("GET", "/api/notifications")));
    expect(notifs.notifications.some((n: any) => n.type === "program.new" && n.url === `/mentor-programs/${pid}`)).toBe(true);
    const acc = await postTransition(req("POST", "/x", { action: "accept" }), P(pid));
    expect((await j(acc)).program.status).toBe("ACTIVE");
    // WORKOUT در روتین آینه نمی‌شود
    expect((await readOccurrences(student)).some((o) => o.mentorProgramId === pid)).toBe(false);

    // اجرا
    as(student);
    const detail = await j(await getProgram(req("GET", "/x"), P(pid)));
    expect(detail.items.map((i: any) => [i.title, i.sets, i.reps, i.weightKg])).toEqual([
      ["پرس سینه", 4, "8-12", 60],
      ["اسکوات", 5, "5", 100],
    ]);
    for (const it of detail.items) {
      as(student);
      const lr = await postLog(req("POST", "/x", { itemId: it.id, date: today(), status: "COMPLETED", setsDone: it.sets }), P(pid));
      expect(lr.status).toBe(200);
    }

    // منتور تکمیل را در برنامه و داشبورد می‌بیند
    as(mentor);
    const mv = await j(await getProgram(req("GET", "/x"), P(pid)));
    expect(mv.logs).toHaveLength(2);
    expect(mv.logs.every((l: any) => l.status === "COMPLETED")).toBe(true);
    expect(mv.program.progress).toEqual({ completed: 2, partial: 0, missed: 0, rate: 100 });
    as(mentor);
    dash = await j(await dashboard());
    expect(dash.stats).toMatchObject({ students: 1, activeStudents: 1, pendingRequests: 0, activePrograms: 1 });
    expect(dash.completion).toEqual([expect.objectContaining({ studentId: student, completed: 2, rate: 100 })]);
    expect(dash.recentActivity.some((a: any) => a.type === "log" && a.text.includes("اسکوات"))).toBe(true);
    expect(dash.attention).toEqual([]);

    // فیدبک → اعلانِ شاگرد
    as(mentor);
    const fb = await postFeedback(req("POST", "/x", { body: "فرمِ اسکوات عالی بود", logId: mv.logs[0].id }), P(pid));
    expect(fb.status).toBe(200);
    as(student);
    notifs = await j(await getNotifs(req("GET", "/api/notifications")));
    const fbN = notifs.notifications.find((n: any) => n.type === "program.feedback");
    expect(fbN).toBeTruthy();
    expect(fbN.body).toContain("فرمِ اسکوات");
    expect(fbN.url).toBe(`/mentor-programs/${pid}`);
    as(student);
    expect((await j(await readFeedback(req("POST", "/x"), P(pid)))).count).toBe(1);

    // پایان: complete توسطِ منتور؛ شمارِ برنامه‌های تکمیل‌شده روی صفحه‌ی منتور
    as(mentor);
    expect((await postTransition(req("POST", "/x", { action: "complete" }), P(pid))).status).toBe(200);
    as(student);
    expect((await j(await mentorPage(req("GET", "/x"), { params: { mentorId: mentor } }))).mentor.completedPrograms).toBe(1);
  });
});

describe("سناریو ۲ — سه منتور با اجازه‌های متفاوت", () => {
  it("هر منتور فقط برنامه‌ی مجازِ خودش را می‌بیند؛ اسمِ بقیه در هیچ پاسخی نیست", async () => {
    const student = await makeUser({ name: "رها" });
    const A = await makeMentor({ name: "منتورالف" });
    const B = await makeMentor({ name: "منتورب" });
    const C = await makeMentor({ name: "منتورج" });
    const wd = jsDayOf(today());
    const WORKOUT_NAMES = ["ددلیفت‌سنگین", "پرس‌بالاسینه"];
    const STUDY_NAMES = ["کنکورشیمی", "مرورفیزیک"];
    const OTHER_NAMES = ["جلسه‌ی‌روانشناسی‌خصوصی"];
    await setOccurrences(student, [
      { id: "w1", name: WORKOUT_NAMES[0], jsDay: wd, time: "07:00", tag: "Workout" },
      { id: "w2", name: WORKOUT_NAMES[1], jsDay: (wd + 2) % 7, time: "07:00", tag: "Workout" },
      { id: "s1", name: STUDY_NAMES[0], jsDay: wd, time: "16:00", tag: "Study" },
      { id: "s2", name: STUDY_NAMES[1], jsDay: (wd + 1) % 7, time: "16:00", tag: "Study" },
      { id: "o1", name: OTHER_NAMES[0], jsDay: wd, time: "20:00", tag: "Private" },
    ]);
    await setDailyEntry(student, today(), { w1: true, s1: true, o1: true });

    const msA = await connect(student, A);
    const msB = await connect(student, B);
    const msC = await connect(student, C);
    await setPrivacy(student, msA, { sharedPrograms: ["routine:Workout"], showTaskName: true });
    await setPrivacy(student, msB, { sharedPrograms: ["routine:Study"], showTaskName: true });
    await setPrivacy(student, msC, { showTaskName: true });
    // هر منتور یک برنامه‌ی ROUTINEِ خودش هم دارد که در روتینِ شاگرد آینه می‌شود
    await activeProgram(A, student, msA, { title: "برنامه‌ی‌مخفی‌الف", items: [{ title: "تسک‌مخفی‌الف", repeat: "DAILY" }] });
    await activeProgram(B, student, msB, { title: "برنامه‌ی‌مخفی‌ب", items: [{ title: "تسک‌مخفی‌ب", repeat: "DAILY" }] });

    async function everything(mentor: string): Promise<string> {
      const out: unknown[] = [];
      as(mentor);
      out.push(await j(await studentView(req("GET", `/api/mentor/students/${student}`), { params: { studentId: student } })));
      as(mentor);
      out.push(await j(await dashboard()));
      as(mentor);
      out.push(await j(await listPrograms(req("GET", "/api/mentor-programs?role=mentor"))));
      as(mentor);
      out.push(await j(await listMentorships(req("GET", "/api/mentorships?role=mentor"))));
      return JSON.stringify(out);
    }

    const a = await everything(A);
    const b = await everything(B);
    const c = await everything(C);

    for (const n of WORKOUT_NAMES) expect(a).toContain(n);
    expect(a).toContain("برنامه‌ی‌مخفی‌الف");
    for (const n of [...STUDY_NAMES, ...OTHER_NAMES, "Study", "Private", "مخفی‌ب"]) expect(a).not.toContain(n);

    for (const n of STUDY_NAMES) expect(b).toContain(n);
    expect(b).toContain("برنامه‌ی‌مخفی‌ب");
    for (const n of [...WORKOUT_NAMES, ...OTHER_NAMES, "Workout", "Private", "مخفی‌الف"]) expect(b).not.toContain(n);

    for (const n of [...WORKOUT_NAMES, ...STUDY_NAMES, ...OTHER_NAMES, "Workout", "Study", "Private", "مخفی‌الف", "مخفی‌ب"]) expect(c).not.toContain(n);

    // نام‌های منتورهای دیگر هم در پاسخ‌های هر منتور نیست
    expect(a).not.toMatch(/منتورب|منتورج/);
    expect(b).not.toMatch(/منتورالف|منتورج/);
    expect(c).not.toMatch(/منتورالف|منتورب/);

    // شکلِ اسلات‌ها
    as(A);
    const va = await j(await studentView(req("GET", `/api/mentor/students/${student}`), { params: { studentId: student } }));
    expect(va.routine.slots.map((s: any) => s.title).sort()).toEqual([...WORKOUT_NAMES].sort());
    expect(va.routine.slots.every((s: any) => s.program === "Workout")).toBe(true);
    as(C);
    const vc = await j(await studentView(req("GET", `/api/mentor/students/${student}`), { params: { studentId: student } }));
    expect(vc.routine.slots).toEqual([]);
  });
});

describe("سناریو ۳ — دست‌کاریِ idها توسطِ منتورِ مهاجم", () => {
  it("همه‌ی تلاش‌ها روی studentId/programId/mentorshipIdِ قربانی شکست می‌خورد", async () => {
    const victimMentor = await makeMentor();
    const victim = await makeUser({ name: "قربانی" });
    const vMs = await connect(victim, victimMentor);
    await setPrivacy(victim, vMs, { shareAllPrograms: true, showTaskName: true });
    await setOccurrences(victim, [{ id: "x", name: "راز", jsDay: 1, time: "09:00" }]);
    const vProg = await activeProgram(victimMentor, victim, vMs, { startDate: undefined, title: "برنامه قربانی" });
    as(victim);
    const vItem = (await j(await getProgram(req("GET", "/x"), P(vProg)))).items[0];
    as(victim);
    const vLog = (await j(await postLog(req("POST", "/x", { itemId: vItem.id, date: today(), status: "COMPLETED" }), P(vProg)))).log;
    const vDraft = await createProgramId(victimMentor, vMs, { title: "پیش‌نویس قربانی" });

    const attacker = await makeMentor();
    const accomplice = await makeUser();
    const aMs = await connect(accomplice, attacker);
    const aProg = await activeProgram(attacker, accomplice, aMs);
    as(accomplice);
    const aItem = (await j(await getProgram(req("GET", "/x"), P(aProg)))).items[0];

    const statuses: Record<string, number> = {};
    const run = async (name: string, f: () => Promise<Response>) => {
      as(attacker);
      const r = await f();
      statuses[name] = r.status;
      return r;
    };

    await run("studentView", () => studentView(req("GET", "/x"), { params: { studentId: victim } }));
    await run("createOnVictimMs", () => postProgram(req("POST", "/x", { mentorshipId: vMs, type: "ROUTINE", title: "x", items: [] })));
    await run("getProgram", () => getProgram(req("GET", "/x"), P(vProg)));
    await run("getDraft", () => getProgram(req("GET", "/x"), P(vDraft)));
    await run("putDraft", () => putProgram(req("PUT", "/x", { title: "x", items: [] }), P(vDraft)));
    await run("deleteDraft", () => deleteProgram(req("DELETE", "/x"), P(vDraft)));
    for (const action of ["send", "cancel", "complete", "activate"]) {
      await run(`transition:${action}`, () => postTransition(req("POST", "/x", { action }), P(action === "send" ? vDraft : vProg)));
    }
    await run("feedback", () => postFeedback(req("POST", "/x", { body: "x" }), P(vProg)));
    await run("feedbackForeignLog", () => postFeedback(req("POST", "/x", { body: "x", logId: vLog.id }), P(aProg)));
    await run("feedbackForeignItem", () => postFeedback(req("POST", "/x", { body: "x", itemId: vItem.id }), P(aProg)));
    await run("feedbackRead", () => readFeedback(req("POST", "/x"), P(vProg)));
    await run("log", () => postLog(req("POST", "/x", { itemId: vItem.id, date: today(), status: "MISSED" }), P(vProg)));
    await run("messagesGet", () => getMessages(req("GET", "/x"), P(vMs)));
    await run("messagesPost", () => postMessage(req("POST", "/x", { body: "x" }), P(vMs)));
    await run("privacyGet", () => getPrivacy(req("GET", "/x"), P(vMs)));
    for (const action of ["end", "block", "accept", "reject", "cancel", "unblock"]) {
      await run(`mentorship:${action}`, () => patchMentorship(req("PATCH", "/x", { action }), P(vMs)));
    }

    for (const [k, v] of Object.entries(statuses)) expect([k, v]).toEqual([k, 404]);

    // شاگردِ همدست هم با itemIdِ قربانی روی برنامه‌ی خودش لاگ نمی‌تواند بزند
    as(accomplice);
    expect((await postLog(req("POST", "/x", { itemId: vItem.id, date: today(), status: "COMPLETED" }), P(aProg))).status).toBe(404);
    as(accomplice);
    expect((await getProgram(req("GET", "/x"), P(vProg))).status).toBe(404);

    // فیلترِ mentorshipIdِ قربانی در لیست → خالی
    as(attacker);
    expect((await j(await listPrograms(req("GET", `/api/mentor-programs?role=mentor&mentorshipId=${vMs}`)))).programs).toEqual([]);
    as(attacker);
    expect((await j(await listPrograms(req("GET", `/api/mentor-programs?role=student&mentorshipId=${vMs}`)))).programs).toEqual([]);

    // ویرایشِ پیش‌نویسِ خودِ مهاجم با studentId/mentorshipIdِ قربانی در بدنه بی‌اثر است
    const aDraft = await createProgramId(attacker, aMs);
    as(attacker);
    const pu = await putProgram(req("PUT", "/x", { title: "y", items: [{ title: "z", repeat: "DAILY" }], studentId: victim, mentorshipId: vMs, mentorId: victimMentor }), P(aDraft));
    expect(pu.status).toBe(200);
    const row = await prisma.mentorProgram.findUnique({ where: { id: aDraft } });
    expect([row!.studentId, row!.mentorshipId, row!.mentorId]).toEqual([accomplice, aMs, attacker]);

    // هیچ‌چیز از قربانی تغییر نکرد
    expect((await prisma.mentorship.findUnique({ where: { id: vMs } }))!.status).toBe("ACTIVE");
    expect((await prisma.mentorProgram.findUnique({ where: { id: vProg } }))!.status).toBe("ACTIVE");
    expect((await prisma.mentorProgram.findUnique({ where: { id: vDraft } }))!.status).toBe("DRAFT");
    expect(await prisma.mentorFeedback.count({ where: { studentId: victim } })).toBe(0);
    expect(await prisma.mentorMessage.count({ where: { mentorshipId: vMs } })).toBe(0);
  });
});

describe("سناریو ۴ — تأییدِ مدرک توسطِ ادمین", () => {
  it("مدرک تأیید → نشانِ تأیید روی کارتِ کشف؛ کاربرانِ عادی به فایل دسترسی ندارند", async () => {
    const tag = uniqueTag();
    const mentor = await makeMentor({ username: `${tag}cert`.slice(0, 20) }, { headline: "مربی", bio: "بیو", categories: ["FITNESS"], published: true });
    as(mentor);
    const up = await uploadDoc(formReq("/api/mentors/me/documents", fileForm(pdfBytes(500), "مدرک.pdf", "CERTIFICATE", "FITNESS")));
    expect(up.status).toBe(200);
    const docId = (await j(up)).document.id;
    const profileId = (await prisma.mentorProfile.findUnique({ where: { userId: mentor } }))!.id;

    const user = await makeUser();
    as(user);
    let card = (await j(await discover(req("GET", `/api/mentors?q=${tag}cert`)))).mentors[0];
    expect(card.certifications).toEqual([{ category: "FITNESS", verified: false }]);

    const admin = await makeUser({ adminPermissions: ["mentors"] });
    as(admin);
    const v = await verify(req("POST", "/x", { kind: "CERTIFICATE", category: "FITNESS", status: "VERIFIED" }) as any, { params: { profileId } });
    expect(v.status).toBe(200);

    as(user);
    card = (await j(await discover(req("GET", `/api/mentors?q=${tag}cert`)))).mentors[0];
    expect(card.certifications).toEqual([{ category: "FITNESS", verified: true }]);
    expect(JSON.stringify(card)).not.toContain(docId);

    // کاربرِ عادی: روتِ صاحب ۴۰۴، روتِ ادمین ۴۰۱؛ منتورِ دیگر هم همین
    as(user);
    expect((await ownerDoc(req("GET", "/x"), { params: { docId } })).status).toBe(404);
    as(user);
    expect((await adminDoc(req("GET", "/x") as any, { params: { docId } })).status).toBe(401);
    const otherMentor = await makeMentor();
    as(otherMentor);
    expect((await ownerDoc(req("GET", "/x"), { params: { docId } })).status).toBe(404);
    // خودِ منتور به فایل دسترسی دارد
    as(mentor);
    const own = await ownerDoc(req("GET", "/x"), { params: { docId } });
    expect(own.status).toBe(200);
    expect(own.headers.get("content-type")).toBe("application/pdf");

    // منتور اعلانِ نتیجه را گرفت
    as(mentor);
    const n = await j(await getNotifs(req("GET", "/api/notifications")));
    expect(n.notifications.some((x: any) => x.type === "verification.result" && x.url === "/mentor/profile")).toBe(true);
  });
});
