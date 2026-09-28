import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { todayIsoInTz, addDaysIso } from "@/lib/mentorServer";
import { MENTOR_TERMS_VERSION } from "@/lib/mentorTerms";

// کمک‌تابع‌های مشترکِ تست‌های اکوسیستم منتور.
//
// نشست: هر فایلِ تست "next-auth" را mock می‌کند تا getServerSession از
// globalThis.__mentorSessionUser بخواند — بنابراین گیت‌های *واقعی*
// (requireFeature → فلگ‌ها، مسدودی، requireAdmin از دیتابیس) اجرا می‌شوند.
// نمونه‌ی mock (باید در خودِ فایلِ تست باشد چون vi.mock hoist می‌شود):
//
//   vi.mock("next-auth", async (orig) => ({
//     ...(await orig<any>()),
//     getServerSession: vi.fn(async () => sessionFromGlobal()),
//   }));

export function as(userId: string | null): void {
  (globalThis as any).__mentorSessionUser = userId;
}

export function sessionFromGlobal() {
  const id = (globalThis as any).__mentorSessionUser as string | null | undefined;
  return id ? { user: { id, isSuperAdmin: false } } : null;
}

const created: string[] = [];

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** یک پیشوندِ یکتا برای هر فایل/اجرا — تا جست‌وجوی q فقط کاربرانِ همین تست را پیدا کند */
export function uniqueTag(): string {
  return `t${Date.now().toString(36).slice(-5)}${rand()}`.slice(0, 12);
}

export async function makeUser(opts: { username?: string; name?: string; lastName?: string; adminPermissions?: string[]; timezone?: string } = {}): Promise<string> {
  const u = await prisma.user.create({
    data: {
      email: `mentor-test-${Date.now()}-${rand()}${rand()}@example.com`,
      passwordHash: "x",
      market: "IRAN",
      username: opts.username ?? `u_${rand()}${rand()}`.slice(0, 20),
      name: opts.name ?? null,
      lastName: opts.lastName ?? null,
      adminPermissions: opts.adminPermissions ?? [],
      ...(opts.timezone ? { timezone: opts.timezone } : {}),
    },
    select: { id: true },
  });
  created.push(u.id);
  return u.id;
}

export async function cleanupUsers(): Promise<void> {
  if (created.length === 0) return;
  const ids = created.splice(0);
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: ids } }, { targetId: { in: ids } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

export function req(method: string, url: string, body?: unknown): NextRequest {
  const init: any = { method, headers: {} as Record<string, string> };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost").toString(), init);
}

export function formReq(url: string, form: FormData): NextRequest {
  return new NextRequest(new URL(url, "http://localhost").toString(), { method: "POST", body: form });
}

export async function j(res: Response): Promise<any> {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return t;
  }
}

/** «امروز»ِ سرور برای کاربری با تایم‌زونِ پیش‌فرض (Asia/Tehran) — همون محاسبه‌ی lib/mentorServer.ts */
export function today(): string {
  return todayIsoInTz("Asia/Tehran");
}

export function dayOffset(n: number): string {
  return addDaysIso(today(), n);
}

export function jsDayOf(iso: string): number {
  return new Date(iso + "T00:00:00.000Z").getUTCDay();
}

export async function setOccurrences(userId: string, value: unknown[]): Promise<void> {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: SETTING_KEYS.customOccurrences } },
    create: { userId, key: SETTING_KEYS.customOccurrences, value: value as any },
    update: { value: value as any },
  });
}

export async function readOccurrences(userId: string): Promise<any[]> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: SETTING_KEYS.customOccurrences } },
    select: { value: true },
  });
  return (row?.value as any[]) ?? [];
}

export async function setDailyEntry(userId: string, iso: string, completedItems: Record<string, boolean>): Promise<void> {
  const date = new Date(iso + "T00:00:00.000Z");
  await prisma.dailyEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, completedItems },
    update: { completedItems },
  });
}

// ───────────── بایت‌های حداقلیِ فایل با magic bytesِ درست ─────────────

export function pngBytes(size = 64): Uint8Array {
  const b = new Uint8Array(Math.max(size, 16));
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return b;
}

export function pdfBytes(size = 64): Uint8Array {
  const head = new TextEncoder().encode("%PDF-1.4\n%test\n");
  const b = new Uint8Array(Math.max(size, head.length));
  b.set(head, 0);
  return b;
}

export function jpegBytes(size = 64): Uint8Array {
  const b = new Uint8Array(Math.max(size, 16));
  b.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return b;
}

export function webpBytes(size = 64): Uint8Array {
  const b = new Uint8Array(Math.max(size, 16));
  b.set(new TextEncoder().encode("RIFF"), 0);
  b.set(new TextEncoder().encode("WEBP"), 8);
  return b;
}

export function exeBytes(size = 64): Uint8Array {
  const b = new Uint8Array(Math.max(size, 16));
  b.set([0x4d, 0x5a], 0); // "MZ"
  return b;
}

export function htmlBytes(): Uint8Array {
  return new TextEncoder().encode("<html><script>alert(1)</script></html>");
}

export function fileForm(bytes: Uint8Array, name: string, kind: string, category?: string, type = "application/octet-stream"): FormData {
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array(bytes)], name, { type }));
  fd.set("kind", kind);
  if (category) fd.set("category", category);
  return fd;
}

