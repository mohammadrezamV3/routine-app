import { describe, it, expect, afterAll, vi } from "vitest";

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
import { GET as getMe, PUT as putMe } from "@/app/api/mentors/me/route";
import { POST as uploadDoc } from "@/app/api/mentors/me/documents/route";
import { GET as ownerDoc, DELETE as deleteDoc } from "@/app/api/mentors/me/documents/[docId]/route";
import { GET as adminDoc } from "@/app/api/admin/mentors/documents/[docId]/route";
import { POST as verify } from "@/app/api/admin/mentors/[profileId]/verification/route";
import { GET as mentorPage } from "@/app/api/mentors/[mentorId]/route";
import {
  as,
  req,
  j,
  formReq,
  makeUser,
  makeMentor,
  cleanupUsers,
  fileForm,
  pngBytes,
  pdfBytes,
  jpegBytes,
  exeBytes,
  htmlBytes,
} from "./helpers/mentorTestUtils";

// این فایل روی مدرکِ بدنسازی تمرکز داره — منتورِ پیش‌فرضِ fixture دو حوزه داره
const FITNESS_ONLY = { headline: "مربی", bio: "بیو", categories: ["FITNESS"], published: true };

afterAll(async () => {
  await cleanupUsers();
});

async function upload(userId: string | null, fd: FormData) {
  as(userId);
  return uploadDoc(formReq("/api/mentors/me/documents", fd));
}
async function profileOf(userId: string) {
  return (await prisma.mentorProfile.findUnique({ where: { userId } }))!;
}
async function adminVerify(adminId: string, profileId: string, body: Record<string, unknown>) {
  as(adminId);
  return verify(req("POST", `/api/admin/mentors/${profileId}/verification`, body), { params: { profileId } });
}
async function makeAdmin(perms: string[] = ["mentors"]) {
  return makeUser({ adminPermissions: perms });
}

describe("آپلودِ مدرک", () => {
  it("ناشناس ۴۰۱؛ بدونِ پروفایلِ منتوری ۴۰۳", async () => {
    expect((await upload(null, fileForm(pngBytes(), "id.png", "IDENTITY"))).status).toBe(401);
    const u = await makeUser();
    expect((await upload(u, fileForm(pngBytes(), "id.png", "IDENTITY"))).status).toBe(403);
  });

  it("PNG هویت → PENDING + event؛ PDF مدرک → credential PENDING + event؛ mime از محتوا", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const r = await upload(m, fileForm(pngBytes(200), "../../etc/passwd.pdf", "IDENTITY", undefined, "application/pdf"));
    expect(r.status).toBe(200);
    const doc = (await j(r)).document;
    expect(doc.mimeType).toBe("image/png");
    expect(doc.fileName).toBe("passwd.png");
    expect(doc).not.toHaveProperty("data");
    const prof = await profileOf(m);
    expect(prof.identityStatus).toBe("PENDING");

    const r2 = await upload(m, fileForm(pdfBytes(300), "cert.pdf", "CERTIFICATE", "FITNESS"));
    expect(r2.status).toBe(200);
    const cred = await prisma.mentorCredential.findUnique({ where: { profileId_category: { profileId: prof.id, category: "FITNESS" } } });
    expect(cred!.status).toBe("PENDING");

    const events = await prisma.mentorVerificationEvent.findMany({ where: { profileId: prof.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => [e.kind, e.category, e.fromStatus, e.toStatus])).toEqual([
      ["IDENTITY", null, "NOT_PROVIDED", "PENDING"],
      ["CERTIFICATE", "FITNESS", "NOT_PROVIDED", "PENDING"],
    ]);

    const me = await j(await getMe());
    expect(me.profile.documents).toHaveLength(2);
    expect(JSON.stringify(me.profile.documents)).not.toContain("\"data\"");
  });

  it("HTML یا اجرایی (MZ) با اسمِ .png → ۴۱۵ و چیزی ذخیره نمی‌شود", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    expect((await upload(m, fileForm(htmlBytes(), "x.png", "IDENTITY", undefined, "image/png"))).status).toBe(415);
    expect((await upload(m, fileForm(exeBytes(), "x.png", "IDENTITY", undefined, "image/png"))).status).toBe(415);
    const prof = await profileOf(m);
    expect(await prisma.mentorDocument.count({ where: { profileId: prof.id } })).toBe(0);
    expect(prof.identityStatus).toBe("NOT_PROVIDED");
  });

  it("فایلِ بزرگ‌تر از ۵MB در فرم → ۴۱۳", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const big = pngBytes(5 * 1024 * 1024 + 1);
    expect((await upload(m, fileForm(big, "big.png", "IDENTITY"))).status).toBe(413);
  });

  it("بدنه‌ی استریم‌شده‌ی بزرگ بدونِ content-length → ۴۱۳ (سقف حینِ خواندن)", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    as(m);
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(ctrl) {
        if (sent >= 8) return ctrl.close();
        sent++;
        ctrl.enqueue(chunk);
      },
    });
    const r = new NextRequest("http://localhost/api/mentors/me/documents", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=xyz" },
      body: stream,
      duplex: "half",
    } as any);
    expect(r.headers.get("content-length")).toBeNull();
    const res = await uploadDoc(r);
    expect(res.status).toBe(413);
    // خواندن قبل از تمام‌شدنِ استریم قطع شد
    expect(sent).toBeLessThan(8);
  });

  it("content-lengthِ اعلام‌شده‌ی بزرگ → ۴۱۳ بدونِ خواندن", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    as(m);
    const r = new NextRequest("http://localhost/api/mentors/me/documents", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=xyz", "content-length": String(50 * 1024 * 1024) },
      body: "x",
    });
    expect((await uploadDoc(r)).status).toBe(413);
  });

  it("مدرکِ دسته‌ای که در پروفایل نیست → ۴۰۰؛ kind نامعتبر ۴۰۰؛ بدونِ فایل ۴۰۰", async () => {
    const m = await makeMentor({}, FITNESS_ONLY); // فقط FITNESS
    expect((await upload(m, fileForm(pngBytes(), "c.png", "CERTIFICATE", "NUTRITION"))).status).toBe(400);
    expect((await upload(m, fileForm(pngBytes(), "c.png", "CERTIFICATE", "HACKING"))).status).toBe(400);
    expect((await upload(m, fileForm(pngBytes(), "c.png", "PASSPORT"))).status).toBe(400);
    const fd = new FormData();
    fd.set("kind", "IDENTITY");
    expect((await upload(m, fd)).status).toBe(400);
  });
});

