import Link from "next/link";

export default function RoadmapModuleSettingsPage() {
  return (
    <section>
      <h1>یادگیری / Skill</h1>
      <div className="account-content-hint">تنظیمات مربوط به یادگیری و رودمپ</div>

      <div className="section-note" style={{ marginBottom: 12 }}>
        رودمپ‌های یادگیری از داخلِ خودِ صفحه‌ی رودمپ‌ها ساخته و مدیریت می‌شن.
      </div>
      <Link href="/roadmaps" className="account-sub-cta-btn">رفتن به رودمپ‌ها</Link>
    </section>
  );
}