/** بدنه‌ی ساده‌ی ساختِ برنامه */
export function programBody(mentorshipId: string, over: Record<string, unknown> = {}) {
  return {
    mentorshipId,
    type: "ROUTINE",
    title: "برنامه تست",
    items: [{ title: "مطالعه صبح", repeat: "DAILY", startTime: "08:00", durationMin: 60 }],
    ...over,
  };
}

// ───────────── جریان‌های پرتکرار از طریقِ خودِ روت‌ها ─────────────
// (import این روت‌ها بعد از vi.mockِ hoistشده‌ی فایلِ تست ارزیابی می‌شود)
import { PUT as putMentorMe } from "@/app/api/mentors/me/route";
import { POST as postMentorship } from "@/app/api/mentorships/route";
import { PATCH as patchMentorship } from "@/app/api/mentorships/[id]/route";
import { POST as postProgram } from "@/app/api/mentor-programs/route";
import { POST as postTransition } from "@/app/api/mentor-programs/[id]/transition/route";
import { PUT as putPrivacy } from "@/app/api/mentorships/[id]/privacy/route";

export async function makeMentorProfile(
  userId: string,
  body: Record<string, unknown> = { headline: "مربی", bio: "بیو", categories: ["ROUTINE", "FITNESS"], published: true }
): Promise<any> {
  as(userId);
  // پذیرشِ شرایطِ منتوری در ساختِ پروفایل الزامی است (lib/mentorTerms.ts)؛ تست‌های خودِ پذیرش: mentorTerms.test.ts
  const res = await putMentorMe(req("PUT", "/api/mentors/me", { acceptMentorTerms: MENTOR_TERMS_VERSION, ...body }));
  if (res.status !== 200) throw new Error(`makeMentorProfile ${res.status} ${JSON.stringify(await j(res))}`);
  return (await j(res)).profile;
}

/**
 * کاربر + پروفایلِ منتوریِ منتشرشده با هویتِ تأییدشده — احرازِ هویت برای منتور
 * اجباری است (DISCOVERABLE_PROFILE_WHERE)؛ تأیید در واقع کارِ ادمین است و این‌جا
 * مستقیم نوشته می‌شود. `identity: false` پروفایلِ تأییدنشده می‌سازد.
 */
export async function makeMentor(
  opts: Parameters<typeof makeUser>[0] = {},
  profile?: Record<string, unknown>,
  { identity = true }: { identity?: boolean } = {}
): Promise<string> {
  const id = await makeUser(opts);
  await makeMentorProfile(id, profile);
  if (identity) await prisma.mentorProfile.update({ where: { userId: id }, data: { identityStatus: "VERIFIED" } });
  return id;
}

export async function requestMentorship(studentId: string, mentorId: string, message?: string) {
  as(studentId);
  return postMentorship(req("POST", "/api/mentorships", { mentorId, acceptMentorTerms: MENTOR_TERMS_VERSION, ...(message ? { message } : {}) }));
}

export async function mentorshipAction(userId: string, id: string, action: string) {
  as(userId);
  return patchMentorship(req("PATCH", `/api/mentorships/${id}`, { action, ...(action === "accept" ? { acceptMentorTerms: MENTOR_TERMS_VERSION } : {}) }), { params: { id } });
}

/** درخواست + قبول → idِ رابطه‌ی ACTIVE */
export async function connect(studentId: string, mentorId: string): Promise<string> {
  const r = await requestMentorship(studentId, mentorId);
  if (r.status !== 200) throw new Error(`request ${r.status} ${JSON.stringify(await j(r))}`);
  const id = (await j(r)).mentorship.id as string;
  const a = await mentorshipAction(mentorId, id, "accept");
  if (a.status !== 200) throw new Error(`accept ${a.status} ${JSON.stringify(await j(a))}`);
  return id;
}

export async function createProgram(mentorId: string, mentorshipId: string, over: Record<string, unknown> = {}) {
  as(mentorId);
  return postProgram(req("POST", "/api/mentor-programs", programBody(mentorshipId, over)));
}

export async function createProgramId(mentorId: string, mentorshipId: string, over: Record<string, unknown> = {}): Promise<string> {
  const r = await createProgram(mentorId, mentorshipId, over);
  if (r.status !== 200) throw new Error(`createProgram ${r.status} ${JSON.stringify(await j(r))}`);
  return (await j(r)).program.id;
}

export async function transition(userId: string, id: string, action: string, note?: string) {
  as(userId);
  return postTransition(req("POST", `/api/mentor-programs/${id}/transition`, { action, ...(note !== undefined ? { note } : {}) }), { params: { id } });
}

/** ساخت + ارسال + قبول → برنامه‌ی ACTIVE */
export async function activeProgram(mentorId: string, studentId: string, mentorshipId: string, over: Record<string, unknown> = {}): Promise<string> {
  const id = await createProgramId(mentorId, mentorshipId, over);
  const s = await transition(mentorId, id, "send");
  if (s.status !== 200) throw new Error(`send ${s.status} ${JSON.stringify(await j(s))}`);
  const a = await transition(studentId, id, "accept");
  if (a.status !== 200) throw new Error(`accept ${a.status} ${JSON.stringify(await j(a))}`);
  return id;
}

export async function setPrivacy(studentId: string, mentorshipId: string, body: Record<string, unknown>) {
  as(studentId);
  return putPrivacy(req("PUT", `/api/mentorships/${mentorshipId}/privacy`, body), { params: { id: mentorshipId } });
}
