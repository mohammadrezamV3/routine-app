import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { isSealedNote } from "@/lib/e2ee/notes";
import { parseWraps, publicKeysFor } from "@/lib/e2ee/server";

// انتقال سابقه بین کلیدهای *یک* کاربر (docs/mentor-e2ee.md): دستگاهی که کلید from
// را دارد، CEK هر پیام را باز و برای کلید to (کلید فعال دیگر همین کاربر) بسته‌بندی
// می‌کند. سرور فقط بسته‌بندی‌های تازه (via = from) را کنار پیام می‌گذارد؛ متن رمزشده،
// تعهد فرانکینگ و برچسب سرور دست نمی‌خورند. یادداشت‌های خصوصی منتور هم دوباره رمز می‌شوند.

const PAGE = 200;
const MAX_WRAPS = 300;
const MAX_NOTES = 200;

const int = (v: string | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 1e6 ? n : null;
};

// GET /api/e2ee/history?from=V&to=W[&cursor=] → { items, keys, next }
// GET /api/e2ee/history?notes=1 → { notes: [{ id, studentId, body }] }
export async function GET(req: NextRequest) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  const sp = req.nextUrl.searchParams;
  if (!(await checkRateLimit(`e2ee-history-get:${me}`, 300, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }

  if (sp.get("notes") === "1") {
    const notes = await prisma.mentorStudentNote.findMany({
      where: { mentorId: me, mentorship: { mentorId: me } },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { id: true, body: true, mentorship: { select: { studentId: true } } },
    });
    return NextResponse.json({ notes: notes.map((n) => ({ id: n.id, studentId: n.mentorship.studentId, body: n.body })) });
  }

  const from = int(sp.get("from"));
  const to = int(sp.get("to"));
  if (!from || !to || from === to) return badRequest("پارامترها نامعتبر است");
  const cursor = sp.get("cursor");
  const rows = await prisma.mentorMessageKeyWrap.findMany({
    where: {
      userId: me,
      keyVersion: from,
      ...(cursor ? { id: { gt: cursor.slice(0, 64) } } : {}),
      message: { scheme: 2, wraps: { none: { userId: me, keyVersion: to } }, mentorship: { OR: [{ mentorId: me }, { studentId: me }] } },
    },
    orderBy: { id: "asc" },
    take: PAGE,
    select: {
      id: true,
      message: {
        select: {
          id: true,
          mentorshipId: true,
          clientId: true,
          senderId: true,
          keyFromId: true,
          senderKeyVersion: true,
          wraps: { where: { userId: me }, select: { userId: true, keyVersion: true, wrap: true, viaVersion: true } },
        },
      },
    },
  });
  const users = new Set<string>([me]);
  const items = rows.map((r) => {
    const m = r.message;
    const fromU = m.keyFromId ?? m.senderId;
    users.add(fromU);
    return {
      messageId: m.id,
      mentorshipId: m.mentorshipId,
      clientId: m.clientId,
      from: { u: fromU, k: m.senderKeyVersion },
      wraps: m.wraps.map((w) => (w.viaVersion != null ? { u: w.userId, k: w.keyVersion, w: w.wrap, via: w.viaVersion } : { u: w.userId, k: w.keyVersion, w: w.wrap })),
    };
  });
  const keys = await publicKeysFor(Array.from(users));
  return NextResponse.json({
    items,
    keys: Object.fromEntries(Object.entries(keys).map(([u, rs]) => [u, rs.map((k) => ({ version: k.version, publicKey: k.publicKey }))])),
    next: rows.length === PAGE ? rows[rows.length - 1].id : null,
  });
}

// POST /api/e2ee/history { target, wraps?: [{ messageId, wrap: { u, k, w, via } }], notes?: [{ id, prev, body }] }
export async function POST(req: Request) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const me = g.userId;
  if (!(await checkRateLimit(`e2ee-history-post:${me}`, 300, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بوده؛ کمی بعد دوباره تلاش کن" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 512 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const b = parsed.body || {};
  const target = Number.isInteger(b.target) ? (b.target as number) : null;
  if (!target) return badRequest("کلید مقصد نامعتبر است");
  const myKeys = await prisma.userE2EKey.findMany({ where: { userId: me }, select: { version: true, retiredAt: true } });
  if (!myKeys.some((k) => k.version === target && !k.retiredAt)) return badRequest("کلید مقصد فعال نیست");
  const mine = new Set(myKeys.map((k) => k.version));

  let added = 0;
  const items = Array.isArray(b.wraps) ? b.wraps : [];
  if (items.length > MAX_WRAPS) return badRequest("تعداد زیاد است");
  if (items.length) {
    // بسته‌بندی‌ها همه برای همان یک کلیدند؛ parseWraps یکتایی (u,k) را می‌خواهد، پس یکی‌یکی
    const ok: { messageId: string; w: string; via: number }[] = [];
    for (const it of items) {
      const one = parseWraps([it?.wrap], 1, true)?.[0];
      if (!one || typeof it.messageId !== "string" || it.messageId.length > 64) continue;
      if (one.u !== me || one.k !== target || one.via === undefined || !mine.has(one.via) || one.via === target) continue;
      ok.push({ messageId: it.messageId, w: one.w, via: one.via });
    }
    if (ok.length) {
      const allowed = await prisma.mentorMessage.findMany({
        where: { id: { in: ok.map((o) => o.messageId) }, scheme: 2, mentorship: { OR: [{ mentorId: me }, { studentId: me }] } },
        select: { id: true },
      });
      const allowedIds = new Set(allowed.map((a) => a.id));
      const r = await prisma.mentorMessageKeyWrap.createMany({
        data: ok.filter((o) => allowedIds.has(o.messageId)).map((o) => ({ messageId: o.messageId, userId: me, keyVersion: target, wrap: o.w, viaVersion: o.via })),
        skipDuplicates: true,
      });
      added = r.count;
    }
  }

  let notes = 0;
  const ns = Array.isArray(b.notes) ? b.notes : [];
  if (ns.length > MAX_NOTES) return badRequest("تعداد زیاد است");
  for (const n of ns) {
    if (!n || typeof n.id !== "string" || typeof n.prev !== "string" || !isSealedNote(n.body)) continue;
    const r = await prisma.mentorStudentNote.updateMany({ where: { id: n.id, mentorId: me, body: n.prev }, data: { body: n.body } });
    notes += r.count;
  }
  return NextResponse.json({ added, notes });
}
