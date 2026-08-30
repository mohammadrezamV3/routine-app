import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";

/**
 * تست اتصالِ خروجیِ سرور به سرویس‌های بیرونی.
 *
 * چرا لازم شد: دو صفحه‌ی کاملاً متفاوت (خرید اشتراک و گزارش هفتگی) با یک
 * پیامِ یکسانِ «مشکلی در اتصال به سرور» می‌شکستند، در حالی که هر چیزی که
 * فقط به دیتابیس نیاز داشت درست کار می‌کرد. وجهِ اشتراکشان این بود که هر
 * دو یک درخواستِ HTTPS به بیرون می‌زنند (زیبال و گیت‌وی AI).
 *
 * بدونِ این روت، تشخیص فقط با خواندنِ لاگِ کانتینر ممکن بود. حالا یک بار
 * باز کردنِ این آدرس دقیقاً می‌گوید کدام سرویس در دسترس نیست و چقدر طول
 * می‌کشد — و تفاوتِ «DNS حل نمی‌شود» با «کند است» با «۴۰۳ می‌دهد» را
 * روشن می‌کند.
 *
 * فقط سوپرادمین: خروجی‌اش نامِ سرویس‌ها و وضعیتِ زیرساخت را لو می‌دهد.
 */

// هر تست سقفِ خودش را دارد تا یک سرویسِ مرده کلِ پاسخ را نگه ندارد.
const PROBE_TIMEOUT_MS = 8_000;

type Probe = { name: string; url: string; method?: "GET" | "POST"; body?: unknown; note: string };

function probes(): Probe[] {
  const list: Probe[] = [
    {
      name: "zibal",
      url: "https://gateway.zibal.ir/v1/request",
      method: "POST",
      // مرچنتِ تستیِ خودِ زیبال. پاسخش هرچه باشد (حتی خطای مرچنت) یعنی
      // «شبکه سالم است» — چیزی که این‌جا می‌سنجیم همین است، نه صحتِ کلید.
      body: { merchant: "zibal", amount: 10000, callbackUrl: "https://arionapp.ir/cb" },
      note: "درگاه پرداخت زیبال",
    },
    {
      name: "zarinpal",
      url: "https://api.zarinpal.com/pg/v4/payment/request.json",
      method: "POST",
      body: { merchant_id: "0".repeat(36), amount: 10000, description: "probe", callback_url: "https://arionapp.ir/cb" },
      note: "درگاه پرداخت زرین‌پال",
    },
  ];

  const aiBase = process.env.ARVAN_AI_BASE_URL;
  list.push(
    aiBase
      ? { name: "ai-gateway", url: `${aiBase.replace(/\/+$/, "")}/models`, note: "گیت‌وی هوش مصنوعی (رودمپ و گزارش هفتگی)" }
      : { name: "ai-gateway", url: "", note: "ARVAN_AI_BASE_URL تنظیم نشده" }
  );
  return list;
}

async function runProbe(p: Probe) {
  if (!p.url) {
    return { name: p.name, note: p.note, ok: false, reason: "env تنظیم نشده", ms: 0 };
  }
  const started = Date.now();
  try {
    const res = await fetch(p.url, {
      method: p.method ?? "GET",
      headers: p.body ? { "Content-Type": "application/json" } : undefined,
      body: p.body ? JSON.stringify(p.body) : undefined,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const ms = Date.now() - started;
    // هر پاسخِ HTTP — حتی ۴۰۱/۴۰۳/۵۰۰ — یعنی مسیرِ شبکه باز است. فقط
    // نرسیدن (DNS/فایروال/تایم‌اوت) شکستِ واقعیِ این تست است.
    return { name: p.name, note: p.note, ok: true, status: res.status, ms };
  } catch (e: any) {
    const ms = Date.now() - started;
    const kind =
      e?.name === "TimeoutError" || e?.name === "AbortError"
        ? `تایم‌اوت (بیش از ${PROBE_TIMEOUT_MS / 1000} ثانیه جواب نداد)`
        : e?.cause?.code === "ENOTFOUND"
          ? "DNS حل نشد"
          : e?.cause?.code === "ECONNREFUSED"
            ? "اتصال رد شد"
            : e?.cause?.code || e?.message || "خطای ناشناخته";
    return { name: p.name, note: p.note, ok: false, reason: kind, ms };
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const started = Date.now();
  const results = await Promise.all(probes().map(runProbe));

  return NextResponse.json({
    totalMs: Date.now() - started,
    process: {
      uptimeSec: Math.round(process.uptime()),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapLimitMb: Math.round(require("v8").getHeapStatistics().heap_size_limit / 1024 / 1024),
    },
    env: {
      // فقط «هست/نیست» — هیچ مقداری برنمی‌گردد.
      ZIBAL_MERCHANT_KEY: !!process.env.ZIBAL_MERCHANT_KEY,
      ZARINPAL_MERCHANT_ID: !!process.env.ZARINPAL_MERCHANT_ID,
      ARVAN_AI_BASE_URL: !!process.env.ARVAN_AI_BASE_URL,
      ARVAN_AI_API_KEY: !!process.env.ARVAN_AI_API_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
    },
    outbound: results,
  });
}
