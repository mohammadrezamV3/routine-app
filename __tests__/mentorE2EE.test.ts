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
import {
  E2EEDecryptError,
  PBKDF2_MIN_ITERATIONS,
  computeCommitment,
  decryptMessage,
  deriveChatKeys,
  deriveSelfKey,
  derivePairKey,
  encryptMessage,
  generateIdentityKeyPair,
  importPublicKey,
  normalizePasscode,
  openText,
  safetyCode,
  sealText,
  unwrapPrivateKey,
  verifyCommitment,
  wrapPrivateKey,
} from "@/lib/e2ee/core";
import { fromB64, randomId, toB64 } from "@/lib/e2ee/encoding";
import { openAtRest, sealAtRest, serverFrankingTag, verifyServerFrankingTag } from "@/lib/e2ee/server";
import { GET as getMyKey, POST as postKey } from "@/app/api/e2ee/keys/route";
import { GET as getBackup, PUT as putBackup } from "@/app/api/e2ee/keys/backup/route";
import { GET as getPeerKey } from "@/app/api/e2ee/keys/peer/route";
import { GET as getMessages, POST as postMessage } from "@/app/api/mentorships/[id]/messages/route";
import { GET as getConvKeys, POST as nudge } from "@/app/api/mentorships/[id]/messages/keys/route";
import { POST as postLegacy } from "@/app/api/mentorships/[id]/messages/legacy/route";
import { GET as getBroadcast, POST as postBroadcast } from "@/app/api/mentor/broadcast/route";
import { POST as postReport } from "@/app/api/mentor-reports/route";
import { GET as adminReports } from "@/app/api/admin/mentors/reports/route";
import { GET as mentorDashboard } from "@/app/api/mentor/dashboard/route";
import { POST as postFeedback } from "@/app/api/mentor-programs/[id]/feedback/route";
import { GET as getProgram } from "@/app/api/mentor-programs/[id]/route";
import { readIntakeAnswers, writeIntakeAnswers } from "@/lib/mentorManageServer";
import { as, req, j, makeUser, makeMentor, cleanupUsers, connect, requestMentorship } from "./helpers/mentorTestUtils";
import { encFor, giveKey, keyOf, openAs } from "./helpers/e2eeTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

const P = (id: string) => ({ params: { id } });
const CTX = { mentorshipId: "ms1", mentorId: "mentor1", studentId: "student1", mentorKeyVersion: 1, studentKeyVersion: 1 };
const MCTX = { mentorshipId: "ms1", senderId: "student1", clientId: "c".repeat(22), senderKeyVersion: 1, recipientKeyVersion: 1 };

async function pair() {
  const mentor = await generateIdentityKeyPair();
  const student = await generateIdentityKeyPair();
  const onMentor = await deriveChatKeys(mentor.privateKey, student.publicKey, CTX);
  const onStudent = await deriveChatKeys(student.privateKey, mentor.publicKey, CTX);
  return { mentor, student, onMentor, onStudent };
}

// ───────────────────────── هسته‌ی رمزنگاری ─────────────────────────

