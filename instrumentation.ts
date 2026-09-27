// این فایل رو خودِ Next.js یک‌بار موقعِ بالا آمدنِ سرور اجرا می‌کنه (قبل از
// اینکه اولین درخواست سرو بشه) — با فلگِ experimental.instrumentationHook در
// next.config.js فعاله.
//
// تنها کارش گرم‌کردنِ کانکشن‌پولِ دیتابیسه. عمداً await نمی‌کنیم: اگه Postgres
// چند ثانیه دیرتر بالا بیاد، سرورِ وب نباید منتظرش بمونه (وگرنه یه دیتابیسِ
// کندْ کلِ سایت رو بالا نیامده نگه می‌داره).
export async function register() {
  // این هوک هم روی رانتایمِ nodejs اجرا می‌شه هم edge؛ Prisma فقط روی nodejs
  // کار می‌کنه، پس روی edge اصلاً importش نمی‌کنیم.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warmUpDatabase } = await import("@/lib/prisma");
  warmUpDatabase();

  // WebSocketِ `/ws` (lib/realtimeServer.ts) — همین پروسه‌ی سرورِ نکست، چه
  // `next dev`، چه `next start`، چه هر workerِ cluster.js. شکستش نباید بالا
  // آمدنِ خودِ سایت رو بخوابونه؛ بدونِ WS کلاینت‌ها به polling برمی‌گردن.
  try {
    const { startRealtimeServer } = await import("@/lib/realtimeServer");
    startRealtimeServer();
  } catch (err: any) {
    console.error(`[realtime] failed to start: ${err?.message || err}`);
  }
}
