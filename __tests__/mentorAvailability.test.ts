import { describe, it, expect, afterAll, vi } from "vitest";

// ── mockها: فقط نشست و پوش. گیت‌های واقعی (requireFeature/فلگ‌ها/مسدودی) اجرا می‌شوند.
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
import { GET as listMentorships, POST as postMentorship } from "@/app/api/mentorships/route";
import { GET as discover } from "@/app/api/mentors/route";
import { GET as mentorDetail } from "@/app/api/mentors/[mentorId]/route";
import { GET as getSettings, PUT as putSettings } from "@/app/api/mentor/settings/route";
import { GET as studentsIndex } from "@/app/api/mentor/students/route";
import { GET as listLabels, POST as postLabel } from "@/app/api/mentor/labels/route";
import { PATCH as patchLabel, DELETE as deleteLabel } from "@/app/api/mentor/labels/[labelId]/route";
import { PUT as putStudentLabels } from "@/app/api/mentor/students/[studentId]/labels/route";
import { GET as getNotes, POST as postNote } from "@/app/api/mentor/students/[studentId]/notes/route";
import { PATCH as patchNote, DELETE as deleteNote } from "@/app/api/mentor/students/[studentId]/notes/[noteId]/route";
import { POST as pause, DELETE as resume } from "@/app/api/mentor/students/[studentId]/pause/route";
import { GET as manage } from "@/app/api/mentor/students/[studentId]/manage/route";
import {
  computeAvailability,
  validateAwayUntil,
  validateCapacity,
  validateIntakeAnswers,
  validateIntakeQuestions,
} from "@/lib/mentorAvailability";
import { addDaysIso } from "@/lib/mentorServer";
import { as, req, j, makeUser, makeMentor, cleanupUsers, requestMentorship, mentorshipAction, connect, uniqueTag, today } from "./helpers/mentorTestUtils";
import { giveKey } from "./helpers/e2eeTestUtils";
import { openNote, sealNote } from "@/lib/e2ee/notes";

afterAll(async () => {
  await cleanupUsers();
});

async function settings(mentorId: string, body: Record<string, unknown>) {
  as(mentorId);
  return putSettings(req("PUT", "/api/mentor/settings", body));
}

async function invite(mentorId: string, studentId: string) {
  const u = await prisma.user.findUnique({ where: { id: studentId }, select: { username: true } });
  as(mentorId);
  return postMentorship(req("POST", "/api/mentorships", { studentUsername: u!.username }));
}

async function rowAs(userId: string, role: "student" | "mentor", id: string) {
  as(userId);
  const list = (await j(await listMentorships(req("GET", `/api/mentorships?role=${role}`)))).mentorships as any[];
  return list.find((r) => r.id === id);
}

describe("دسترس‌پذیری — منطق خالص", () => {
  const base = { acceptingStudents: true, maxActiveStudents: null, awayUntil: null, awayPausesRequests: true };

  it("وضعیت‌ها: باز، بسته، پر، عدم حضور (با/بدون توقف درخواست)", () => {
    expect(computeAvailability(base, 3, "2026-09-27").state).toBe("OPEN");
    expect(computeAvailability({ ...base, acceptingStudents: false }, 0, "2026-09-27").state).toBe("CLOSED");
    expect(computeAvailability({ ...base, maxActiveStudents: 3 }, 3, "2026-09-27")).toMatchObject({ state: "FULL", full: true });
    expect(computeAvailability({ ...base, maxActiveStudents: 3 }, 2, "2026-09-27").state).toBe("OPEN");
    const away = computeAvailability({ ...base, awayUntil: "2026-10-05" }, 0, "2026-09-27");
    expect(away).toMatchObject({ state: "AWAY", away: true, awayUntil: "2026-10-05" });
    expect(computeAvailability({ ...base, awayUntil: "2026-10-05", awayPausesRequests: false }, 0, "2026-09-27")).toMatchObject({ state: "OPEN", away: true });
    // خود روز بازگشت در دسترس است؛ تاریخ گذشته بی‌اثر
    expect(computeAvailability({ ...base, awayUntil: "2026-09-27" }, 0, "2026-09-27")).toMatchObject({ state: "OPEN", away: false, awayUntil: null });
    // بسته بودن بر عدم حضور مقدم است
    expect(computeAvailability({ ...base, acceptingStudents: false, awayUntil: "2026-10-05" }, 0, "2026-09-27").state).toBe("CLOSED");
  });

  it("اعتبارسنجی: سؤال‌ها، جواب‌ها، ظرفیت، تاریخ بازگشت", () => {
    expect(validateIntakeQuestions([" هدفت؟ ", "", "هدفت؟", "وقتت؟"])).toEqual({ ok: true, data: ["هدفت؟", "وقتت؟"] });
    expect(validateIntakeQuestions(["a", "b", "c", "d", "e", "f"]).ok).toBe(false);
    expect(validateIntakeQuestions(["x".repeat(201)]).ok).toBe(false);
    expect(validateIntakeAnswers([], undefined)).toEqual({ ok: true, data: null });
    expect(validateIntakeAnswers(["q1", "q2"], ["a"]).ok).toBe(false);
    expect(validateIntakeAnswers(["q1"], ["  "]).ok).toBe(false);
    expect(validateIntakeAnswers(["q1"], [" جواب "])).toEqual({ ok: true, data: [{ question: "q1", answer: "جواب" }] });
    expect(validateCapacity("۱۲")).toEqual({ ok: true, data: 12 });
    expect(validateCapacity(0).ok).toBe(false);
    expect(validateCapacity(null)).toEqual({ ok: true, data: null });
    expect(validateAwayUntil("2026-09-27", "2026-09-27").ok).toBe(false);
    expect(validateAwayUntil("2026-09-28", "2026-09-27").ok).toBe(true);
    expect(validateAwayUntil("2027-06-01", "2026-09-27").ok).toBe(false);
    expect(validateAwayUntil("2026-02-30", "2026-01-01").ok).toBe(false);
  });
});