describe("هسته‌ی رمزنگاری (webcryptoِ Node)", () => {
  it("رفت‌وبرگشت: هر دو طرف به یک کلید می‌رسند؛ متن، fk و تعهد درست برمی‌گردد", async () => {
    const { onMentor, onStudent } = await pair();
    const e = await encryptMessage(onStudent.fromStudent, "سلام استاد؛ تست ۱۲۳", MCTX);
    const d = await decryptMessage(onMentor.fromStudent, e, MCTX);
    expect(d.text).toBe("سلام استاد؛ تست ۱۲۳");
    expect(d.frankingKey).toBe(e.frankingKey);
    expect(d.committed).toBe(true);
    // متنِ رمزشده هیچ ردی از متن ندارد و طولش به بلوکِ ۱۲۸ بایتی گرد شده
    expect(e.ciphertext).not.toContain("سلام");
    expect((fromB64(e.ciphertext)!.length - 16) % 128).toBe(0);
  });

  it("IV تصادفی: دو رمزِ یک متن متفاوت است؛ IVها تکرار نمی‌شوند", async () => {
    const { onStudent } = await pair();
    const ivs = new Set<string>();
    for (let i = 0; i < 200; i++) ivs.add((await encryptMessage(onStudent.fromStudent, "x", MCTX)).iv);
    expect(ivs.size).toBe(200);
  });

  it("AAD: جابه‌جاییِ فرستنده/گفت‌وگو/clientId/نسخه یا دست‌کاریِ بایت → رد", async () => {
    const { onMentor, onStudent } = await pair();
    const e = await encryptMessage(onStudent.fromStudent, "متن", MCTX);
    for (const bad of [
      { ...MCTX, senderId: "mentor1" },
      { ...MCTX, mentorshipId: "ms2" },
      { ...MCTX, clientId: "d".repeat(22) },
      { ...MCTX, senderKeyVersion: 2 },
    ]) {
      await expect(decryptMessage(onMentor.fromStudent, e, bad)).rejects.toBeInstanceOf(E2EEDecryptError);
    }
    const ct = fromB64(e.ciphertext)!;
    ct[5] ^= 1;
    await expect(decryptMessage(onMentor.fromStudent, { ...e, ciphertext: toB64(ct) }, MCTX)).rejects.toBeInstanceOf(E2EEDecryptError);
  });

  it("جداسازیِ کلید: جهتِ مخالف، گفت‌وگوی دیگر، نسخه‌ی دیگر و کاربرِ ثالث کلیدِ دیگری دارند", async () => {
    const { mentor, student, onMentor, onStudent } = await pair();
    const e = await encryptMessage(onStudent.fromStudent, "متن", MCTX);
    await expect(decryptMessage(onMentor.fromMentor, e, MCTX)).rejects.toBeInstanceOf(E2EEDecryptError);
    const other = await deriveChatKeys(mentor.privateKey, student.publicKey, { ...CTX, mentorshipId: "ms2" });
    await expect(decryptMessage(other.fromStudent, e, MCTX)).rejects.toBeInstanceOf(E2EEDecryptError);
    const v2 = await deriveChatKeys(mentor.privateKey, student.publicKey, { ...CTX, studentKeyVersion: 2 });
    await expect(decryptMessage(v2.fromStudent, e, MCTX)).rejects.toBeInstanceOf(E2EEDecryptError);
    const eve = await generateIdentityKeyPair();
    const eveKeys = await deriveChatKeys(eve.privateKey, student.publicKey, CTX);
    await expect(decryptMessage(eveKeys.fromStudent, e, MCTX)).rejects.toBeInstanceOf(E2EEDecryptError);
  });

  it("فرانکینگ: تعهد با متن/زمینه‌ی دیگر یا fkِ دیگر تأیید نمی‌شود", async () => {
    const fk = crypto.getRandomValues(new Uint8Array(32));
    const c = toB64(await computeCommitment(fk, MCTX, "متن اصلی"));
    expect(await verifyCommitment(toB64(fk), c, MCTX, "متن اصلی")).toBe(true);
    expect(await verifyCommitment(toB64(fk), c, MCTX, "متن جعلی")).toBe(false);
    expect(await verifyCommitment(toB64(fk), c, { ...MCTX, senderId: "mentor1" }, "متن اصلی")).toBe(false);
    expect(await verifyCommitment(toB64(fk), c, { ...MCTX, clientId: "z".repeat(22) }, "متن اصلی")).toBe(false);
    expect(await verifyCommitment(toB64(crypto.getRandomValues(new Uint8Array(32))), c, MCTX, "متن اصلی")).toBe(false);
    expect(await verifyCommitment("not-b64", c, MCTX, "متن اصلی")).toBe(false);
  });

  it("فرستنده‌ی بدخواه: fkِ داخلِ پیام با تعهدِ بیرونی نمی‌خواند → committed=false", async () => {
    const { onMentor, onStudent } = await pair();
    const e = await encryptMessage(onStudent.fromStudent, "متن توهین‌آمیز", MCTX);
    const fake = await encryptMessage(onStudent.fromStudent, "متن بی‌خطر", MCTX);
    const d = await decryptMessage(onMentor.fromStudent, { ...e, commitment: fake.commitment }, MCTX);
    expect(d.committed).toBe(false);
  });

  it("پشتیبانِ کلید: رمزِ درست باز می‌کند، نادرست نه؛ به کاربر/نسخه/کلیدِ عمومی گره خورده؛ ارقامِ فارسی یکسان", async () => {
    const kp = await generateIdentityKeyPair();
    const ctx = { userId: "u1", version: 1, publicKey: kp.publicB64 };
    const b = await wrapPrivateKey(kp.privateKey, "اسب باتری ۱۲۳۴ منگنه", ctx, PBKDF2_MIN_ITERATIONS);
    expect(b.iterations).toBeGreaterThanOrEqual(600_000);
    const k = await unwrapPrivateKey(b, "اسب باتری 1234 منگنه", ctx);
    expect(k.extractable).toBe(false);
    // کلیدِ بازشده همان کلید است: با کلیدِ عمومیِ طرفِ دیگر به همان رازِ مشترک می‌رسد
    const peer = await generateIdentityKeyPair();
    const a1 = await deriveSelfKey(k, peer.publicKey, ["t"]);
    const a2 = await deriveSelfKey(peer.privateKey, await importPublicKey(kp.publicB64), ["t"]);
    const s = await sealText(a1, "راز", ["x"]);
    expect(await openText(a2, s, ["x"])).toBe("راز");

    await expect(unwrapPrivateKey(b, "رمز اشتباه است", ctx)).rejects.toBeInstanceOf(E2EEDecryptError);
    await expect(unwrapPrivateKey(b, "اسب باتری ۱۲۳۴ منگنه", { ...ctx, userId: "u2" })).rejects.toBeInstanceOf(E2EEDecryptError);
    await expect(unwrapPrivateKey(b, "اسب باتری ۱۲۳۴ منگنه", { ...ctx, version: 2 })).rejects.toBeInstanceOf(E2EEDecryptError);
    await expect(unwrapPrivateKey({ ...b, iterations: 1000 }, "اسب باتری ۱۲۳۴ منگنه", ctx)).rejects.toBeInstanceOf(E2EEDecryptError);
    expect(normalizePasscode("۱۲۳٤٥")).toBe("12345");
  }, 30_000);

  it("کدِ امنیتی متقارن است و با کلیدِ دیگر عوض می‌شود؛ کلیدِ جفتی/خودی جدا از هم", async () => {
    const a = await generateIdentityKeyPair();
    const b = await generateIdentityKeyPair();
    const c = await generateIdentityKeyPair();
    const ab = await safetyCode({ userId: "a", publicKey: a.publicB64 }, { userId: "b", publicKey: b.publicB64 });
    expect(ab).toMatch(/^\d{4}( \d{4}){5}$/);
    expect(await safetyCode({ userId: "b", publicKey: b.publicB64 }, { userId: "a", publicKey: a.publicB64 })).toBe(ab);
    expect(await safetyCode({ userId: "a", publicKey: a.publicB64 }, { userId: "b", publicKey: c.publicB64 })).not.toBe(ab);

    const k1 = await derivePairKey(a.privateKey, b.publicKey, ["intake", "m", "s"]);
    const k2 = await derivePairKey(b.privateKey, a.publicKey, ["intake", "m", "s"]);
    const k3 = await derivePairKey(b.privateKey, a.publicKey, ["notes", "m", "s"]);
    const s = await sealText(k1, "جواب", ["intake", 0]);
    expect(await openText(k2, s, ["intake", 0])).toBe("جواب");
    await expect(openText(k3, s, ["intake", 0])).rejects.toBeInstanceOf(E2EEDecryptError);
    await expect(openText(k2, s, ["intake", 1])).rejects.toBeInstanceOf(E2EEDecryptError);
  });

  it("سمتِ سرور: برچسبِ فرانکینگ و رمزِ در حالِ سکون", () => {
    const ctx = { mentorshipId: "m", senderId: "s", clientId: "c".repeat(22), commitment: "AAAA", createdAt: new Date("2026-01-01T00:00:00Z") };
    const tag = serverFrankingTag(ctx);
    expect(verifyServerFrankingTag(tag, ctx)).toBe(true);
    expect(verifyServerFrankingTag(tag, { ...ctx, senderId: "x" })).toBe(false);
    expect(verifyServerFrankingTag(tag, { ...ctx, createdAt: new Date("2026-01-01T00:00:01Z") })).toBe(false);
    expect(verifyServerFrankingTag(null, ctx)).toBe(false);

    const sealed = sealAtRest("متن گزارش", ["R", "1"]);
    expect(sealed.startsWith("enc1:")).toBe(true);
    expect(sealed).not.toContain("متن");
    expect(openAtRest(sealed, ["R", "1"])).toBe("متن گزارش");
    expect(openAtRest(sealed, ["R", "2"])).toBeNull();
    expect(openAtRest("متن قدیمی", ["R", "1"])).toBe("متن قدیمی");
  });
});