describe("بررسیِ ادمین", () => {
  it("تأیید → VERIFIED + event + اعلان + نشانِ تأیید روی کارت؛ مدرک هم", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const admin = await makeAdmin();
    await upload(m, fileForm(jpegBytes(), "id.jpg", "IDENTITY"));
    await upload(m, fileForm(pdfBytes(), "cert.pdf", "CERTIFICATE", "FITNESS"));
    const prof = await profileOf(m);

    const viewer = await makeUser();
    as(viewer);
    let card = (await j(await mentorPage(req("GET", "/x"), { params: { mentorId: m } }))).mentor;
    expect(card.identityVerified).toBe(false);
    expect(card.certifications).toEqual([{ category: "FITNESS", verified: false }]);

    const r = await adminVerify(admin, prof.id, { kind: "IDENTITY", status: "VERIFIED" });
    expect(r.status).toBe(200);
    expect(await j(r)).toMatchObject({ ok: true, fromStatus: "PENDING", status: "VERIFIED" });
    expect((await adminVerify(admin, prof.id, { kind: "CERTIFICATE", category: "FITNESS", status: "VERIFIED" })).status).toBe(200);
    // تکرارِ همان وضعیت → ۴۰۰
    expect((await adminVerify(admin, prof.id, { kind: "IDENTITY", status: "VERIFIED" })).status).toBe(400);

    expect((await profileOf(m)).identityStatus).toBe("VERIFIED");
    const ev = await prisma.mentorVerificationEvent.findMany({ where: { profileId: prof.id, actorUserId: admin } });
    expect(ev).toHaveLength(2);
    expect(await prisma.inAppNotification.count({ where: { userId: m, type: "verification.result" } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { actorUserId: admin, action: { in: ["mentor.verify_identity", "mentor.verify_certificate"] } } })).toBe(2);

    as(viewer);
    card = (await j(await mentorPage(req("GET", "/x"), { params: { mentorId: m } }))).mentor;
    expect(card.identityVerified).toBe(true);
    expect(card.certifications).toEqual([{ category: "FITNESS", verified: true }]);

    // مدرکِ تأییدشده قابلِ حذف نیست
    const docId = (await prisma.mentorDocument.findFirst({ where: { profileId: prof.id, kind: "IDENTITY" } }))!.id;
    as(m);
    expect((await deleteDoc(req("DELETE", "/x"), { params: { docId } })).status).toBe(409);

    // ارسالِ مدرکِ تازه بعد از VERIFIED → دوباره PENDING
    await upload(m, fileForm(pngBytes(), "id2.png", "IDENTITY"));
    expect((await profileOf(m)).identityStatus).toBe("PENDING");
  });

  it("رد بدونِ دلیل ۴۰۰؛ با دلیل → دلیل در /api/mentors/me دیده می‌شود", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const admin = await makeAdmin();
    await upload(m, fileForm(pngBytes(), "id.png", "IDENTITY"));
    await upload(m, fileForm(pngBytes(), "c.png", "CERTIFICATE", "FITNESS"));
    const prof = await profileOf(m);
    expect((await adminVerify(admin, prof.id, { kind: "IDENTITY", status: "REJECTED" })).status).toBe(400);
    expect((await adminVerify(admin, prof.id, { kind: "IDENTITY", status: "REJECTED", reason: "   " })).status).toBe(400);
    expect((await adminVerify(admin, prof.id, { kind: "IDENTITY", status: "REJECTED", reason: "تصویر ناخواناست" })).status).toBe(200);
    expect((await adminVerify(admin, prof.id, { kind: "CERTIFICATE", category: "FITNESS", status: "REJECTED", reason: "مدرک معتبر نیست" })).status).toBe(200);
    expect((await adminVerify(admin, prof.id, { kind: "CERTIFICATE", status: "VERIFIED" })).status).toBe(400);
    expect((await adminVerify(admin, prof.id, { kind: "BOGUS", status: "VERIFIED" })).status).toBe(400);

    as(m);
    const me = (await j(await getMe())).profile;
    expect(me.identityStatus).toBe("REJECTED");
    expect(me.identityRejectReason).toBe("تصویر ناخواناست");
    expect(me.credentials).toEqual([{ category: "FITNESS", status: "REJECTED", rejectReason: "مدرک معتبر نیست" }]);
  });

  it("پروفایلِ ناموجود ۴۰۴", async () => {
    const admin = await makeAdmin();
    expect((await adminVerify(admin, "nope", { kind: "IDENTITY", status: "VERIFIED" })).status).toBe(404);
  });
});

