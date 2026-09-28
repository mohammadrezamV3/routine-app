import { describe, it, expect, afterAll, vi, beforeAll } from "vitest";

// رمزگذاریِ خودکار از دیدِ *کلاینت* (lib/e2ee/client.ts) — هر «دستگاه» یک نمونه‌ی تازه از
// ماژول‌های کلاینت است (vi.resetModules؛ بدونِ IndexedDB → حافظه‌ی همان نمونه) و fetch
// مستقیم به route handlerهای واقعی وصل است. هیچ رمزی جدا از رمزِ عبورِ حساب ساخته نمی‌شود.

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import * as keysRoute from "@/app/api/e2ee/keys/route";
import * as deviceRoute from "@/app/api/e2ee/keys/device/route";
import * as kdfRoute from "@/app/api/e2ee/keys/kdf/route";
import * as backupRoute from "@/app/api/e2ee/keys/backup/route";
import * as historyRoute from "@/app/api/e2ee/history/route";
import * as linkRoute from "@/app/api/e2ee/link/route";
import * as linkIdRoute from "@/app/api/e2ee/link/[id]/route";
import * as convKeysRoute from "@/app/api/mentorships/[id]/messages/keys/route";
import * as messagesRoute from "@/app/api/mentorships/[id]/messages/route";
import * as notesRoute from "@/app/api/mentor/students/[studentId]/notes/route";
import { as, makeUser, makeMentor, cleanupUsers, connect } from "./helpers/mentorTestUtils";

type Client = typeof import("@/lib/e2ee/client");

afterAll(async () => {
  await cleanupUsers();
});

// ── fetch → route handler ──
type Handler = (req: any, ctx?: any) => Promise<Response>;
function route(url: URL, method: string): [Handler | undefined, any] {
  const p = url.pathname;
  let m: RegExpMatchArray | null;
  if (p === "/api/e2ee/keys") return [(keysRoute as any)[method], undefined];
  if (p === "/api/e2ee/keys/device") return [(deviceRoute as any)[method], undefined];
  if (p === "/api/e2ee/keys/kdf") return [(kdfRoute as any)[method], undefined];
  if (p === "/api/e2ee/keys/backup") return [(backupRoute as any)[method], undefined];
  if (p === "/api/e2ee/history") return [(historyRoute as any)[method], undefined];
  if (p === "/api/e2ee/link") return [(linkRoute as any)[method], undefined];
  if ((m = p.match(/^\/api\/e2ee\/link\/([^/]+)$/))) return [(linkIdRoute as any)[method], { params: { id: decodeURIComponent(m[1]) } }];
  if ((m = p.match(/^\/api\/mentorships\/([^/]+)\/messages\/keys$/))) return [(convKeysRoute as any)[method], { params: { id: m[1] } }];
  if ((m = p.match(/^\/api\/mentorships\/([^/]+)\/messages$/))) return [(messagesRoute as any)[method], { params: { id: m[1] } }];
  if ((m = p.match(/^\/api\/mentor\/students\/([^/]+)\/notes$/))) return [(notesRoute as any)[method], { params: { studentId: decodeURIComponent(m[1]) } }];
  return [undefined, undefined];
}

/** همه‌ی بدنه‌های درخواست — برای اثباتِ این‌که رمزِ عبور هرگز به API نمی‌رود */
const sentBodies: string[] = [];

beforeAll(() => {
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const method = (init?.method || "GET").toUpperCase();
    if (init?.body) sentBodies.push(String(init.body));
    const [h, ctx] = route(url, method);
    if (!h) return new Response(JSON.stringify({ error: "no route" }), { status: 404 });
    const req = new NextRequest(url, { method, body: init?.body as any, headers: init?.headers as any });
    return h(req, ctx);
  }) as typeof fetch;
});

/** یک دستگاهِ تازه: ماژول‌های کلاینت از نو (حافظه‌ی کلید خالی) */
async function device(): Promise<Client> {
  vi.resetModules();
  return import("@/lib/e2ee/client");
}

function ready(c: Client) {
  const s = c.getIdentityState();
  if (s.status !== "ready") throw new Error(`not ready: ${JSON.stringify(s)}`);
  return s;
}

async function sendFrom(c: Client, msId: string, text: string) {
  const keys = await c.fetchConversationKeys(msId);
  const cipher = new c.ConversationCipher(ready(c).identity, msId, keys);
  const { frankingKey: _fk, ...payload } = await cipher.encrypt(text);
  const res = await fetch(`/api/mentorships/${msId}/messages`, { method: "POST", body: JSON.stringify(payload) });
  return { res, data: await res.json() };
}