// ───────────────────────── کلیدها (API) ─────────────────────────

describe("کلیدِ هویت: راه‌اندازی، باز کردن، بازنشانی", () => {
  it("سرور فقط کلیدِ عمومی و پشتیبانِ رمزشده می‌گیرد؛ بازنشانی پشتیبانِ قبلی را پاک می‌کند", async () => {
    const u = await makeUser();
    as(u);
    expect((await j(await getMyKey())).key).toBeNull();
    expect((await getBackup()).status).toBe(404);

    const kp = await generateIdentityKeyPair();
    const pass = "کتاب قرمز روی میز آبی";
    const backup = await wrapPrivateKey(kp.privateKey, pass, { userId: u, version: 1, publicKey: kp.publicB64 }, PBKDF2_MIN_ITERATIONS);
    // شکل‌های بد
    expect((await postKey(req("POST", "/x", { publicKey: "xx", backup, expectedVersion: 0 }))).status).toBe(400);
    expect((await postKey(req("POST", "/x", { publicKey: kp.publicB64, backup: { ...backup, iterations: 1000 }, expectedVersion: 0 }))).status).toBe(400);
    expect((await postKey(req("POST", "/x", { publicKey: kp.publicB64, backup, expectedVersion: 3 }))).status).toBe(409);

    const r = await postKey(req("POST", "/x", { publicKey: kp.publicB64, backup, expectedVersion: 0 }));
    expect(r.status).toBe(200);
    expect((await j(r)).key).toMatchObject({ version: 1, publicKey: kp.publicB64 });
    // دوباره «بارِ اول» → ۴۰۹ (دو دستگاه هم‌زمان)
    expect((await postKey(req("POST", "/x", { publicKey: kp.publicB64, backup, expectedVersion: 0 }))).status).toBe(409);

    const me = await j(await getMyKey());
    expect(me).toMatchObject({ userId: u, key: { version: 1, hasBackup: true } });
    expect(JSON.stringify(me)).not.toContain(backup.ciphertext);

    // دستگاهِ تازه: پشتیبان → کلیدِ یکسان
    const b = await j(await getBackup());
    const k = await unwrapPrivateKey(b.backup, pass, { userId: u, version: b.version, publicKey: b.publicKey });
    expect(k.type).toBe("private");
    const row = await prisma.userE2EKey.findFirstOrThrow({ where: { userId: u } });
    expect(JSON.stringify(row)).not.toContain(pass);

    // تغییرِ رمز: همان نسخه
    const b2 = await wrapPrivateKey(await unwrapPrivateKey(b.backup, pass, { userId: u, version: 1, publicKey: kp.publicB64 }, true), "رمز تازه‌ی خیلی طولانی", { userId: u, version: 1, publicKey: kp.publicB64 }, PBKDF2_MIN_ITERATIONS);
    expect((await putBackup(req("PUT", "/x", { version: 2, backup: b2 }))).status).toBe(409);
    expect((await putBackup(req("PUT", "/x", { version: 1, backup: b2 }))).status).toBe(200);

    // بازنشانی
    const kp2 = await generateIdentityKeyPair();
    const nb = await wrapPrivateKey(kp2.privateKey, "رمز سوم برای کلید تازه", { userId: u, version: 2, publicKey: kp2.publicB64 }, PBKDF2_MIN_ITERATIONS);
    expect((await postKey(req("POST", "/x", { publicKey: kp2.publicB64, backup: nb, expectedVersion: 1 }))).status).toBe(200);
    const rows = await prisma.userE2EKey.findMany({ where: { userId: u }, orderBy: { version: "asc" } });
    expect(rows.map((x) => [x.version, !!x.retiredAt, !!x.backupCiphertext])).toEqual([[1, true, false], [2, false, true]]);
    const audit = await prisma.auditLog.findMany({ where: { actorUserId: u }, select: { action: true } });
    expect(audit.map((a) => a.action).sort()).toEqual(["e2ee.key_create", "e2ee.key_reset", "e2ee.passcode_change"]);
  }, 60_000);

  it("کلیدِ عمومیِ دیگران فقط برای منتورِ منتشرشده یا طرفِ یک رابطه", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const x = await makeUser();
    await giveKey(m);
    await giveKey(x);
    as(s);
    const r = await j(await getPeerKey(req("GET", `/api/e2ee/keys/peer?userId=${m}`)));
    expect(r.keys).toHaveLength(1);
    expect((await getPeerKey(req("GET", `/api/e2ee/keys/peer?userId=${x}`))).status).toBe(404);
    as(null);
    expect((await getPeerKey(req("GET", `/api/e2ee/keys/peer?userId=${m}`))).status).toBe(401);
  });
});

