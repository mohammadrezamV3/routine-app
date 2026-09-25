import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { MOBILE_SYNC_MAX_BATCH, parseSyncChange } from "@/lib/mobileSync";
import { applyChange } from "@/lib/mobileSyncStore";
import type { SyncChangeResult, SyncPushResponse } from "@/lib/mobileApiContract";

// POST /api/mobile/sync/push { changes: SyncChange[] }
//
// هر تغییر مستقل اعتبارسنجی و با LWW اعمال می‌شه (lib/mobileSync.ts). نتیجه
// به‌ازای هر تغییر: applied | stale | rejected. خطای دیتابیس کلِ درخواست رو
// ۵۰۰ می‌کنه (نه rejected) تا کلاینت کلِ دسته رو دوباره بفرسته — تکرارِ
// تغییرهای قبلا اعمال‌شده بی‌ضرره (تساوی ← stale).

const MAX_PUSH_BODY_BYTES = 1024 * 1024;

export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-push:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const parsed = await readJsonBody<{ changes?: unknown }>(req, MAX_PUSH_BODY_BYTES);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const changes = parsed.body?.changes;
  if (!Array.isArray(changes)) return NextResponse.json({ error: "changes باید آرایه باشد" }, { status: 400 });
  if (changes.length > MOBILE_SYNC_MAX_BATCH) {
    return NextResponse.json({ error: `حداکثر ${MOBILE_SYNC_MAX_BATCH} تغییر در هر درخواست` }, { status: 413 });
  }

  // «حالا» یک‌بار برای کلِ دسته — سقفِ clampِ زمانِ کلاینت
  const now = new Date();
  const results: SyncChangeResult[] = [];
  try {
    // ترتیبی، نه موازی: دو تغییر روی یک رکورد در یک دسته باید به ترتیب اعمال بشن
    for (let index = 0; index < changes.length; index++) {
      const p = parseSyncChange(changes[index], now);
      if (!p.ok) {
        results.push({ index, entity: p.entity, key: p.key, id: p.id, status: "rejected", error: p.error, serverRecord: null });
        continue;
      }
      results.push({ index, ...(await applyChange(userId, p.change)) });
    }
  } catch (err: any) {
    console.error(`[mobile-sync] push failed for ${userId}: ${err?.message || err}`);
    return NextResponse.json({ error: "خطای سرور — دوباره تلاش کن" }, { status: 500 });
  }

  const body: SyncPushResponse = { serverTime: new Date().toISOString(), results };
  return NextResponse.json(body);
}