describe("تنظیمات منتور — /api/mentor/settings", () => {
  it("بدون پروفایل ۴۰۳؛ ناشناس ۴۰۱", async () => {
    as(null);
    expect((await getSettings()).status).toBe(401);
    const u = await makeUser();
    as(u);
    expect((await getSettings()).status).toBe(403);
    expect((await settings(u, { acceptingStudents: false })).status).toBe(403);
  });

  it("به‌روزرسانی جزئی و اعتبارسنجی", async () => {
    const m = await makeMentor();
    let r = await settings(m, { maxActiveStudents: 5, responseTimeHours: 24, intakeQuestions: ["هدفت؟"], welcomeMessage: " خوش آمدی " });
    expect(r.status).toBe(200);
    let d = await j(r);
    expect(d.settings).toMatchObject({ maxActiveStudents: 5, responseTimeHours: 24, intakeQuestions: ["هدفت؟"], welcomeMessage: "خوش آمدی", acceptingStudents: true });
    expect(d.activeStudents).toBe(0);

    expect((await settings(m, { maxActiveStudents: 0 })).status).toBe(400);
    expect((await settings(m, { responseTimeHours: 5 })).status).toBe(400);
    expect((await settings(m, { awayUntil: today() })).status).toBe(400);
    expect((await settings(m, { welcomeMessage: "x".repeat(1001) })).status).toBe(400);
    expect((await settings(m, { acceptingStudents: "no" })).status).toBe(400);

    r = await settings(m, { awayUntil: addDaysIso(today(), 3), awayMessage: "سفرم" });
    d = await j(r);
    expect(d.settings.awayUntil).toBe(addDaysIso(today(), 3));
    expect(d.settings.awayMessage).toBe("سفرم");
    expect(d.availability.state).toBe("AWAY");

    // خاموش کردن عدم حضور پیامش را هم پاک می‌کند؛ بقیه دست نمی‌خورد
    d = await j(await settings(m, { awayUntil: null }));
    expect(d.settings).toMatchObject({ awayUntil: null, awayMessage: null, maxActiveStudents: 5 });
    const p = await prisma.mentorProfile.findUnique({ where: { userId: m }, select: { awayMessage: true, awayUntil: true } });
    expect(p).toEqual({ awayMessage: null, awayUntil: null });
  });
});