// ───────────────────────── پیام‌ها ─────────────────────────

async function sendEnc(userId: string, msId: string, text: string, over: Record<string, unknown> = {}) {
  const { frankingKey, ...enc } = await encFor(msId, userId, text);
  as(userId);
  const res = await postMessage(req("POST", "/x", { ...enc, ...over }), P(msId));
  return { res, enc, frankingKey };
}

describe("گفت‌وگو: سرور هرگز متنِ ساده نمی‌گیرد و نمی‌دهد", () => {
  it("متنِ ساده ۴۰۰؛ ذخیره و پاسخ فقط رمزشده؛ طرفِ مقابل رمزگشایی می‌کند؛ اعلان بدونِ متن", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await giveKey(m);
    await giveKey(s);

    as(s);
    expect((await postMessage(req("POST", "/x", { body: "سلام" }), P(ms))).status).toBe(400);
    const good = await encFor(ms, s, "راز شاگرد ۴۲");
    const { frankingKey: _fk, ...enc } = good;
    expect((await postMessage(req("POST", "/x", { ...enc, body: "سلام" }), P(ms))).status).toBe(400);

    const { res } = await sendEnc(s, ms, "راز شاگرد ۴۲");
    expect(res.status).toBe(200);
    const out = await j(res);
    expect(JSON.stringify(out)).not.toContain("راز");

    const row = await prisma.mentorMessage.findFirstOrThrow({ where: { mentorshipId: ms } });
    expect(row.legacyBody).toBeNull();
    expect(JSON.stringify(row)).not.toContain("راز");
    expect(row.serverTag).toMatch(/^[A-Za-z0-9_-]+:/);

    as(m);
    const v = await j(await getMessages(req("GET", "/x"), P(ms)));
    expect(JSON.stringify(v)).not.toContain("راز");
    expect(((await openAs(m, ms, v.messages[0])) as any).text).toBe("راز شاگرد ۴۲");

    const notif = await prisma.inAppNotification.findFirstOrThrow({ where: { userId: m, type: "message.new" } });
    expect(notif.body).not.toContain("راز");

    // داشبوردِ منتور هم متن ندارد
    as(m);
    const dash = await j(await mentorDashboard());
    expect(JSON.stringify(dash)).not.toContain("راز");
  });

  it("نسخه‌ی کلید: کهنه → KEY_CHANGED؛ بدونِ کلیدِ طرف → PEER_NO_KEY؛ بدونِ کلیدِ خودم → NO_KEY", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await giveKey(s);

    as(s);
    // طرفِ مقابل کلید ندارد: کلاینت نمی‌تواند رمز کند؛ بسته‌ی دست‌ساز هم پذیرفته نمی‌شود
    const fake = { clientId: randomId(), ciphertext: toB64(new Uint8Array(64)), iv: toB64(new Uint8Array(12)), commitment: toB64(new Uint8Array(32)), senderKeyVersion: 1, recipientKeyVersion: 1 };
    const r0 = await postMessage(req("POST", "/x", fake), P(ms));
    expect(r0.status).toBe(409);
    expect((await j(r0)).code).toBe("PEER_NO_KEY");
    // اطلاع به طرف: یک اعلان، دومی نه
    expect((await j(await nudge(req("POST", "/x"), P(ms)))).sent).toBe(true);
    expect((await j(await nudge(req("POST", "/x"), P(ms)))).sent).toBe(false);

    await giveKey(m);
    const { res: ok } = await sendEnc(s, ms, "اول");
    expect(ok.status).toBe(200);

    // منتور کلیدش را عوض کرد؛ پیامی که هنوز با نسخه‌ی ۱ رمز شده رد می‌شود
    const stale = await encFor(ms, s, "کهنه");
    await giveKey(m);
    const { frankingKey: _f, ...st } = stale;
    as(s);
    const r1 = await postMessage(req("POST", "/x", st), P(ms));
    expect(r1.status).toBe(409);
    expect((await j(r1)).code).toBe("KEY_CHANGED");

    // کلیدهای گفت‌وگو: همه‌ی نسخه‌ها برای خواندنِ پیام‌های قدیمی
    as(s);
    const k = await j(await getConvKeys(req("GET", "/x"), P(ms)));
    expect(k.keys[m].map((x: any) => [x.version, x.current])).toEqual([[1, false], [2, true]]);
    const stranger = await makeUser();
    as(stranger);
    expect((await getConvKeys(req("GET", "/x"), P(ms))).status).toBe(404);

    const noKey = await makeUser();
    const ms2 = await connect(noKey, m);
    as(noKey);
    const r2 = await postMessage(req("POST", "/x", { ...fake, clientId: randomId() }), P(ms2));
    expect((await j(r2)).code).toBe("NO_KEY");
  });

  it("ضدِ replay: همان بسته دوباره = بی‌اثر؛ clientIdِ تکراری با محتوای دیگر ۴۰۹؛ بسته در گفت‌وگوی دیگر رمزگشایی نمی‌شود", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await giveKey(m);
    await giveKey(s);
    const { res, enc } = await sendEnc(s, ms, "یک بار");
    const first = (await j(res)).message.id;
    as(s);
    const again = await postMessage(req("POST", "/x", enc), P(ms));
    expect(again.status).toBe(200);
    expect((await j(again)).message.id).toBe(first);
    expect(await prisma.mentorMessage.count({ where: { mentorshipId: ms } })).toBe(1);

    const other = await encFor(ms, s, "دیگر", enc.clientId);
    const { frankingKey: _x, ...o } = other;
    as(s);
    const dup = await postMessage(req("POST", "/x", o), P(ms));
    expect(dup.status).toBe(409);
    expect((await j(dup)).code).toBe("DUPLICATE");

    // replay به گفت‌وگوی دیگرِ همین شاگرد: سرور ذخیره می‌کند ولی AAD/کلید نمی‌گذارد باز شود
    const m2 = await makeMentor();
    const ms2 = await connect(s, m2);
    await giveKey(m2);
    as(s);
    const k2 = await keyOf(m2);
    const moved = await postMessage(req("POST", "/x", { ...enc, recipientKeyVersion: k2.version }), P(ms2));
    expect(moved.status).toBe(200);
    as(m2);
    const v = await j(await getMessages(req("GET", "/x"), P(ms2)));
    await expect(openAs(m2, ms2, v.messages[0])).rejects.toBeInstanceOf(E2EEDecryptError);
  });
});

