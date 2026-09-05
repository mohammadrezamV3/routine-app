"use strict";

// ─────────────────────────────────────────────────────────────────────────
// ورودی Docker به‌جای اجرای مستقیمِ server.js — با ماژولِ داخلیِ cluster نودجی
// (نه PM2: وابستگیِ جدید لازم نداره) به تعداد هسته‌های سرور (پیش‌فرض حداکثر ۲،
// چون هدف یک VPS دو-هسته‌ایه؛ با WEB_CONCURRENCY قابل تنظیمه) چند worker از
// همون server.js فورک می‌کنیم تا هر دو هسته استفاده بشه، نه فقط یکی.
//
// چالش: lib/rateLimit.ts یک Map در-حافظه‌ست. با چند worker، هر worker حافظه‌ی
// جدای خودشو داره — یعنی محدودیتِ نرخ عملاً N برابر شل می‌شه (هر worker
// شمارشِ خودشو از صفر می‌کنه). راه‌حل‌های رایج (Redis یا جدولِ Postgres) یک
// زیرساختِ جدید اضافه می‌کنن؛ چون primary فارغ از تعدادِ workerها همیشه
// دقیقاً یکیه، به‌جاش خودِ primary میزبانِ Mapِ مشترک می‌شه و workerها با
// IPCِ داخلیِ نود (worker.send/process.send، هم‌ماشین و زیرِ میلی‌ثانیه)
// درخواستِ چک‌کردن رو ازش می‌پرسن — صفر کانتینر/وابستگیِ جدید.
const cluster = require("node:cluster");
const os = require("node:os");

const numWorkers = Math.max(1, Number(process.env.WEB_CONCURRENCY) || Math.min(os.cpus().length, 2));