describe("پذیرش، ظرفیت و عدم حضور — اعمال سمت سرور", () => {
  it("پذیرش خاموش: درخواست شاگرد ۴۰۹ با پیام روشن؛ دعوت منتور مجاز", async () => {
    const m = await makeMentor();
    await settings(m, { acceptingStudents: false });
    const s = await makeUser();
    const r = await requestMentorship(s, m);
    expect(r.status).toBe(409);
    expect((await j(r)).error).toContain("شاگرد جدید نمی‌پذیرد");
    expect((await invite(m, s)).status).toBe(200);
  });

  it("ظرفیت: پر بودن درخواست را می‌بندد، پذیرش درخواست قدیمی را هم؛ دعوت منتور نه", async () => {
    const tag = uniqueTag();
    const m = await makeMentor({ username: `${tag}m`.slice(0, 20) });
    const s1 = await makeUser();
    const s2 = await makeUser();
    const s3 = await makeUser();
    // s2 پیش از پر شدن درخواست داده
    const pending = (await j(await requestMentorship(s2, m))).mentorship.id;
    await settings(m, { maxActiveStudents: 1 });
    await connect(s1, m);

    const r = await requestMentorship(s3, m);
    expect(r.status).toBe(409);
    expect((await j(r)).error).toContain("ظرفیت");
    const acc = await mentorshipAction(m, pending, "accept");
    expect(acc.status).toBe(409);
    expect((await j(acc)).error).toContain("ظرفیت");

    // کارت کشف «FULL» است
    as(s3);
    const card = (await j(await discover(req("GET", `/api/mentors?q=${tag}`)))).mentors.find((c: any) => c.userId === m);
    expect(card.availability).toBe("FULL");

    // دعوت خود منتور و پذیرش آن توسط شاگرد مجاز است
    const inv = await invite(m, s3);
    expect(inv.status).toBe(200);
    expect((await mentorshipAction(s3, (await j(inv)).mentorship.id, "accept")).status).toBe(200);

    as(m);
    const st = await j(await getSettings());
    expect(st.activeStudents).toBe(2);
    expect(st.availability.full).toBe(true);
  });

  it("عدم حضور: با توقف درخواست ۴۰۹، بدون توقف مجاز؛ شاگرد تاریخ و پیام را می‌بیند", async () => {
    const m = await makeMentor();
    const until = addDaysIso(today(), 4);
    await settings(m, { awayUntil: until, awayMessage: "در سفرم" });
    const s = await makeUser();
    const r = await requestMentorship(s, m);
    expect(r.status).toBe(409);
    expect((await j(r)).error).toContain("در دسترس نیست");

    await settings(m, { awayPausesRequests: false });
    const ok = await requestMentorship(s, m);
    expect(ok.status).toBe(200);
    const row = await rowAs(s, "student", (await j(ok)).mentorship.id);
    expect(row.mentorAway).toEqual({ until, message: "در سفرم" });

    as(s);
    const detail = await j(await mentorDetail(req("GET", `/api/mentors/${m}`), { params: { mentorId: m } }));
    expect(detail.mentor).toMatchObject({ availability: "OPEN", awayUntil: until, awayMessage: "در سفرم" });
  });
});

describe("سؤال‌های پذیرش", () => {
  it("جواب لازم است، snapshot ذخیره می‌شود و با درخواست دوباره جایگزین می‌شود", async () => {
    const m = await makeMentor();
    await settings(m, { intakeQuestions: ["هدفت؟", "وقتت؟"] });
    const s = await makeUser();

    as(s);
    expect((await postMentorship(req("POST", "/api/mentorships", { acceptMentorTerms: MENTOR_TERMS_VERSION, mentorId: m }))).status).toBe(400);
    expect((await postMentorship(req("POST", "/api/mentorships", { acceptMentorTerms: MENTOR_TERMS_VERSION, mentorId: m, intakeAnswers: ["کنکور", ""] }))).status).toBe(400);
    const r = await postMentorship(req("POST", "/api/mentorships", { acceptMentorTerms: MENTOR_TERMS_VERSION, mentorId: m, intakeAnswers: ["کنکور", "۵ ساعت"] }));
    expect(r.status).toBe(200);
    const id = (await j(r)).mentorship.id;

    // منتور سؤال را عوض می‌کند؛ جواب قبلی با متن سؤال قبلی می‌ماند
    await settings(m, { intakeQuestions: ["سؤال تازه"] });
    const mRow = await rowAs(m, "mentor", id);
    expect(mRow.intakeAnswers).toEqual([{ question: "هدفت؟", answer: "کنکور" }, { question: "وقتت؟", answer: "۵ ساعت" }]);

    // رد + گذشت مهلت + درخواست دوباره → جواب‌ها جایگزین
    await mentorshipAction(m, id, "reject");
    await prisma.mentorship.update({ where: { id }, data: { updatedAt: new Date(Date.now() - 8 * 86_400_000) } });
    as(s);
    const again = await postMentorship(req("POST", "/api/mentorships", { acceptMentorTerms: MENTOR_TERMS_VERSION, mentorId: m, intakeAnswers: ["جدید"] }));
    expect(again.status).toBe(200);
    expect((await rowAs(m, "mentor", id)).intakeAnswers).toEqual([{ question: "سؤال تازه", answer: "جدید" }]);
  });
});