async function readAll(c: Client, msId: string) {
  const keys = await c.fetchConversationKeys(msId);
  const cipher = new c.ConversationCipher(ready(c).identity, msId, keys);
  const res = await fetch(`/api/mentorships/${msId}/messages`);
  const data = await res.json();
  const out: string[] = [];
  for (const m of data.messages) {
    const o = await cipher.open(m);
    out.push(o.kind === "text" ? (o.committed ? o.text : "!uncommitted") : `<${o.kind}>`);
  }
  return out;
}

describe("رمزگذاریِ خودکار (بدونِ رمزِ گفت‌وگو)", () => {
  it("حسابِ رمزدار: ورود روی هر دستگاه همان کلید را بی‌صدا باز می‌کند؛ تغییرِ رمز بازبسته‌بندی؛ بازیابی با پیامک کلیدِ تازه و دستگاهِ قدیمی همچنان سابقه را می‌خواند", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    const PW = "رمز عبور حساب شاگرد ۱";

    // منتور: حسابِ بی‌رمز (کلیدِ دستگاه)
    await prisma.user.update({ where: { id: m }, data: { passwordHash: null } });
    as(m);
    const mDev = await device();
    await mDev.refreshIdentity();
    expect(ready(mDev).identity.kind).toBe("DEVICE");

    // شاگرد، دستگاهِ A: ورود با رمز → SYNCED بی‌صدا
    as(s);
    const A = await device();
    await A.primeE2EEFromPassword(s, PW);
    const a = ready(A);
    expect(a.identity.kind).toBe("SYNCED");
    expect(a.notice).toBeNull();
    const synced = await prisma.userE2EKey.findFirstOrThrow({ where: { userId: s, kind: "SYNCED", retiredAt: null } });
    expect(synced.backupKind).toBe("PASSWORD");

    as(m);
    await mDev.refreshIdentity();
    expect((await sendFrom(mDev, ms, "سلام از منتور")).res.status).toBe(200);
    as(s);
    expect((await sendFrom(A, ms, "سلام از شاگرد")).res.status).toBe(200);

    // دستگاهِ B: فقط ورود با همان رمز — همان کلید، همه‌ی سابقه
    const B = await device();
    await B.primeE2EEFromPassword(s, PW);
    expect(ready(B).identity.version).toBe(a.identity.version);
    expect(await readAll(B, ms)).toEqual(["سلام از منتور", "سلام از شاگرد"]);

    // رمزِ عبور هرگز در بدنه‌ی هیچ درخواستی به API نرفت
    expect(sentBodies.some((b) => b.includes(PW))).toBe(false);

    // تغییرِ رمز از پنل روی B: بازبسته‌بندی با رمزِ تازه (نمکِ تازه)
    const PW2 = "رمز عبور تازه‌ی شاگرد ۲";
    const commit = await B.prepareE2EEPasswordChange(PW, PW2);
    expect(commit).toBeTruthy();
    await commit!();
    const C = await device();
    await C.primeE2EEFromPassword(s, PW2);
    expect(ready(C).identity.version).toBe(a.identity.version);
    expect(await readAll(C, ms)).toEqual(["سلام از منتور", "سلام از شاگرد"]);
    // A (با KEKِ رمزِ قبلی) هیچ‌وقت کلید عوض نمی‌کند؛ فقط KEKِ کهنه کنار می‌رود
    await A.refreshIdentity();
    expect(ready(A).identity.version).toBe(a.identity.version);

    // بازیابیِ رمز با پیامک (رمزِ قبلی نامعلوم): ورود با رمزِ سوم → کلیدِ SYNCEDِ تازه
    const PW3 = "رمز سوم پس از فراموشی ۳";
    const D = await device();
    await D.primeE2EEFromPassword(s, PW3);
    const d = ready(D);
    expect(d.identity.version).not.toBe(a.identity.version);
    expect(await readAll(D, ms)).toEqual(["<old-key>", "<old-key>"]);
    // پیامِ تازه برای کلیدِ تازه + دستگاهِ منتور؛ A کلیدِ قبلی را هنوز دارد و سابقه را می‌خواند
    as(m);
    await mDev.refreshIdentity();
    expect((await sendFrom(mDev, ms, "بعد از بازیابی")).res.status).toBe(200);
    as(s);
    expect(await readAll(D, ms)).toEqual(["<old-key>", "<old-key>", "بعد از بازیابی"]);
    await A.refreshIdentity(); // KEKِ A کهنه است → کلیدِ دستگاه برای پیام‌های تازه؛ کلیدِ قبلی برای سابقه
    const a2 = ready(A);
    expect(a2.identity.kind).toBe("DEVICE");
    expect(a2.notice).toEqual({ kind: "history-relogin" });
    const onA = await readAll(A, ms);
    expect(onA.slice(0, 2)).toEqual(["سلام از منتور", "سلام از شاگرد"]);
    // C دوباره بالا بیاید هم کلید را عوض نمی‌کند (نمکِ کهنه)
    await C.refreshIdentity();
    expect((await prisma.userE2EKey.count({ where: { userId: s, kind: "SYNCED" } }))).toBe(2);
  }, 120_000);

  it("حسابِ گوگل: کلیدِ هر دستگاه؛ دستگاهِ تازه پیام‌های تازه را فوری می‌خواند؛ «انتقال سابقه» با کدِ یکسان روی دو دستگاه", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await prisma.user.update({ where: { id: s }, data: { passwordHash: null } });

    as(m);
    const M = await device();
    await M.primeE2EEFromPassword(m, "رمز منتور برای تست ۱");
    as(s);
    const P1 = await device();
    await P1.refreshIdentity();
    expect(ready(P1).identity.kind).toBe("DEVICE");
    as(m);
    await M.refreshIdentity();
    await sendFrom(M, ms, "قدیمی");

    // دستگاهِ دوم: بی‌هیچ کاری کلید دارد؛ پیامِ قدیمی نه، پیامِ تازه بله
    as(s);
    const P2 = await device();
    await P2.refreshIdentity();
    const p2 = ready(P2);
    expect(p2.notice).toEqual({ kind: "history-link" });
    as(m);
    await M.refreshIdentity();
    await sendFrom(M, ms, "تازه");
    as(s);
    expect(await readAll(P2, ms)).toEqual(["<old-key>", "تازه"]);
    expect(await readAll(P1, ms)).toEqual(["قدیمی", "تازه"]);

    // انتقالِ سابقه: P2 درخواست می‌دهد، P1 همان کد را می‌بیند و تأیید می‌کند
    await P2.requestHistoryLink();
    const req = ready(P2).link;
    expect(req?.role).toBe("requester");
    await P1.refreshIdentity();
    const appr = ready(P1).link;
    expect(appr?.role).toBe("approver");
    expect(appr!.code).toBe(req!.code);
    const moved = await P1.approveHistoryLink(appr as any);
    expect(moved).toBeGreaterThanOrEqual(1);
    await P2.refreshIdentity();
    expect(ready(P2).link).toMatchObject({ role: "requester", status: "DONE" });
    expect(await readAll(P2, ms)).toEqual(["قدیمی", "تازه"]);
  }, 120_000);

  it("یادداشتِ خصوصیِ منتور روی همه‌ی دستگاه‌های منتور خوانا؛ نشستِ قدیمی (بدونِ KEK) کلیدِ دستگاه و پس از ورود به SYNCED منتقل", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    as(s);
    const S = await device();
    await S.refreshIdentity();

    // منتور: نشستی که از پیش از این تغییر باز مانده → بدونِ KEK → کلیدِ دستگاه
    as(m);
    const OLD = await device();
    await OLD.refreshIdentity();
    const old = ready(OLD);
    expect(old.identity.kind).toBe("DEVICE");
    const { sealNote, openNote } = await import("@/lib/e2ee/notes");
    const body = await sealNote(old.identity, s, "یادداشت خصوصی منتور");
    const nr = await fetch(`/api/mentor/students/${s}/notes`, { method: "POST", body: JSON.stringify({ body }) });
    expect(nr.status).toBe(200);
    await sendFrom(OLD, ms, "پیام از نشست قدیمی");

    // ورود با رمز روی همان دستگاه → SYNCED؛ سابقه‌ی کلیدِ دستگاه در پس‌زمینه به SYNCED منتقل و دستگاه بازنشسته
    await OLD.primeE2EEFromPassword(m, "رمز منتور ۱۲۳۴۵");
    expect(ready(OLD).identity.kind).toBe("SYNCED");
    for (let i = 0; i < 50 && (await prisma.userE2EKey.count({ where: { userId: m, kind: "DEVICE", retiredAt: null } })) > 0; i++) await new Promise((r) => setTimeout(r, 100));
    expect(await prisma.userE2EKey.count({ where: { userId: m, kind: "DEVICE", retiredAt: null } })).toBe(0);

    // دستگاهِ تازه‌ی منتور، فقط با ورود: پیام و یادداشت هر دو خوانا
    const NEW = await device();
    await NEW.primeE2EEFromPassword(m, "رمز منتور ۱۲۳۴۵");
    expect(await readAll(NEW, ms)).toEqual(["پیام از نشست قدیمی"]);
    const stored = await prisma.mentorStudentNote.findFirstOrThrow({ where: { mentorId: m } });
    expect(stored.body.startsWith("e2e2:")).toBe(true);
    expect(stored.body).not.toContain("یادداشت");
    expect(await openNote(ready(NEW).identity, s, stored.body)).toEqual({ kind: "text", text: "یادداشت خصوصی منتور" });
  }, 120_000);
});
