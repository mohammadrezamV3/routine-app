import Link from "next/link";

export default function CalorieModuleSettingsPage() {
  return (
    <section>
      <h1>کالری</h1>
      <div className="account-content-hint">تنظیمات مربوط به شمارش و ثبت کالری</div>

      <div className="section-note" style={{ marginBottom: 12 }}>
        هدفِ کالری و درشت‌مغذی‌ها از داخلِ خودِ صفحه‌ی کالری مدیریت می‌شن.
      </div>
      <Link href="/exercise?tab=calorie" className="account-sub-cta-btn">رفتن به برنامه غذایی</Link>
    </section>
  );
}