// ───────────────────────── گزارش (فرانکینگ) ─────────────────────────

describe("گزارشِ پیام: فقط همان یک پیامِ تأییدشده به ادمین می‌رسد", () => {
  it("جعلِ متن/کلید رد؛ گزارشِ درست دقیقا یک متنِ تأییدشده (رمزشده در سکون) ذخیره می‌کند؛ ادمین پیام‌های دیگر را نمی‌بیند", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await giveKey(m);
    await giveKey(s);

    const bad = await sendEnc(m, ms, "پیام آزارنده‌ی منتور");
    const other = await sendEnc(m, ms, "پیام خصوصی دیگر منتور");
    const mine = await sendEnc(s, ms, "پیام خصوصی شاگرد");
    const badId = (await j(bad.res)).message.id;
    const otherId = (await j(other.res)).message.id;
    const mineId = (await j(mine.res)).message.id;

    const report = (body: Record<string, unknown>) => { as(s); return postReport(req("POST", "/x", body)); };
    // بدونِ مدرک
    expect((await report({ targetType: "MESSAGE", targetId: badId, reason: "آزار" })).status).toBe(400);
    // متنِ جعلی (گزارش‌دهنده می‌خواهد متنی را به منتور نسبت دهد که نفرستاده)
    expect((await report({ targetType: "MESSAGE", targetId: badId, reason: "آزار", franking: { text: "متن ساختگی", frankingKey: bad.frankingKey } })).status).toBe(400);
    // کلیدِ فرانکینگِ پیامِ دیگر
    expect((await report({ targetType: "MESSAGE", targetId: badId, reason: "آزار", franking: { text: "پیام خصوصی دیگر منتور", frankingKey: other.frankingKey } })).status).toBe(400);
    // پیامِ خودش را نمی‌تواند گزارش کند
    expect((await report({ targetType: "MESSAGE", targetId: mineId, reason: "x", franking: { text: "پیام خصوصی شاگرد", frankingKey: mine.frankingKey } })).status).toBe(404);
    expect(await prisma.mentorReport.count({ where: { reporterId: s } })).toBe(0);

    // دست‌کاریِ برچسبِ سرور در DB (مثلا کسی با دسترسیِ نوشتن) → قابلِ تأیید نیست
    const orig = await prisma.mentorMessage.findUniqueOrThrow({ where: { id: badId }, select: { serverTag: true } });
    await prisma.mentorMessage.update({ where: { id: badId }, data: { serverTag: "n0:AAAA" } });
    expect((await report({ targetType: "MESSAGE", targetId: badId, reason: "آزار", franking: { text: "پیام آزارنده‌ی منتور", frankingKey: bad.frankingKey } })).status).toBe(400);
    await prisma.mentorMessage.update({ where: { id: badId }, data: { serverTag: orig.serverTag } });

    const ok = await report({ targetType: "MESSAGE", targetId: badId, reason: "آزار", franking: { text: "پیام آزارنده‌ی منتور", frankingKey: bad.frankingKey } });
    expect(ok.status).toBe(200);
    const rows = await prisma.mentorReport.findMany({ where: { reporterId: s } });
    expect(rows).toHaveLength(1);
    expect(rows[0].reportVerified).toBe(true);
    expect(rows[0].reportedText!.startsWith("enc1:")).toBe(true);
    expect(rows[0].reportedText).not.toContain("آزارنده");

    const admin = await makeUser({ adminPermissions: ["mentors"] });
    as(admin);
    const list = await j(await adminReports(req("GET", "/api/admin/mentors/reports?status=OPEN") as any));
    const mineRep = list.reports.find((r: any) => r.id === rows[0].id);
    expect(mineRep.target).toMatchObject({ kind: "MESSAGE", body: "پیام آزارنده‌ی منتور", verified: true });
    const all = JSON.stringify(list);
    expect(all).not.toContain("پیام خصوصی دیگر منتور");
    expect(all).not.toContain("پیام خصوصی شاگرد");
    expect(all).not.toContain(rows[0].reportedText!);
    void otherId;
  });

  it("ادمین هیچ مسیری به پیامِ گزارش‌نشده ندارد: جدولِ پیام فقط متنِ رمزشده دارد", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await giveKey(m);
    await giveKey(s);
    await sendEnc(s, ms, "هرگز نباید دیده شود");
    const all = await prisma.mentorMessage.findMany({ where: { mentorshipId: ms } });
    expect(JSON.stringify(all)).not.toContain("هرگز");
    const admin = await makeUser({ adminPermissions: ["mentors"] });
    as(admin);
    for (const st of ["OPEN", "RESOLVED", "DISMISSED"]) {
      const list = await j(await adminReports(req("GET", `/api/admin/mentors/reports?status=${st}`) as any));
      expect(JSON.stringify(list)).not.toContain("هرگز");
    }
  });
});

