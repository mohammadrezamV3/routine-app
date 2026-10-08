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
import { GET as getProgram } from "@/app/api/mentor-programs/[id]/route";
import { POST as postLog } from "@/app/api/mentor-programs/[id]/logs/route";
import { POST as postFeedback } from "@/app/api/mentor-programs/[id]/feedback/route";
import { GET as dashboard } from "@/app/api/mentor/dashboard/route";
import {
  buildOccurrenceItemMap,
  deriveItemStates,
  mirrorOccurrenceId,
  parseMirrorOccurrenceId,
  programWindow,
  summarizeDay,
  weekStartIso,
  type DeriveItem,
} from "@/lib/mentorProgressCore";
import { syncProgramProgress } from "@/lib/mentorProgress";
import {
  as, req, j, makeUser, makeMentor, cleanupUsers, connect, activeProgram, transition, readOccurrences, setOccurrences,
  setDailyEntry, setPrivacy, today, dayOffset, jsDayOf,
} from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

// ───────────────────────── هسته‌ی خالص ─────────────────────────

const ALL = [0, 1, 2, 3, 4, 5, 6];
const it0: DeriveItem = { id: "i0", order: 0, title: "مطالعه", days: ALL };

function ticksOf(entries: [string, Record<string, boolean>][]) {
  return new Map<string, Record<string, unknown>>(entries);
}

