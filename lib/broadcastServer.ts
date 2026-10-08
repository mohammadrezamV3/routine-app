import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppSetting, setAppSetting } from "@/lib/appSettings";
import { isPushConfigured, sendPushToUser } from "@/lib/webPush";
import { publishToUser } from "@/lib/realtime";
import {
  BROADCAST_SETTING_KEY, BroadcastChannel, BroadcastInput, BroadcastRecord, BroadcastSegment,
  dueBroadcastIds, normalizeBroadcasts, trimBroadcasts, wantsInApp, wantsPush,
} from "@/lib/broadcast";

// ارسال پیام همگانی. از همون سیستم اعلان/پوش اپ استفاده می‌کنه
// (InAppNotification + sendPushToUser) و سیستم تحویل جدیدی نمی‌سازه.
//
// ضدتکرار: هر اجرا (run) با ساخت یک ردیف AppSetting با کلید یکتای
// `broadcast_run:<id>:<n>` «ادعا» می‌شه (create اتمیک؛ P2002 = یکی دیگه برنده شد).
// ارسال تکه‌تکه (CHUNK نفر) با مکان‌نمای userId؛ اجرای نیمه‌کاره بعد از
// انقضای قفل (LEASE_MS) از همون مکان‌نما ادامه پیدا می‌کنه.

const CHUNK = 200;
const PUSH_CONCURRENCY = 20;
const LEASE_MS = 90_000;
const DEFAULT_BUDGET_MS = 25_000;
const INAPP_TYPE = "broadcast";

// قفل درون‌پردازه‌ای برای read-modify-write لیست (هم‌راستا با فرض بقیه‌ی پروژه)
let listLock: Promise<unknown> = Promise.resolve();

export async function readBroadcasts(): Promise<BroadcastRecord[]> {
  // این لیست باید همیشه تازه باشه (کش 60 ثانیه‌ای getAppSetting نه)
  const row = await prisma.appSetting.findUnique({ where: { key: BROADCAST_SETTING_KEY } });
  return normalizeBroadcasts(row?.value);
}

/** تغییر اتمیک (درون‌پردازه) یک یا چند رکورد؛ fn می‌تونه null بده = بدون تغییر */
export async function mutateBroadcasts<T>(fn: (list: BroadcastRecord[]) => { list: BroadcastRecord[]; result: T } | null): Promise<T | null> {
  const run = listLock.then(async () => {
    const list = await readBroadcasts();
    const out = fn(list);
    if (!out) return null;
    await setAppSetting(BROADCAST_SETTING_KEY, trimBroadcasts(out.list));
    return out.result;
  });
  listLock = run.catch(() => undefined);
  return run;
}

async function patchBroadcast(id: string, patch: (b: BroadcastRecord) => BroadcastRecord): Promise<BroadcastRecord | null> {
  return mutateBroadcasts((list) => {
    const i = list.findIndex((b) => b.id === id);
    if (i < 0) return null;
    const next = patch(list[i]);
    const copy = list.slice();
    copy[i] = next;
    return { list: copy, result: next };
  });
}

export function segmentWhere(seg: BroadcastSegment, now: Date = new Date()): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { deletedAt: null, isBlocked: false };
  switch (seg.kind) {
    case "all":
      return base;
    case "paid":
      return { ...base, subscriptions: { some: { status: "ACTIVE", currentPeriodEnd: { gt: now } } } };
    case "trial":
      return { ...base, subscriptions: { some: { status: "TRIAL", currentPeriodEnd: { gt: now } } } };
    case "inactive": {
      const cutoff = new Date(now.getTime() - 7 * 86_400_000);
      return { ...base, createdAt: { lt: cutoff }, sessions: { none: { lastSeenAt: { gte: cutoff } } } };
    }
    case "module":
      return {
        ...base,
        moduleAccess: {
          some: { module: seg.module!, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        },
      };
    case "admins":
      return { ...base, OR: [{ isSuperAdmin: true }, { adminPermissions: { isEmpty: false } }] };
  }
}

/** تخمین تعداد گیرنده‌ها: کل مخاطب + تعدادی که دستگاه پوش ثبت‌شده دارن */
export async function estimateRecipients(seg: BroadcastSegment): Promise<{ total: number; withPush: number }> {
  const where = segmentWhere(seg);
  const [total, withPush] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { AND: [where, { pushSubscriptions: { some: {} } }] } }),
  ]);
  return { total, withPush };
}