describe("یادداشت خصوصی و برچسب", () => {
  it("یادداشت: CRUD فقط برای منتور همین شاگرد", async () => {
    const m = await makeMentor();
    const other = await makeMentor();
    const s = await makeUser();
    await connect(s, m);
    const ctx = { params: { studentId: s } };

    // یادداشت رمزگذاری سرتاسری «فقط برای خودم» دارد (agent D): متن ساده رد، پاکت رمزشده ذخیره
    const mk = await giveKey(m);
    const seal = (t: string) => sealNote({ userId: m, version: mk.version, publicKey: mk.publicB64, privateKey: mk.privateKey }, s, t);
    const open = async (b: string) => ((await openNote({ userId: m, version: mk.version, publicKey: mk.publicB64, privateKey: mk.privateKey }, s, b)) as any).text;
    as(m);
    expect((await postNote(req("POST", "/x", { body: "  " }), ctx)).status).toBe(400);
    expect((await postNote(req("POST", "/x", { body: "شیمی ضعیف است" }), ctx)).status).toBe(400);
    const created = await j(await postNote(req("POST", "/x", { body: await seal("شیمی ضعیف است") }), ctx));
    expect(await open(created.note.body)).toBe("شیمی ضعیف است");
    expect(JSON.stringify(await prisma.mentorStudentNote.findMany({ where: { mentorId: m } }))).not.toContain("شیمی");
    const noteId = created.note.id;

    // منتور دیگر و خود شاگرد دسترسی ندارند (۴۰۴)
    as(other);
    expect((await getNotes(req("GET", "/x"), ctx)).status).toBe(404);
    expect((await patchNote(req("PATCH", "/x", { body: await seal("هک") }), { params: { studentId: s, noteId } })).status).toBe(404);
    as(s);
    expect((await getNotes(req("GET", "/x"), { params: { studentId: m } })).status).toBe(404);

    as(m);
    expect((await patchNote(req("PATCH", "/x", { body: "شیمی و فیزیک" }), { params: { studentId: s, noteId } })).status).toBe(400);
    const edited = await j(await patchNote(req("PATCH", "/x", { body: await seal("شیمی و فیزیک") }), { params: { studentId: s, noteId } }));
    expect(await open(edited.note.body)).toBe("شیمی و فیزیک");
    expect((await j(await getNotes(req("GET", "/x"), ctx))).notes).toHaveLength(1);

    // یادداشت در هیچ پاسخ سمت شاگرد نیست
    const sRow = await rowAs(s, "student", (await prisma.mentorship.findFirst({ where: { mentorId: m, studentId: s } }))!.id);
    expect(JSON.stringify(sRow)).not.toContain("شیمی");

    as(m);
    expect((await deleteNote(req("DELETE", "/x"), { params: { studentId: s, noteId } })).status).toBe(200);
    expect((await deleteNote(req("DELETE", "/x"), { params: { studentId: s, noteId } })).status).toBe(404);
  });

  it("برچسب: ساخت، تکراری ۴۰۹، اختصاص فقط برچسب خود، حذف از روی شاگرد برداشته می‌شود", async () => {
    const m = await makeMentor();
    const other = await makeMentor();
    const s = await makeUser();
    await connect(s, m);

    as(m);
    const a = (await j(await postLabel(req("POST", "/x", { name: " کنکور  ۱۴۰۶ " })))).label;
    expect(a.name).toBe("کنکور ۱۴۰۶");
    expect((await postLabel(req("POST", "/x", { name: "کنکور ۱۴۰۶" }))).status).toBe(409);
    const b = (await j(await postLabel(req("POST", "/x", { name: "پیگیری" })))).label;

    as(other);
    const foreign = (await j(await postLabel(req("POST", "/x", { name: "مال دیگری" })))).label;
    expect((await patchLabel(req("PATCH", "/x", { name: "x" }), { params: { labelId: a.id } })).status).toBe(404);
    expect((await deleteLabel(req("DELETE", "/x"), { params: { labelId: a.id } })).status).toBe(404);

    as(m);
    expect((await putStudentLabels(req("PUT", "/x", { labelIds: [a.id, foreign.id] }), { params: { studentId: s } })).status).toBe(400);
    expect((await putStudentLabels(req("PUT", "/x", { labelIds: [a.id, b.id] }), { params: { studentId: s } })).status).toBe(200);

    let idx = await j(await studentsIndex());
    const row = idx.students.find((r: any) => r.student.id === s);
    expect(row.labelIds.sort()).toEqual([a.id, b.id].sort());
    expect(idx.labels.map((l: any) => l.name)).toEqual(["کنکور ۱۴۰۶", "پیگیری"]);

    expect((await patchLabel(req("PATCH", "/x", { name: "کنکور تجربی" }), { params: { labelId: a.id } })).status).toBe(200);
    expect((await deleteLabel(req("DELETE", "/x"), { params: { labelId: b.id } })).status).toBe(200);
    const ms = await prisma.mentorship.findFirst({ where: { mentorId: m, studentId: s }, select: { mentorLabelIds: true } });
    expect(ms!.mentorLabelIds).toEqual([a.id]);
    expect((await j(await listLabels())).labels.map((l: any) => l.name)).toEqual(["کنکور تجربی"]);

    const man = await j(await manage(req("GET", "/x"), { params: { studentId: s } }));
    expect(man.labelIds).toEqual([a.id]);
    idx = await j(await studentsIndex());
    expect(idx.students).toHaveLength(1);
  });
});