describe("mentorProgressCore — مشتق‌سازی", () => {
  const P = "prog1";
  const itemOf = buildOccurrenceItemMap(P, "ROUTINE", [it0], []);

  it("انجام / انجام‌نشده / پیش رو (امروز تیک‌نخورده و آینده)", () => {
    // ۲۰۲۶-۰۹-۲۱ دوشنبه … ۲۰۲۶-۰۹-۲۵ جمعه؛ امروز = ۲۴
    const cells = deriveItemStates({
      items: [it0],
      from: "2026-09-21",
      to: "2026-09-25",
      openDay: "2026-09-24",
      ticks: ticksOf([
        ["2026-09-21", { [mirrorOccurrenceId(P, 0, 1)]: true }],
        ["2026-09-22", { [mirrorOccurrenceId(P, 0, 2)]: false }],
      ]),
      itemOf,
    });
    expect(cells.map((c) => [c.date, c.state])).toEqual([
      ["2026-09-21", "done"],
      ["2026-09-22", "missed"],
      ["2026-09-23", "missed"],
      ["2026-09-24", "upcoming"],
      ["2026-09-25", "upcoming"],
    ]);
  });

  it("تیک امروز = انجام؛ تیک روز آینده نادیده", () => {
    const cells = deriveItemStates({
      items: [it0],
      from: "2026-09-24",
      to: "2026-09-25",
      openDay: "2026-09-24",
      ticks: ticksOf([
        ["2026-09-24", { [mirrorOccurrenceId(P, 0, 4)]: true }],
        ["2026-09-25", { [mirrorOccurrenceId(P, 0, 5)]: true }],
      ]),
      itemOf,
    });
    expect(cells.map((c) => c.state)).toEqual(["done", "upcoming"]);
  });

  it("فقط روزهای برنامه‌ریزی‌شده‌ی آیتم؛ تیک آیتم/برنامه‌ی دیگر حساب نمی‌شود", () => {
    const weekly: DeriveItem = { id: "w", order: 1, title: "باشگاه", days: [1] }; // دوشنبه
    const map = buildOccurrenceItemMap(P, "ROUTINE", [weekly], []);
    const cells = deriveItemStates({
      items: [weekly],
      from: "2026-09-19",
      to: "2026-09-25",
      openDay: "2026-09-26",
      ticks: ticksOf([["2026-09-21", { [mirrorOccurrenceId("other", 1, 1)]: true, "custom-x": true }]]),
      itemOf: map,
    });
    expect(cells).toEqual([{ date: "2026-09-21", itemId: "w", state: "missed", doneOn: null }]);
  });

  it("جابه‌جایی در همان هفته: تیک occurrence ویرایش‌شده (mentorItemId) روز برنامه را پر می‌کند، یک بار", () => {
    const weekly: DeriveItem = { id: "w", order: 0, title: "آزمون", days: [4] }; // پنجشنبه
    const map = buildOccurrenceItemMap(P, "ROUTINE", [weekly], [{ id: "custom-moved", name: "آزمون", mentorProgramId: P, mentorItemId: "w" }]);
    const cells = deriveItemStates({
      items: [weekly],
      from: "2026-09-19", // شنبه
      to: "2026-10-02",
      openDay: "2026-10-03",
      // هفته‌ی اول: پنجشنبه تیک نخورد، جمعه‌ی همان هفته occurrence جابه‌جاشده تیک خورد (دو بار ذخیره‌شده، یک بار حساب)
      // هفته‌ی دوم: فقط شنبه‌ی بعدش — هفته‌ی دیگری است و نباید هفته‌ی قبل را پر کند
      ticks: ticksOf([
        ["2026-09-25", { "custom-moved": true }],
        ["2026-10-03", { "custom-moved": true }],
      ]),
      itemOf: map,
    });
    expect(cells.map((c) => [c.date, c.state, c.doneOn])).toEqual([
      ["2026-09-24", "done", "2026-09-25"],
      ["2026-10-01", "missed", null],
    ]);
  });

  it("نگاشت اسم برای occurrence قدیمی بدون mentorItemId؛ اسم مبهم رد می‌شود", () => {
    const a: DeriveItem = { id: "a", order: 0, title: "اسکوات", days: [1], sets: 4, reps: "8" };
    const b: DeriveItem = { id: "b", order: 1, title: "پرس", days: [1] };
    const c: DeriveItem = { id: "c", order: 2, title: "پرس", days: [2] };
    const map = buildOccurrenceItemMap(P, "WORKOUT", [a, b, c], [
      { id: "custom-1", name: "اسکوات · ۴×۸", mentorProgramId: P },
      { id: "custom-2", name: "پرس", mentorProgramId: P },
      { id: "custom-3", name: "اسکوات", mentorProgramId: "someone-else" },
    ]);
    expect(map("custom-1")).toBe("a");
    expect(map("custom-2")).toBeNull();
    expect(map("custom-3")).toBeNull();
    expect(map(mirrorOccurrenceId(P, 2, 2))).toBe("c");
    expect(parseMirrorOccurrenceId(P, `mp-${P}-12-7`)).toBeNull();
  });

  it("روز محلی مستقل از DST و ساعت سرور: روز هفته از خود تاریخ", () => {
    // ۲۱ مارس (نوروز، تغییر ساعت قدیمی ایران) و ۲۹ مارس (DST اروپا) — هر دو شنبه/یکشنبه‌ی درست
    expect(weekStartIso("2026-03-21")).toBe("2026-03-21");
    expect(weekStartIso("2026-03-29")).toBe("2026-03-28");
    const sunday: DeriveItem = { id: "s", order: 0, title: "x", days: [0] };
    const cells = deriveItemStates({ items: [sunday], from: "2026-03-28", to: "2026-03-30", openDay: "2026-04-01", ticks: new Map(), itemOf: () => null });
    expect(cells.map((c) => c.date)).toEqual(["2026-03-29"]);
  });

  it("programWindow: شروع = دیرترین (تاریخ شروع، روز فعال‌سازی)؛ برنامه‌ی بسته تا روز بستن", () => {
    expect(programWindow({ startIso: "2026-09-01", endIso: "2026-09-30", activationIso: "2026-09-05", closeIso: null, todayIso: "2026-09-10" }))
      .toEqual({ from: "2026-09-05", to: "2026-09-30", openDay: "2026-09-10", lastFinal: "2026-09-10" });
    expect(programWindow({ startIso: null, endIso: "2026-09-08", activationIso: "2026-09-05", closeIso: null, todayIso: "2026-09-10" }))
      .toEqual({ from: "2026-09-05", to: "2026-09-08", openDay: "2026-09-10", lastFinal: "2026-09-08" });
    expect(programWindow({ startIso: null, endIso: null, activationIso: "2026-09-05", closeIso: "2026-09-07", todayIso: "2026-09-10" }))
      .toEqual({ from: "2026-09-05", to: "2026-09-07", openDay: "2026-09-07", lastFinal: "2026-09-07" });
  });

  it("summarizeDay", () => {
    expect(summarizeDay([])).toBeNull();
    expect(summarizeDay(["done", "done"])).toBe("done");
    expect(summarizeDay(["done", "missed"])).toBe("partial");
    expect(summarizeDay(["missed", "missed"])).toBe("missed");
    expect(summarizeDay(["upcoming", "missed"])).toBe("upcoming");
    expect(summarizeDay(["done", "upcoming"])).toBe("partial");
  });
});