if (cluster.isPrimary) {
  // ── منطقِ rate limit عیناً از lib/rateLimit.ts (نسخه‌ی local/fallback) ──
  const buckets = new Map();
  function checkRateLimit(key, limit, windowMs) {
    const now = Date.now();
    const existing = buckets.get(key);
    if (!existing || existing.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (existing.count >= limit) return false;
    existing.count++;
    return true;
  }
  // جاروبِ دوره‌ای سطل‌های منقضی، که حافظه‌ی primary بی‌نهایت رشد نکنه
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref();

  function forkWorker() {
    const worker = cluster.fork();
    worker.on("message", (msg) => {
      if (!msg || msg.type !== "rateLimit:check") return;
      const ok = checkRateLimit(msg.key, msg.limit, msg.windowMs);
      worker.send({ type: "rateLimit:result", id: msg.id, ok });
    });
    return worker;
  }

  console.log(`[cluster] primary ${process.pid} در حال بالا آوردنِ ${numWorkers} worker`);
  for (let i = 0; i < numWorkers; i++) forkWorker();

  // اگه یک worker به هر دلیلی کرش کرد، سایتِ همه‌ی کاربرا نباید بخوابه — یک
  // worker جدید فوری جای اون فورک می‌شه. موقعِ خاموشیِ عمدی (شاتدان زیر)
  // این رفتار خاموشه، وگرنه هر workerِ خاموش‌شده بلافاصله دوباره فورک می‌شه.
  let shuttingDown = false;
  cluster.on("exit", (worker, code, signal) => {
    if (shuttingDown) return;
    console.error(`[cluster] worker ${worker.process.pid} خارج شد (code=${code} signal=${signal}) — فورکِ مجدد`);
    forkWorker();
  });

  // داکر روی `docker stop`/ری‌دیپلوی فقط SIGTERM رو به PID۱ (همین primary)
  // می‌فرسته، نه به workerهای فورک‌شده. بدونِ این هندلر، primary بی‌سروصدا
  // می‌مرد و کانتینر کلِ workerها رو هم با خودش می‌کشت — درخواست‌های در حالِ
  // پردازش وسط راه قطع می‌شدن. خودِ server.js داخلِ هر worker (از
  // next/dist/server/lib/start-server.js) SIGTERM رو می‌گیره و HTTP server
  // رو تمیز می‌بنده؛ اینجا فقط باید سیگنال رو بهشون برسونیم و صبر کنیم.
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    const workers = Object.values(cluster.workers || {}).filter(Boolean);
    console.log(`[cluster] primary دریافتِ ${signal} — درحالِ خاموشیِ تمیزِ ${workers.length} worker`);
    if (workers.length === 0) {
      process.exit(0);
      return;
    }
    let remaining = workers.length;
    // اگه یک worker به‌موقع (مثلا به‌خاطر یک درخواستِ گیرکرده) بسته نشد،
    // نباید کلِ خاموشی رو نامحدود معطل نگه داریم.
    const forceTimer = setTimeout(() => {
      console.error("[cluster] بعضی workerها به‌موقع خاموش نشدن — force kill");
      for (const w of workers) w.process.kill("SIGKILL");
      process.exit(1);
    }, 10_000);
    forceTimer.unref();
    for (const w of workers) {
      w.once("exit", () => {
        remaining -= 1;
        if (remaining <= 0) {
          clearTimeout(forceTimer);
          process.exit(0);
        }
      });
      w.process.kill(signal);
    }
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // ── همگام‌سازیِ خودکارِ روزانه‌ی تقویم اقتصادی ──────────────────────
  // قبلا این کار فقط با یک crontab بیرونی روی خودِ سرور ممکن بود
  // (deploy/cron.example) — یعنی بدونِ ست‌کردنِ دستیِ اپراتور، جدول خالی
  // می‌موند. چون primary فارغ از تعدادِ worker همیشه دقیقاً یکیه (دقیقاً
  // همون استدلالِ rate-limit بالا)، خودش زمان‌بندیِ این کار رو هم برعهده
  // می‌گیره — بدونِ این، هر worker باید جدا زمان‌بندی می‌کرد و همون
  // sync چند بار در روز تکرار می‌شد. به‌جای وارد کردنِ مستقیمِ
  // lib/economicCalendar.ts (که TypeScript/Prisma می‌خواد و اینجا primary
  // هیچ‌کدومش رو لود نکرده)، primary همون روتِ HTTP کرانِ موجود
  // (app/api/cron/economic-calendar) رو روی خودِ localhost صدا می‌زنه —
  // دقیقاً همون‌کاری که crontabِ بیرونی می‌کرد، فقط از داخلِ خودِ کانتینر.
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    console.warn("[cluster] CRON_SECRET ست نشده — همگام‌سازیِ خودکارِ تقویم اقتصادی غیرفعاله");
  } else {
    const port = process.env.PORT || 3000;
    async function syncEconomicCalendarNow() {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/cron/economic-calendar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${CRON_SECRET}` },
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          console.error(`[cluster] همگام‌سازیِ تقویم اقتصادی با خطا مواجه شد: ${res.status} ${JSON.stringify(body)}`);
          return;
        }
        console.log(`[cluster] تقویمِ اقتصادی همگام‌سازی شد: ${JSON.stringify(body)}`);
      } catch (err) {
        // اگه workerها هنوز کاملاً بالا نیومده باشن (مثلاً درست بعدِ استارتِ
        // کانتینر)، این fail می‌شه — بی‌خطر: زمان‌بندیِ روزانه‌ی بعدی جبران
        // می‌کنه، و ادمین همیشه می‌تونه از پنل «همگام‌سازی الان» بزنه.
        console.error(`[cluster] همگام‌سازیِ تقویم اقتصادی شکست خورد: ${err && err.message}`);
      }
    }

    // طبقِ درخواستِ صریح: هر ۱۰ دقیقه (نه فقط یک‌بار در روز) — چون
    // actual/forecastِ رویدادها دقیقاً لحظه‌ی انتشارِ خبر پر می‌شود، نه
    // شبِ قبل؛ با کرانِ روزانه، actual تا ۲۴ساعتِ بعد از خودِ خبر روی
    // سایت دیده نمی‌شد. یک بار کمی بعدِ بالا آمدنِ سرور (دیپلویِ تازه بدونِ
    // داده نمونه)، و بعدش هر ۱۰ دقیقه.
    setTimeout(syncEconomicCalendarNow, 30_000).unref();
    setInterval(syncEconomicCalendarNow, 10 * 60 * 1000).unref();
  }
} else {
  // هر worker همون سرورِ standalone نکست رو مستقیم اجرا می‌کنه؛ رفتارش با
  // حالتِ تک-پروسه‌ای قبلی یکسانه، فقط چند نسخه‌ش همزمان بالاست.
  require("./server.js");
}