describe("دانلودِ مدرک", () => {
  it("صاحب: هدرهای امن و بایت‌های درست؛ دیگران: روتِ صاحب ۴۰۴، روتِ ادمین ۴۰۱/۴۰۳", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const bytes = pngBytes(128);
    const doc = (await j(await upload(m, fileForm(bytes, "کارت ملی.png", "IDENTITY")))).document;

    as(m);
    const r = await ownerDoc(req("GET", "/x"), { params: { docId: doc.id } });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(r.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(bytes);

    const other = await makeMentor({}, FITNESS_ONLY);
    as(other);
    expect((await ownerDoc(req("GET", "/x"), { params: { docId: doc.id } })).status).toBe(404);
    expect((await deleteDoc(req("DELETE", "/x"), { params: { docId: doc.id } })).status).toBe(404);
    // کاربرِ عادی روی روتِ ادمین
    expect((await adminDoc(req("GET", "/x") as any, { params: { docId: doc.id } })).status).toBe(401);
    as(null);
    expect((await ownerDoc(req("GET", "/x"), { params: { docId: doc.id } })).status).toBe(401);
    expect((await adminDoc(req("GET", "/x") as any, { params: { docId: doc.id } })).status).toBe(401);
    // ادمینِ بدونِ دسترسیِ mentors
    const support = await makeAdmin(["support"]);
    as(support);
    expect((await adminDoc(req("GET", "/x") as any, { params: { docId: doc.id } })).status).toBe(403);

    // ادمینِ mentors: دریافت + AuditLog + هدرهای امن
    const admin = await makeAdmin();
    as(admin);
    const ar = await adminDoc(req("GET", "/x") as any, { params: { docId: doc.id } });
    expect(ar.status).toBe(200);
    expect(ar.headers.get("x-content-type-options")).toBe("nosniff");
    expect(ar.headers.get("cache-control")).toBe("private, no-store");
    expect(ar.headers.get("content-security-policy")).toContain("sandbox");
    expect(await prisma.auditLog.count({ where: { actorUserId: admin, action: "mentor.document_view", targetId: m } })).toBe(1);
  });

  it("صاحب مدرکِ PENDING را حذف می‌کند → وضعیت NOT_PROVIDED", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const doc = (await j(await upload(m, fileForm(pngBytes(), "id.png", "IDENTITY")))).document;
    as(m);
    expect((await deleteDoc(req("DELETE", "/x"), { params: { docId: doc.id } })).status).toBe(200);
    expect((await profileOf(m)).identityStatus).toBe("NOT_PROVIDED");
  });
});