// ───────────────────────── با دیتابیس ─────────────────────────

const P = (id: string) => ({ params: { id } });

async function getP(userId: string, id: string, qs = "") {
  as(userId);
  return j(await getProgram(req("GET", `/api/mentor-programs/${id}${qs}`), P(id)));
}

/** برنامه‌ی فعالی که n روز پیش فعال شده (تا روزهای گذشته هم در بازه باشند) */
async function backdate(id: string, days: number) {
  await prisma.mentorProgram.update({
    where: { id },
    data: { activatedAt: new Date(dayOffset(-days) + "T00:00:00.000Z"), startDate: null, progressSyncedAt: null },
  });
}

async function setup(over: Record<string, unknown> = {}) {
  const m = await makeMentor();
  const s = await makeUser();
  const ms = await connect(s, m);
  const id = await activeProgram(m, s, ms, over);
  const items = (await getP(s, id)).items as any[];
  return { m, s, ms, id, items };
}

describe("پیشرفت خودکار — همگام‌سازی از تیک‌های روتین", () => {
  it("تیک در روتین → COMPLETED، روز گذشته‌ی بی‌تیک → MISSED، امروز بی‌تیک بدون ردیف؛ idempotent", async () => {
    const { m, s, id, items } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }] });
    await backdate(id, 3);
    const occ = (d: string) => mirrorOccurrenceId(id, 0, jsDayOf(d));
    await setDailyEntry(s, dayOffset(-3), { [occ(dayOffset(-3))]: true });
    await setDailyEntry(s, dayOffset(-1), { [occ(dayOffset(-1))]: true, "custom-own": true });

    const v = await getP(m, id);
    const logs = v.logs.map((l: any) => [l.date, l.status, l.source]).sort();
    expect(logs).toEqual([
      [dayOffset(-3), "COMPLETED", "AUTO"],
      [dayOffset(-2), "MISSED", "AUTO"],
      [dayOffset(-1), "COMPLETED", "AUTO"],
    ]);
    expect(v.program.progress).toMatchObject({ completed: 2, missed: 1, partial: 0, rate: 67 });

    // تکرار همگام‌سازی چیزی را دو بار نمی‌شمارد
    await syncProgramProgress([id], { force: true });
    await syncProgramProgress([id], { force: true });
    expect(await prisma.mentorProgramLog.count({ where: { programId: id } })).toBe(3);

    // تیک امروز → ردیف؛ برداشتن تیک → ردیف حذف (امروز هنوز «پیش رو»)
    await setDailyEntry(s, today(), { [occ(today())]: true });
    let sv = await getP(s, id);
    const cell = (view: any, d: string) => view.progressView.days.find((x: any) => x.date === d)?.cells[0];
    expect(cell(sv, today())).toMatchObject({ itemId: items[0].id, state: "done" });
    await setDailyEntry(s, today(), { [occ(today())]: false });
    sv = await getP(s, id);
    expect(cell(sv, today())).toMatchObject({ state: "upcoming", logId: null });
    expect(await prisma.mentorProgramLog.count({ where: { programId: id } })).toBe(3);

    // تیک دیرهنگام دیروز دیروز → MISSED به COMPLETED تبدیل می‌شود (همان ردیف)
    const before = await prisma.mentorProgramLog.findFirst({ where: { programId: id, date: new Date(dayOffset(-2) + "T00:00:00.000Z") } });
    await setDailyEntry(s, dayOffset(-2), { [occ(dayOffset(-2))]: true });
    await getP(m, id);
    const after = await prisma.mentorProgramLog.findFirst({ where: { programId: id, date: new Date(dayOffset(-2) + "T00:00:00.000Z") } });
    expect(after!.id).toBe(before!.id);
    expect(after!.status).toBe("COMPLETED");
  });

  it("ردیف دستی قدیمی دست نمی‌خورد و جای ردیف AUTO را می‌گیرد", async () => {
    const { m, s, id, items } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }] });
    await backdate(id, 2);
    await prisma.mentorProgramLog.create({
      data: { programId: id, itemId: items[0].id, studentId: s, date: new Date(dayOffset(-2) + "T00:00:00.000Z"), status: "PARTIAL", note: "قدیمی" },
    });
    const v = await getP(m, id, `?from=${dayOffset(-6)}&to=${today()}`);
    const old = v.logs.find((l: any) => l.date === dayOffset(-2));
    expect(old).toMatchObject({ status: "PARTIAL", source: "MANUAL", note: "قدیمی" });
    expect(v.logs.find((l: any) => l.date === dayOffset(-1))).toMatchObject({ status: "MISSED", source: "AUTO" });
    const day = v.progressView.days.find((x: any) => x.date === dayOffset(-2));
    expect(day.cells[0].state).toBe("partial");
  });

  it("بازه: روزهای قبل از فعال‌سازی و بعد از تاریخ پایان بی‌ردیف", async () => {
    const { m, id } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }], endDate: dayOffset(20) });
    await prisma.mentorProgram.update({
      where: { id },
      data: { activatedAt: new Date(dayOffset(-4) + "T00:00:00.000Z"), startDate: new Date(dayOffset(-6) + "T00:00:00.000Z"), endDate: new Date(dayOffset(-2) + "T00:00:00.000Z"), progressSyncedAt: null },
    });
    const v = await getP(m, id, `?from=${dayOffset(-8)}&to=${dayOffset(0)}`);
    expect(v.logs.map((l: any) => l.date).sort()).toEqual([dayOffset(-4), dayOffset(-3), dayOffset(-2)]);
    const withCells = v.progressView.days.filter((d: any) => d.cells.length > 0).map((d: any) => d.date);
    expect(withCells).toEqual([dayOffset(-4), dayOffset(-3), dayOffset(-2)]);
  });

  it("حریم خصوصی: showProgress خاموش → منتور وضعیت/لاگ/درصد نمی‌بیند؛ شاگرد می‌بیند؛ یادداشت روز می‌ماند", async () => {
    const { m, s, ms, id } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }] });
    await backdate(id, 2);
    await setDailyEntry(s, dayOffset(-1), { [mirrorOccurrenceId(id, 0, jsDayOf(dayOffset(-1)))]: true });
    as(s);
    expect((await postLog(req("POST", "/x", { date: dayOffset(-1), note: "دیر رسیدم" }), P(id))).status).toBe(200);
    expect((await setPrivacy(s, ms, { showProgress: false })).status).toBe(200);

    const mv = await getP(m, id, `?from=${dayOffset(-6)}&to=${today()}`);
    expect(mv.logs).toEqual([]);
    expect(mv.program.progress).toMatchObject({ hidden: true, rate: 0 });
    expect(mv.progressView.hidden).toBe(true);
    expect(mv.progressView.days.every((d: any) => d.cells.length === 0)).toBe(true);
    expect(mv.progressView.days.find((d: any) => d.date === dayOffset(-1)).note).toBe("دیر رسیدم");

    const sv = await getP(s, id, `?from=${dayOffset(-6)}&to=${today()}`);
    expect(sv.progressView.hidden).toBe(false);
    expect(sv.program.progress.hidden).toBeUndefined();
    expect(sv.logs.length).toBeGreaterThan(0);

    as(m);
    const dash = await j(await dashboard());
    expect(dash.completion.some((c: any) => c.studentId === s)).toBe(false);
    expect(dash.attention.some((a: any) => a.studentId === s)).toBe(false);
    expect(dash.recentActivity.some((a: any) => a.type === "log" && a.url.includes(id))).toBe(false);
  });

  it("WORKOUT در روتین آینه می‌شود (با mentorItemId) و تیک occurrence جابه‌جاشده به همان آیتم می‌رسد", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    const wd = jsDayOf(dayOffset(-1));
    const id = await activeProgram(m, s, ms, { type: "WORKOUT", items: [{ title: "اسکوات", repeat: "WEEKLY", days: [wd], sets: 4, reps: "8" }] });
    const occs = (await readOccurrences(s)).filter((o) => o.mentorProgramId === id);
    expect(occs).toHaveLength(1);
    expect(occs[0].name).toBe("اسکوات · 4×8");
    const itemId = occs[0].mentorItemId;
    expect(typeof itemId).toBe("string");

    // شاگرد در روتینش آیتم را از دیروز به امروز جابه‌جا کرده و امروز تیک زده (همان هفته)
    await backdate(id, 1);
    await setOccurrences(s, [...(await readOccurrences(s)), { id: "custom-moved1", name: "اسکوات · ۴×۸", jsDay: jsDayOf(today()), time: "", mentorProgramId: id, mentorItemId: itemId }]);
    await setDailyEntry(s, today(), { "custom-moved1": true });
    const v = await getP(m, id);
    const sameWeek = weekStartIso(dayOffset(-1)) === weekStartIso(today());
    const row = v.logs.find((l: any) => l.date === dayOffset(-1));
    if (sameWeek) expect(row).toMatchObject({ status: "COMPLETED", doneOn: today(), source: "AUTO" });
    else expect(row).toMatchObject({ status: "MISSED" });
  });

  it("بستن برنامه: پیشرفت قبل از حذف آینه نهایی می‌شود و بعد منجمد می‌ماند", async () => {
    const { m, s, id } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }] });
    await backdate(id, 2);
    await setDailyEntry(s, dayOffset(-2), { [mirrorOccurrenceId(id, 0, jsDayOf(dayOffset(-2)))]: true });
    expect((await transition(m, id, "complete")).status).toBe(200);
    expect((await readOccurrences(s)).some((o) => o.mentorProgramId === id)).toBe(false);
    const statuses = (await prisma.mentorProgramLog.findMany({ where: { programId: id }, orderBy: { date: "asc" } })).map((l) => l.status);
    expect(statuses).toEqual(["COMPLETED", "MISSED"]);
    // تیک بعد از بستن اثری ندارد
    await setDailyEntry(s, dayOffset(-1), { [mirrorOccurrenceId(id, 0, jsDayOf(dayOffset(-1)))]: true });
    await getP(m, id);
    expect((await prisma.mentorProgramLog.findMany({ where: { programId: id }, orderBy: { date: "asc" } })).map((l) => l.status)).toEqual(["COMPLETED", "MISSED"]);
  });

  it("فیدبک منتور روی یک اجرای خودکار (logId) کار می‌کند", async () => {
    const { m, s, id } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }] });
    await backdate(id, 1);
    await setDailyEntry(s, dayOffset(-1), { [mirrorOccurrenceId(id, 0, jsDayOf(dayOffset(-1)))]: true });
    const v = await getP(m, id);
    const logId = v.logs[0].id;
    as(m);
    const f = await postFeedback(req("POST", "/x", { body: "خوب بود", logId }), P(id));
    expect(f.status).toBe(200);
    expect((await j(f)).feedback.logId).toBe(logId);
  });
});