// ───────────────────────── پیام‌های قدیمی ─────────────────────────

describe("پیام‌های پیش از رمزگذاری", () => {
  it("فقط برای دو طرف؛ بازرمزگذاری با تعهدِ همان متن متنِ ساده را پاک می‌کند؛ متنِ دیگر رد؛ ۳۰ روزه پاک می‌شود", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    const legacy = await prisma.mentorMessage.create({ data: { mentorshipId: ms, senderId: m, legacyBody: "پیام قدیمی منتور" } });
    const old = await prisma.mentorMessage.create({ data: { mentorshipId: ms, senderId: s, legacyBody: "خیلی قدیمی", createdAt: new Date(Date.now() - 31 * 86_400_000) } });

    as(s);
    let v = await j(await getMessages(req("GET", "/x"), P(ms)));
    expect(v.messages.map((x: any) => x.legacyBody)).toEqual(["پیام قدیمی منتور"]);
    expect(await prisma.mentorMessage.count({ where: { id: old.id } })).toBe(0);

    await giveKey(m);
    await giveKey(s);
    // شاگرد پیامِ منتور را بازرمزگذاری می‌کند — با متنِ دیگر: رد
    const forged = await encFor(ms, m, "متن عوض‌شده");
    as(s);
    let r = await j(await postLegacy(req("POST", "/x", { items: [{ id: legacy.id, ...forged }] }), P(ms)));
    expect(r.migrated).toBe(0);
    const real = await encFor(ms, m, "پیام قدیمی منتور");
    as(s);
    r = await j(await postLegacy(req("POST", "/x", { items: [{ id: legacy.id, ...real }] }), P(ms)));
    expect(r.migrated).toBe(1);
    const row = await prisma.mentorMessage.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(row.legacyBody).toBeNull();
    expect(row.senderId).toBe(m);
    expect(row.createdAt.getTime()).toBe(legacy.createdAt.getTime());
    as(m);
    v = await j(await getMessages(req("GET", "/x"), P(ms)));
    expect(((await openAs(m, ms, v.messages[0])) as any)).toMatchObject({ text: "پیام قدیمی منتور", committed: true });
    // حالا قابلِ گزارشِ تأییدشده است (کلیدِ فرانکینگ را فقط دو طرف دارند)
    as(s);
    const rep = await postReport(req("POST", "/x", { targetType: "MESSAGE", targetId: legacy.id, reason: "x", franking: { text: "پیام قدیمی منتور", frankingKey: real.frankingKey } }));
    expect(rep.status).toBe(200);
  });

  it("گزارشِ پیامِ قدیمیِ هنوز بازرمزنشده: متنِ سرور، با برچسبِ «تأییدنشده»", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    const legacy = await prisma.mentorMessage.create({ data: { mentorshipId: ms, senderId: m, legacyBody: "قدیمی گزارش‌شده" } });
    as(s);
    expect((await postReport(req("POST", "/x", { targetType: "MESSAGE", targetId: legacy.id, reason: "x" }))).status).toBe(200);
    const rep = await prisma.mentorReport.findFirstOrThrow({ where: { reporterId: s } });
    expect(rep.reportVerified).toBe(false);
    expect(rep.reportedText).not.toContain("قدیمی");
  });

  it("CHECK: ردیفی که هم متنِ ساده و هم رمزشده دارد یا هیچ‌کدام، در DB رد می‌شود", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await expect(prisma.mentorMessage.create({ data: { mentorshipId: ms, senderId: m } })).rejects.toThrow();
    await expect(
      prisma.mentorMessage.create({ data: { mentorshipId: ms, senderId: m, legacyBody: "x", ciphertext: "y" } })
    ).rejects.toThrow();
  });
});

