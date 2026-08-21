export default function LanguageSettingsPage() {
  return (
    <section>
      <h1>زبان</h1>
      <div className="account-content-hint">زبانِ رابط کاربریِ آریون</div>

      <div className="about-list">
        <div className="about-row">
          <span className="about-label">زبانِ فعلی</span>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>فارسی</span>
        </div>
      </div>
      <div className="section-note" style={{ marginTop: 10 }}>
        فعلاً فقط فارسی در دسترسه — زبان‌های دیگه به‌زودی اضافه می‌شن.
      </div>
    </section>
  );
}