describe("logs API — ثبت دستی وضعیت منسوخ؛ فقط یادداشت روز", () => {
  it("status → ۴۱۰؛ یادداشت upsert/حذف؛ آینده/خارج از بازه ۴۰۰؛ منتور/غریبه ۴۰۴", async () => {
    const { m, s, id, items } = await setup({ items: [{ title: "مطالعه", repeat: "DAILY" }] });
    await backdate(id, 2);
    const post = (u: string, body: Record<string, unknown>) => {
      as(u);
      return postLog(req("POST", "/x", body), P(id));
    };
    const gone = await post(s, { itemId: items[0].id, date: today(), status: "COMPLETED" });
    expect(gone.status).toBe(410);
    expect((await j(gone)).error).toContain("خودکار");
    expect((await post(s, { date: today(), setsDone: 3 })).status).toBe(410);
    expect(await prisma.mentorProgramLog.count({ where: { programId: id, source: "MANUAL" } })).toBe(0);

    const r1 = await post(s, { date: dayOffset(-1), note: "  یادداشت یک  " });
    expect(r1.status).toBe(200);
    expect((await j(r1)).note).toEqual({ date: dayOffset(-1), body: "یادداشت یک" });
    await post(s, { date: dayOffset(-1), note: "یادداشت دو" });
    expect(await prisma.mentorProgramDayNote.count({ where: { programId: id } })).toBe(1);
    expect((await j(await post(s, { date: dayOffset(-1), note: "" }))).note).toBeNull();
    expect(await prisma.mentorProgramDayNote.count({ where: { programId: id } })).toBe(0);

    expect((await post(s, { date: dayOffset(1), note: "x" })).status).toBe(400);
    expect((await post(s, { date: dayOffset(-5), note: "x" })).status).toBe(400);
    expect((await post(s, { date: "bad", note: "x" })).status).toBe(400);
    expect((await post(s, { date: today(), note: "x".repeat(501) })).status).toBe(400);
    expect((await post(m, { date: today(), note: "x" })).status).toBe(404);
    expect((await post(await makeUser(), { date: today(), note: "x" })).status).toBe(404);
  });
});
