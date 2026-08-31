import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { getSiteUrl } from "@/lib/siteUrl";
import { prisma } from "@/lib/prisma";

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

type Probe = {
  name: string; url: string; method?: "GET" | "POST"; body?: unknown; note: string;
  /** بدنه‌ی form-urlencoded — بعضی سرویس‌ها (ملی‌پیامک) JSON قبول نمی‌کنند */
  form?: Record<string, string>;
};

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

  // ملی‌پیامک — رایج‌ترین شکایتِ «کد پیامکی نمی‌آید» یا از نبودِ env می‌آید،
  // یا از بسته‌شدنِ مسیرِ خروجی، یا از ردکردنِ خودِ پنل (اعتبار/الگو).
  // ارسال عمداً fire-and-forget است، پس هیچ‌کدام در UI دیده نمی‌شود و
  // تنها راهِ سریعِ تفکیکشان همین پروب است. این درخواست پیامکی نمی‌فرستد:
  // اندپوینتِ اعتبار است، نه ارسال.
  list.push(
    process.env.MELIPAYAMAK_USERNAME && process.env.MELIPAYAMAK_PASSWORD
      ? {
          name: "melipayamak",
          url: `https://rest.payamak-panel.com/api/SendSMS/GetCredit`,
          method: "POST",
          form: {
            username: process.env.MELIPAYAMAK_USERNAME,
            password: process.env.MELIPAYAMAK_PASSWORD,
          },
          note: "سرویس پیامک (کد ورود/ثبت‌نام) — اعتبار پنل",
        }
      : { name: "melipayamak", url: "", note: "MELIPAYAMAK_USERNAME/PASSWORD تنظیم نشده — هیچ پیامکی ارسال نمی‌شود" }
  );

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
      headers: p.form
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : p.body
          ? { "Content-Type": "application/json" }
          : undefined,
      body: p.form
        ? new URLSearchParams(p.form).toString()
        : p.body
          ? JSON.stringify(p.body)
          : undefined,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const ms = Date.now() - started;

    // برای ملی‌پیامک خودِ بدنه هم معنی دارد: مسیرِ شبکه ممکن است باز باشد
    // ولی پنل به‌خاطرِ نام‌کاربری/رمزِ غلط یا اتمامِ اعتبار ارسال نکند —
    // که از بیرون دقیقاً شبیهِ «پیامک نمی‌آید» دیده می‌شود.
    if (p.name === "melipayamak") {
      const raw = await res.text().catch(() => "");
      let credit: number | null = null;
      let rejected: string | null = null;
      try {
        const j = JSON.parse(raw);
        if (j?.RetStatus === 1) credit = Number(j?.Value ?? j?.StrRetStatus) || 0;
        else rejected = j?.StrRetStatus || `کد ${j?.RetStatus}`;
      } catch {
        rejected = raw.slice(0, 120) || null;
      }
      return {
        name: p.name, note: p.note, ok: !rejected, status: res.status, ms,
        ...(credit !== null ? { credit } : {}),
        ...(rejected ? { reason: `پنل پاسخ داد: ${rejected}` } : {}),
      };
    }

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

/**
 * تأخیرِ رفت‌وبرگشتِ دیتابیس. اگر این عدد بالا باشد، «کُندیِ سایت» از سمتِ
 * Postgres یا استخرِ اتصالِ Prisma است، نه از سرویس‌های بیرونی.
 */
async function dbLatency() {
  const started = Date.now();
  try {
    // عمداً raw SQL نیست (قانونِ پروژه): یک findFirstِ محدود به یک ستون و
    // یک ردیف، که فقط روی کلیدِ اصلی می‌رود — عملاً هم‌هزینه‌ی ping است.
    await prisma.appSetting.findFirst({ select: { key: true } });
    return { ok: true, ms: Date.now() - started };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - started, reason: e?.message?.slice(0, 160) || "خطای ناشناخته" };
  }
}

/**
 * لگِ حلقه‌ی رویداد: چقدر طول کشید تا یک تایمرِ صفرثانیه‌ای واقعاً اجرا شود.
 * عددِ بالا (ده‌ها یا صدها میلی‌ثانیه) یعنی پروسه مشغول/تحتِ فشارِ GC است —
 * همان چیزی که از بیرون «سایت دیر جواب می‌دهد» دیده می‌شود.
 */
function eventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    setTimeout(() => resolve(Number(process.hrtime.bigint() - started) / 1e6), 0);
  });
}

/**
 * آیا migrationها روی این دیتابیس اجرا شده‌اند؟
 *
 * چرا لازم شد: سرویسِ `migrate` در docker-compose پروفایلِ `tools` دارد و با
 * `docker compose up` معمولی اجرا **نمی‌شود**. بعد از یک دیپلوی که مدلِ
 * جدید آورده بود، اپ با کلاینتِ تازه بالا آمد ولی دیتابیس اسکیمای قدیمی
 * داشت؛ نتیجه صدها خطای «The table ... does not exist» در لاگ بود، در حالی
 * که healthcheck سبز می‌ماند (چون /api/health عمداً به دیتابیس دست نمی‌زند).
 *
 * این چک با یک کوئریِ ارزان روی تازه‌ترین جدول همان وضعیت را یک‌جا می‌گوید.
 * P2021 یعنی جدول وجود ندارد → migration اجرا نشده.
 */
async function schemaState() {
  try {
    await prisma.tradeAccount.count();
    return { ok: true, note: "اسکیمای دیتابیس با کد هماهنگ است" };
  } catch (e: any) {
    if (e?.code === "P2021") {
      return {
        ok: false,
        note: "migration اجرا نشده — دیتابیس از کد عقب است",
        fix: "docker compose --profile tools run --rm migrate npx prisma migrate deploy",
        missingTable: e?.meta?.table ?? null,
      };
    }
    return { ok: false, note: e?.message?.slice(0, 160) || "خطای ناشناخته" };
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const started = Date.now();
  const [results, db, lagMs, schema] = await Promise.all([
    Promise.all(probes().map(runProbe)),
    dbLatency(),
    eventLoopLag(),
    schemaState(),
  ]);

  return NextResponse.json({
    totalMs: Date.now() - started,
    // اگر db.ms بالا باشد → مشکل سمتِ دیتابیس/استخرِ اتصال.
    // اگر eventLoopLagMs بالا باشد → پروسه تحتِ فشارِ CPU/حافظه است.
    // اگر هر دو پایین ولی outbound کُند باشد → مشکل شبکه‌ی خروجیِ سرور است.
    db,
    // اگر ok:false بود، دستورِ رفعش داخلِ همین خروجی آمده است.
    schema,
    eventLoopLagMs: Math.round(lagMs),
    process: {
      uptimeSec: Math.round(process.uptime()),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapLimitMb: Math.round(require("v8").getHeapStatistics().heap_size_limit / 1024 / 1024),
    },
    env: {
      // فقط «هست/نیست» — هیچ مقداری برنمی‌گردد.
      MELIPAYAMAK_USERNAME: !!process.env.MELIPAYAMAK_USERNAME,
      MELIPAYAMAK_PASSWORD: !!process.env.MELIPAYAMAK_PASSWORD,
      MELIPAYAMAK_PATTERN_ID: !!process.env.MELIPAYAMAK_PATTERN_ID,
      ZIBAL_MERCHANT_KEY: !!process.env.ZIBAL_MERCHANT_KEY,
      ZARINPAL_MERCHANT_ID: !!process.env.ZARINPAL_MERCHANT_ID,
      ARVAN_AI_BASE_URL: !!process.env.ARVAN_AI_BASE_URL,
      ARVAN_AI_API_KEY: !!process.env.ARVAN_AI_API_KEY,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
    },
    // آدرسی که واقعاً برای ساختِ لینک‌های بازگشتِ درگاه استفاده می‌شود.
    // اگر این چیزی جز دامنه‌ی واقعی باشد، کاربر بعد از پرداخت به صفحه‌ی
    // سفید می‌رود — همان باگی که با `0.0.0.0:3000` گزارش شد.
    resolvedSiteUrl: {
      value: getSiteUrl(),
      note: "لینک‌های بازگشت از این ساخته می‌شوند — باید دامنه‌ی واقعی باشد",
    },
    outbound: results,
  });
}