describe("توقف و پایان رابطه", () => {
  it("توقف با دلیل به شاگرد اعلام و در ردیفش دیده می‌شود؛ ادامه پاکش می‌کند", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);
    const ctx = { params: { studentId: s } };

    as(s);
    expect((await pause(req("POST", "/x", {}), { params: { studentId: m } })).status).toBe(404);

    as(m);
    expect((await pause(req("POST", "/x", { reason: "x".repeat(301) }), ctx)).status).toBe(400);
    expect((await pause(req("POST", "/x", { reason: "امتحانات" }), ctx)).status).toBe(200);
    expect((await pause(req("POST", "/x", {}), ctx)).status).toBe(409);

    const row = await rowAs(s, "student", id);
    expect(row.status).toBe("ACTIVE");
    expect(row.pauseReason).toBe("امتحانات");
    expect(row.pausedAt).toBeTruthy();
    const n = await prisma.inAppNotification.findFirst({ where: { userId: s, type: "mentor.paused" } });
    expect(n?.body).toContain("امتحانات");

    as(m);
    expect((await resume(req("DELETE", "/x"), ctx)).status).toBe(200);
    expect((await resume(req("DELETE", "/x"), ctx)).status).toBe(409);
    expect((await rowAs(s, "student", id)).pausedAt).toBeNull();
  });

  it("پایان با دلیل: دلیل و طرف پایان‌دهنده در ردیف و اعلان", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const id = await connect(s, m);

    as(m);
    const { PATCH } = await import("@/app/api/mentorships/[id]/route");
    expect((await PATCH(req("PATCH", "/x", { action: "end", reason: "x".repeat(301) }), { params: { id } })).status).toBe(400);
    expect((await PATCH(req("PATCH", "/x", { action: "end", reason: "دوره تمام شد" }), { params: { id } })).status).toBe(200);

    const row = await rowAs(s, "student", id);
    expect(row).toMatchObject({ status: "ENDED", endReason: "دوره تمام شد", endedBy: "MENTOR" });
    const n = await prisma.inAppNotification.findFirst({ where: { userId: s, type: "mentor.ended" } });
    expect(n?.body).toContain("دوره تمام شد");
  });

  it("پیام خوش‌آمد: در اعلان پذیرش و ردیف شاگرد", async () => {
    const m = await makeMentor();
    await settings(m, { welcomeMessage: "خوش آمدی" });
    const s = await makeUser();
    const id = await connect(s, m);
    const n = await prisma.inAppNotification.findFirst({ where: { userId: s, type: "mentor.accepted" } });
    expect(n?.body).toContain("خوش آمدی");
    expect((await rowAs(s, "student", id)).welcomeMessage).toBe("خوش آمدی");
    // منتور خودش آن را در ردیف نمی‌گیرد
    expect((await rowAs(m, "mentor", id)).welcomeMessage).toBeNull();
  });
});