export async function createBroadcast(input: BroadcastInput, author: { id: string; name: string | null }): Promise<BroadcastRecord> {
  const now = new Date();
  const rec: BroadcastRecord = {
    id: `bc_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    body: input.body,
    url: input.url,
    channels: input.channels,
    segment: input.segment,
    status: "scheduled",
    sendAt: input.sendAt ?? now.toISOString(),
    createdAt: now.toISOString(),
    createdBy: author.id,
    createdByName: author.name,
    runs: 0,
    leaseUntil: null,
    cursor: null,
    recipients: 0,
    delivered: 0,
    pushSent: 0,
    startedAt: null,
    sentAt: null,
    error: null,
  };
  await mutateBroadcasts((list) => ({ list: [rec, ...list], result: null }));
  return rec;
}

/** لغو: فقط زمان‌بندی‌شده. true اگه لغو شد */
export async function cancelBroadcast(id: string): Promise<boolean> {
  const out = await mutateBroadcasts((list) => {
    const i = list.findIndex((b) => b.id === id);
    if (i < 0 || list[i].status !== "scheduled") return null;
    const copy = list.slice();
    copy[i] = { ...list[i], status: "canceled" };
    return { list: copy, result: true };
  });
  return out === true;
}

function isUnique(err: any) { return err?.code === "P2002"; }

async function deliverChunk(b: BroadcastRecord, userIds: string[]): Promise<{ delivered: number; pushSent: number; pushOk: boolean }> {
  const inapp = wantsInApp(b.channels);
  const push = wantsPush(b.channels);
  let delivered = 0;
  if (inapp) {
    const r = await prisma.inAppNotification.createMany({
      data: userIds.map((userId) => ({ userId, type: INAPP_TYPE, title: b.title.slice(0, 120), body: b.body.slice(0, 500), url: b.url })),
    });
    delivered = r.count;
    for (const userId of userIds) void publishToUser(userId, { type: "notification.new", keys: ["notifications"] });
  }
  let pushSent = 0;
  const pushOk = !push || isPushConfigured();
  if (push && pushOk) {
    for (let i = 0; i < userIds.length; i += PUSH_CONCURRENCY) {
      const part = userIds.slice(i, i + PUSH_CONCURRENCY);
      const res = await Promise.all(
        part.map((uid) => sendPushToUser(uid, { title: b.title, body: b.body, url: b.url ?? undefined, tag: `broadcast-${b.id}` }).catch(() => null))
      );
      pushSent += res.filter((x) => x && x.sent > 0).length;
    }
    if (!inapp) delivered = pushSent;
  }
  return { delivered, pushSent, pushOk };
}

/** یک پیام رو (تا سقف زمانی) ارسال/ادامه می‌ده. هیچ‌وقت بیش از یک بار برای هر شناسه هم‌زمان اجرا نمی‌شه */
export async function runBroadcast(id: string, budgetMs = DEFAULT_BUDGET_MS): Promise<BroadcastRecord | null> {
  const t0 = Date.now();
  const cur = (await readBroadcasts()).find((b) => b.id === id);
  if (!cur || (cur.status !== "scheduled" && cur.status !== "sending")) return cur ?? null;
  if (cur.status === "scheduled" && new Date(cur.sendAt).getTime() > Date.now()) return cur;
  if (cur.status === "sending" && cur.leaseUntil && new Date(cur.leaseUntil).getTime() > Date.now()) return cur;

  try {
    await prisma.appSetting.create({ data: { key: `broadcast_run:${id}:${cur.runs + 1}`, value: { at: new Date().toISOString() } } });
  } catch (err) {
    if (isUnique(err)) return cur; // اجرای دیگه‌ای برنده شد
    throw err;
  }

  let b = await patchBroadcast(id, (x) =>
    x.status === "scheduled" || x.status === "sending"
      ? { ...x, status: "sending", runs: x.runs + 1, leaseUntil: new Date(Date.now() + LEASE_MS).toISOString(), startedAt: x.startedAt ?? new Date().toISOString() }
      : x
  );
  if (!b || b.status !== "sending") return b;

  if (wantsPush(b.channels) && !wantsInApp(b.channels) && !isPushConfigured()) {
    return patchBroadcast(id, (x) => ({ ...x, status: "failed", leaseUntil: null, error: "کلیدهای VAPID روی سرور تنظیم نشده‌اند" }));
  }

  const where = segmentWhere(b.segment);
  try {
    for (;;) {
      // لغو یا اجرای هم‌زمان دیگه: لیست تازه
      const fresh = (await readBroadcasts()).find((x) => x.id === id);
      if (!fresh || fresh.status !== "sending") return fresh ?? null;
      const users = await prisma.user.findMany({
        where: { AND: [where, ...(fresh.cursor ? [{ id: { gt: fresh.cursor } }] : [])] },
        orderBy: { id: "asc" },
        take: CHUNK,
        select: { id: true },
      });
      if (users.length === 0) {
        const done = await patchBroadcast(id, (x) => {
          const failed = x.recipients > 0 && x.delivered === 0;
          return { ...x, status: failed ? "failed" : "sent", leaseUntil: null, sentAt: new Date().toISOString(), error: failed ? "به هیچ گیرنده‌ای نرسید" : x.error };
        });
        return done;
      }
      const ids = users.map((u) => u.id);
      const r = await deliverChunk(fresh, ids);
      b = await patchBroadcast(id, (x) => ({
        ...x,
        cursor: ids[ids.length - 1],
        recipients: x.recipients + ids.length,
        delivered: x.delivered + r.delivered,
        pushSent: x.pushSent + r.pushSent,
        leaseUntil: new Date(Date.now() + LEASE_MS).toISOString(),
      }));
      if (Date.now() - t0 > budgetMs) {
        // وقت تموم شد: قفل رو آزاد کن تا تیک بعدی زمان‌بند ادامه بده
        return patchBroadcast(id, (x) => (x.status === "sending" ? { ...x, leaseUntil: new Date(0).toISOString() } : x));
      }
    }
  } catch (err: any) {
    return patchBroadcast(id, (x) => ({ ...x, status: "failed", leaseUntil: null, error: String(err?.message || err).slice(0, 200) }));
  }
}

/** از کران/زمان‌بند صدا زده می‌شه: همه‌ی پیام‌های سررسیده (یا نیمه‌کاره) */
export async function runDueBroadcasts(now: Date = new Date(), budgetMs = DEFAULT_BUDGET_MS): Promise<{ processed: number }> {
  const t0 = Date.now();
  const due = dueBroadcastIds(await readBroadcasts(), now);
  let processed = 0;
  for (const id of due) {
    const left = budgetMs - (Date.now() - t0);
    if (left <= 1000) break;
    await runBroadcast(id, left);
    processed++;
  }
  return { processed };
}

export type { BroadcastChannel };
