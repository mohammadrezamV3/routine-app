import Link from "next/link";

export default function ExerciseModuleSettingsPage() {
  return (
    <section>
      <h1>بدنسازی</h1>
      <div className="account-content-hint">تنظیمات مربوط به تمرین و برنامه بدنسازی</div>

      <div className="section-note" style={{ marginBottom: 12 }}>
        برنامه‌ی تمرینی و مشخصاتِ بدنی (قد/وزن/هدف) از داخلِ خودِ صفحه‌ی بدنسازی مدیریت می‌شن.
      </div>
      <Link href="/exercise?tab=exercise" className="account-sub-cta-btn">رفتن به برنامه تمرینی</Link>
    </section>
  );
}