// ───────────────────────── ارسالِ گروهی ─────────────────────────

describe("ارسالِ گروهی", () => {
  it("هر گیرنده بسته‌ی جدای خودش؛ رابطه‌ی دیگران/بدونِ کلید/نسخه‌ی کهنه رد؛ فقط منتور", async () => {
    const m = await makeMentor();
    const s1 = await makeUser();
    const s2 = await makeUser();
    const s3 = await makeUser(); // بدونِ کلید
    const [ms1, ms2, ms3] = [await connect(s1, m), await connect(s2, m), await connect(s3, m)];
    const other = await makeMentor();
    const x = await makeUser();
    const msX = await connect(x, other);
    await Promise.all([giveKey(m), giveKey(s1), giveKey(s2), giveKey(x), giveKey(other)]);

    as(m);
    const g = await j(await getBroadcast());
    const byMs = Object.fromEntries(g.recipients.map((r: any) => [r.mentorshipId, r]));
    expect(byMs[ms1].key.version).toBe(1);
    expect(byMs[ms3].key).toBeNull();
    expect(byMs[msX]).toBeUndefined();

    const text = "برنامه‌ی هفته‌ی بعد از شنبه";
    const items = [];
    for (const ms of [ms1, ms2]) {
      const { frankingKey: _f, ...e } = await encFor(ms, m, text);
      items.push({ mentorshipId: ms, ...e });
    }
    const { frankingKey: _fx, ...ex } = await encFor(msX, other, text);
    items.push({ mentorshipId: msX, ...ex }); // رابطه‌ی منتورِ دیگر
    items.push({ ...items[0], mentorshipId: ms3, clientId: randomId() }); // بدونِ کلید
    as(m);
    const r = await j(await postBroadcast(req("POST", "/x", { items })));
    expect(r.sent).toBe(2);
    expect(r.failed.map((f: any) => f.code).sort()).toEqual(["NOT_FOUND", "PEER_NO_KEY"]);

    const rows = await prisma.mentorMessage.findMany({ where: { mentorshipId: { in: [ms1, ms2] } } });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((x) => x.broadcastId)).size).toBe(1);
    expect(rows[0].ciphertext).not.toBe(rows[1].ciphertext);
    expect(JSON.stringify(rows)).not.toContain("شنبه");
    as(s2);
    const v = await j(await getMessages(req("GET", "/x"), P(ms2)));
    expect(v.messages[0].broadcast).toBe(true);
    expect(((await openAs(s2, ms2, v.messages[0])) as any).text).toBe(text);
    expect(await prisma.mentorMessage.count({ where: { mentorshipId: msX } })).toBe(0);

    // شاگرد (غیرِ منتور) نمی‌تواند
    as(s1);
    expect((await postBroadcast(req("POST", "/x", { items }))).status).toBe(403);
  });
});

