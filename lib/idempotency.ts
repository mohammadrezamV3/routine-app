import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REQUEST_ID_HEADER } from "@/lib/offline/types";

// بازپخش امن نوشتن‌های آفلاین: کلاینت هدر x-arion-request-id رو روی هر نوشتن
// صف‌شده می‌فرسته. اگه سرور commit کرده باشه ولی جواب به کلاینت نرسیده باشه،
// بازپخش همون پاسخ ذخیره‌شده رو می‌گیره و دوباره چیزی ساخته نمی‌شه.

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const MAX_BODY_BYTES = 64 * 1024;
const RETENTION_MS = 30 * 24 * 3600_000;
const PRUNE_EVERY_MS = 3600_000;

const MAX_STRING_CHARS = 2048;

let lastPrune = 0;

// رشته‌های خیلی بلند (مثل dataUrl تصویر) null می‌شن ولی ساختار و idها می‌مونن
// تا کلاینت بتونه idهای موقت رو از پاسخ تکراری به idهای واقعی تبدیل کنه.
function stripLongStrings(v: unknown): unknown {
  if (typeof v === "string") return v.length > MAX_STRING_CHARS ? null : v;
  if (Array.isArray(v)) return v.map(stripLongStrings);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = stripLongStrings(val);
    return out;
  }
  return v;
}

export function readRequestId(req: Request): string | null {
  const raw = req.headers.get(REQUEST_ID_HEADER);
  if (!raw) return null;
  const key = raw.trim();
  return KEY_RE.test(key) ? key : null;
}

function pruneOld() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_EVERY_MS) return;
  lastPrune = now;
  void prisma.requestReceipt
    .deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_MS) } } })
    .catch(() => {});
}

function replay(receipt: { status: number; response: Prisma.JsonValue | null }) {
  const body = receipt.response ?? { ok: true, duplicate: true };
  return NextResponse.json(body, { status: receipt.status });
}

async function findReceipt(userId: string, key: string) {
  return prisma.requestReceipt.findUnique({
    where: { userId_key: { userId, key } },
    select: { status: true, response: true },
  });
}

export async function withIdempotency(
  req: Request,
  userId: string,
  route: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = readRequestId(req);
  if (!key) return handler();

  const existing = await findReceipt(userId, key);
  if (existing) return replay(existing);

  const res = await handler();
  if (res.status < 200 || res.status >= 300) return res;

  let body: Prisma.InputJsonValue | undefined;
  try {
    const text = await res.clone().text();
    if (text) {
      if (Buffer.byteLength(text, "utf8") <= MAX_BODY_BYTES) {
        body = JSON.parse(text);
      } else {
        const reduced = JSON.stringify(stripLongStrings(JSON.parse(text)));
        if (Buffer.byteLength(reduced, "utf8") <= MAX_BODY_BYTES) body = JSON.parse(reduced);
      }
    }
  } catch {
    body = undefined;
  }

  try {
    await prisma.requestReceipt.create({
      data: { userId, key, route: route.slice(0, 60), status: res.status, ...(body !== undefined ? { response: body } : {}) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await findReceipt(userId, key);
      if (winner) return replay(winner);
    }
    // ذخیره‌ی رسید نباید جواب موفق رو خراب کنه
  }
  pruneOld();
  return res;
}
