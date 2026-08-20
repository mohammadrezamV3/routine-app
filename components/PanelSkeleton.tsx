// اسکلتِ استاتیکِ پنل — هیچ "use client" نداره و هیچ stateای نداره، پس
// مستقیم داخلِ HTMLِ پری‌رندرشده می‌شینه و *بدونِ هیچ جاوااسکریپتی* دیده می‌شه.
//
// چرا لازم شد: `/exercise` و `/trade` هردو `<Suspense fallback={null}>` داشتن.
// چون محتوای داخلشون `useSearchParams()` صدا می‌زنه، Next موقعِ پری‌رندر
// مجبوره همون fallback رو توی HTML بذاره — و fallback عیناً `null` بود. یعنی
// HTMLِ اولیه‌ی این دو صفحه عملاً خالی بود (اندازه‌گیری‌شده: `/exercise` فقط
// ۴۳ کاراکتر متنِ قابلِ دیدن، `/trade` ۷۷ کاراکتر). کاربر تا وقتی کلِ باندل
// دانلود/پارس/هیدریت می‌شد *و بعدش* داده‌ها می‌رسیدن، صفحه‌ی سفید می‌دید —
// روی موبایلِ متوسط با تأخیرِ شبکه‌ی واقعی، FCPِ `/exercise` ۱۷۷۲ms بود.
//
// با این اسکلت، ساختارِ صفحه از همون اولین بایتِ HTML دیده می‌شه.
// کلاس‌ها همون‌هایی‌ان که ModuleGate/AuthGate از قبل استفاده می‌کردن، پس
// چیزی به CSS اضافه نمی‌شه و ظاهرش با بقیه‌ی گیت‌های اپ یکیه.

export function PanelSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="module-gate-blur" aria-hidden="true">
      <div className="mg-skel-line" style={{ width: "68%" }} />
      <div className="mg-skel-line" style={{ width: "42%" }} />
      {Array.from({ length: rows }, (_, i) => (
        <div className="mg-skel-row" key={i}>
          <div className="mg-skel-card" />
          <div className="mg-skel-card" />
          <div className="mg-skel-card" />
        </div>
      ))}
      <div className="mg-skel-line" style={{ width: "80%" }} />
      <div className="mg-skel-line" style={{ width: "55%" }} />
    </div>
  );
}