describe("PUT /api/mentors/me — mass assignment", () => {
  it("identityStatus/ratingAvg/suspendedAt/userId از بدنه نوشته نمی‌شوند", async () => {
    const m = await makeMentor({}, FITNESS_ONLY);
    const victim = await makeUser();
    as(m);
    const r = await putMe(
      req("PUT", "/api/mentors/me", {
        headline: "جدید",
        identityStatus: "VERIFIED",
        identityRejectReason: "x",
        ratingAvg: 5,
        ratingCount: 999,
        suspendedAt: null,
        userId: victim,
        id: "hack",
      })
    );
    expect(r.status).toBe(200);
    const p = await profileOf(m);
    expect(p.headline).toBe("جدید");
    expect(p.identityStatus).toBe("NOT_PROVIDED");
    expect(p.ratingAvg).toBe(0);
    expect(p.ratingCount).toBe(0);
    expect(await prisma.mentorProfile.count({ where: { userId: victim } })).toBe(0);

    // منتورِ تعلیق‌شده نمی‌تواند با PUT تعلیق را بردارد
    await prisma.mentorProfile.update({ where: { userId: m }, data: { suspendedAt: new Date(), suspendedReason: "x" } });
    as(m);
    await putMe(req("PUT", "/api/mentors/me", { suspendedAt: null, suspendedReason: null, bio: "b2" }));
    const p2 = await profileOf(m);
    expect(p2.suspendedAt).not.toBeNull();
    expect(p2.suspendedReason).toBe("x");
    expect(p2.bio).toBe("b2");
  });

  it("انتشار بدونِ bio یا دسته ۴۰۰؛ دسته‌ی نامعتبر حذف می‌شود؛ ساختِ اولیه credential می‌سازد", async () => {
    const u = await makeUser();
    as(u);
    expect((await putMe(req("PUT", "/x", { published: true, categories: ["FITNESS"] }))).status).toBe(400);
    expect((await putMe(req("PUT", "/x", { published: true, bio: "b", categories: ["HACK"] }))).status).toBe(400);
    const r = await putMe(req("PUT", "/x", { bio: "b", categories: ["NUTRITION", "HACK"] }));
    expect(r.status).toBe(200);
    const prof = (await j(r)).profile;
    expect(prof.categories).toEqual(["NUTRITION"]);
    expect(prof.credentials).toEqual([{ category: "NUTRITION", status: "NOT_PROVIDED", rejectReason: null }]);
    expect((await j(await getMe())).profile.userId).toBe(u);
  });

  it("routineRole: فقط با دسته‌ی ROUTINE ذخیره می‌شود؛ بلند ۴۰۰؛ برداشتنِ ROUTINE پاکش می‌کند", async () => {
    const u = await makeUser();
    as(u);
    let r = await putMe(req("PUT", "/x", { bio: "b", categories: ["ROUTINE"], routineRole: "  استاد   ریاضی " }));
    expect(r.status).toBe(200);
    expect((await j(r)).profile.routineRole).toBe("استاد ریاضی");
    expect((await putMe(req("PUT", "/x", { routineRole: "x".repeat(61) }))).status).toBe(400);
    expect((await profileOf(u)).routineRole).toBe("استاد ریاضی");
    r = await putMe(req("PUT", "/x", { categories: ["FITNESS"] }));
    expect((await j(r)).profile.routineRole).toBeNull();
    r = await putMe(req("PUT", "/x", { categories: ["FITNESS"], routineRole: "مشاور" }));
    expect((await j(r)).profile.routineRole).toBeNull();
  });

  it("GET /api/mentors/me برای غیرمنتور null", async () => {
    as(await makeUser());
    expect((await j(await getMe())).profile).toBeNull();
  });
});
