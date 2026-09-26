import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { getMobileUserId } from "@/lib/mobileAuth";
import { TRADE_SYNC_MAX_BATCH, parseTradeSyncChange, rawRef } from "@/lib/mobileTradeSync";
import { applyTradeChange, hasTradeModule } from "@/lib/mobileTradeSyncStore";
import type { TradeSyncChangeResult, TradeSyncPushResponse } from "@/lib/mobileTradeContract";

// POST /api/mobile/trade/push { changes: TradeSyncChange[] }
//
// هر تغییر مستقل اعتبارسنجی و با LWW اعمال می‌شه (lib/mobileTradeSync.ts).
// نتیجه به‌ازای هر تغییر: applied | stale | rejected (+ code). بدونِ دسترسیِ
// TRADE همه‌ی تغییرها rejected با code=module_locked — هیچ‌چیز نوشته نمی‌شه.
// خطای دیتابیس کلِ درخواست رو ۵۰۰ می‌کنه تا کلاینت کلِ دسته رو دوباره بفرسته
// (تکرارِ تغییرِ قبلا اعمال‌شده بی‌ضرره: تساوی ← stale).

const MAX_PUSH_BODY_BYTES = 1024 * 1024;

export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`mobile-trade-push:${userId}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بود — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const parsed = await readJsonBody<{ changes?: unknown }>(req, MAX_PUSH_BODY_BYTES);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const changes = parsed.body?.changes;
  if (!Array.isArray(changes)) return NextResponse.json({ error: "changes باید آرایه باشد" }, { status: 400 });
  if (changes.length > TRADE_SYNC_MAX_BATCH) {
    return NextResponse.json({ error: `حداکثر ${TRADE_SYNC_MAX_BATCH} تغییر در هر درخواست` }, { status: 413 });
  }

  const now = new Date();
  const results: TradeSyncChangeResult[] = [];
  let moduleLocked = false;
  try {
    // یک‌بار برای کلِ دسته — همون تصمیمِ requireModule(TRADE)
    moduleLocked = !(await hasTradeModule(userId));
    for (let index = 0; index < changes.length; index++) {
      if (moduleLocked) {
        results.push({
          index,
          ...rawRef(changes[index]),
          status: "rejected",
          code: "module_locked",
          error: "این بخش نیاز به اشتراک فعال دارد",
          serverRecord: null,
        });
        continue;
      }
      const p = parseTradeSyncChange(changes[index], now);
      if (!p.ok) {
        results.push({ index, entity: p.entity, id: p.id, key: p.key, status: "rejected", code: p.code, error: p.error, serverRecord: null });
        continue;
      }
      // ترتیبی، نه موازی: «حساب، بعد معامله‌اش» در یک دسته باید به همین ترتیب اعمال بشه
      results.push({ index, ...(await applyTradeChange(userId, p.change)) });
    }
  } catch (err: any) {
    console.error(`[mobile-trade-sync] push failed for ${userId}: ${err?.message || err}`);
    return NextResponse.json({ error: "خطای سرور — دوباره تلاش کن" }, { status: 500 });
  }

  const body: TradeSyncPushResponse = { serverTime: new Date().toISOString(), moduleLocked, results };
  return NextResponse.json(body);
}
