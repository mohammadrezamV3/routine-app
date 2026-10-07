// این فایل رو خود Next.js یک‌بار موقع بالا آمدن سرور اجرا می‌کنه (قبل از
// اینکه اولین درخواست سرو بشه) — با فلگ experimental.instrumentationHook در
// next.config.js فعاله.
//
// تنها کارش گرم‌کردن کانکشن‌پول دیتابیسه. عمدا await نمی‌کنیم: اگه Postgres
// چند ثانیه دیرتر بالا بیاد، سرور وب نباید منتظرش بمونه (وگرنه یه دیتابیس
// کند کل سایت رو بالا نیامده نگه می‌داره).
export async function register() {
  // این هوک هم روی رانتایم nodejs اجرا می‌شه هم edge؛ Prisma فقط روی nodejs
  // کار می‌کنه، پس روی edge اصلا importش نمی‌کنیم.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warmUpDatabase } = await import("@/lib/prisma");
  warmUpDatabase();

  // WebSocket `/ws` (lib/realtimeServer.ts) — همین پروسه‌ی سرور نکست، چه
  // `next dev`، چه `next start`، چه هر worker cluster.js. شکستش نباید بالا
  // آمدن خود سایت رو بخوابونه؛ بدون WS کلاینت‌ها به polling برمی‌گردن.
  //
  // import حتما *داخل* شرط `=== "nodejs"` است (نه بعد از return بالا): نکست
  // این فایل رو برای edge هم باندل می‌کنه و فقط شاخه‌ای که DefinePlugin مرده
  // تشخیص بده حذف می‌شه — وگرنه ws/pg (که fs/net/path می‌خوان) وارد باندل
  // edge می‌شدن و build می‌شکست.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { startRealtimeServer } = await import("@/lib/realtimeServer");
      startRealtimeServer();
    } catch (err: any) {
      console.error(`[realtime] failed to start: ${err?.message || err}`);
    }

    // زمان‌بند داخلی یادآوری‌های Web Push (lib/pushScheduler.ts) — به هیچ
    // crontab بیرونی وابسته نیست. موقع `next build` اجرا نمی‌شه.
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      try {
        const { startPushScheduler } = await import("@/lib/pushScheduler");
        startPushScheduler();
      } catch (err: any) {
        console.error(`[push] scheduler failed to start: ${err?.message || err}`);
      }

      // اعلام خودکار صفحه‌های عمومی تازه/عوض‌شده به IndexNow (lib/indexNowAuto.ts)
      try {
        const { scheduleIndexNowAutoSubmit } = await import("@/lib/indexNowAuto");
        scheduleIndexNowAutoSubmit();
      } catch (err: any) {
        console.error(`[indexnow] failed to schedule: ${err?.message || err}`);
      }
    }
  }
}