// ───────────────────────── رمزِ در حالِ سکون ─────────────────────────

describe("رمزگذاریِ در حالِ سکون (داده‌ای که سرور لازم دارد)", () => {
  it("فیدبکِ برنامه: در DB رمزشده، برای دو طرف خوانا، در اعلان نه", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    const prog = await prisma.mentorProgram.create({
      data: { mentorshipId: ms, mentorId: m, studentId: s, type: "ROUTINE", title: "برنامه‌ی تست", status: "ACTIVE", sentAt: new Date() },
    });
    as(m);
    const r = await postFeedback(req("POST", "/x", { body: "تمرین سه‌شنبه عالی بود" }), P(prog.id));
    expect(r.status).toBe(200);
    expect((await j(r)).feedback.body).toBe("تمرین سه‌شنبه عالی بود");
    const row = await prisma.mentorFeedback.findFirstOrThrow({ where: { programId: prog.id } });
    expect(row.body.startsWith("enc1:")).toBe(true);
    expect(row.body).not.toContain("سه‌شنبه");
    as(s);
    const v = await j(await getProgram(req("GET", "/x") as any, P(prog.id)));
    expect(v.feedback[0].body).toBe("تمرین سه‌شنبه عالی بود");
    const n = await prisma.inAppNotification.findFirstOrThrow({ where: { userId: s, type: "program.feedback" } });
    expect(n.body).not.toContain("سه‌شنبه");
    // مقدارِ رمزشده به برنامه‌ی دیگری منتقل‌شدنی نیست (AAD)
    const other = await prisma.mentorProgram.create({ data: { mentorshipId: ms, mentorId: m, studentId: s, type: "ROUTINE", title: "دیگر", status: "ACTIVE" } });
    await prisma.mentorFeedback.create({ data: { programId: other.id, mentorId: m, studentId: s, body: row.body } });
    as(s);
    const v2 = await j(await getProgram(req("GET", "/x") as any, P(other.id)));
    expect(v2.feedback[0].body).toBe("");
  });

  it("جوابِ سؤال‌های پذیرش: در DB رمزشده، برای منتور خوانا", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const ms = await connect(s, m);
    await prisma.$transaction((tx) => writeIntakeAnswers(tx, ms, [{ question: "هدفت؟", answer: "کنکور تجربی" }]));
    const rows = await prisma.mentorIntakeAnswer.findMany({ where: { mentorshipId: ms } });
    expect(rows[0].answer.startsWith("enc1:")).toBe(true);
    expect(rows[0].answer).not.toContain("کنکور");
    expect((await readIntakeAnswers([ms])).get(ms)).toEqual([{ question: "هدفت؟", answer: "کنکور تجربی" }]);
  });
});

// ───────────────────────── رابطه‌ی در انتظار ─────────────────────────

describe("دسترسی", () => {
  it("رابطه‌ی PENDING کلیدِ گفت‌وگو ندارد (۴۰۳)", async () => {
    const m = await makeMentor();
    const s = await makeUser();
    const pid = (await j(await requestMentorship(s, m))).mentorship.id;
    as(s);
    expect((await getConvKeys(req("GET", "/x"), P(pid))).status).toBe(403);
  });
});
