const FAQ = [
  { q: "چطور اشتراکم رو ارتقا بدم؟", a: "از بخشِ «اشتراک» توی همین پنل، دکمه‌ی «ارتقا به پلن بالاتر» رو بزن." },
  { q: "چطور رمز عبورم رو عوض کنم؟", a: "از بخشِ «امنیت» توی همین پنل، رمزِ فعلی و رمزِ جدید رو وارد کن." },
  { q: "اگه با گوگل ثبت‌نام کردم چطور دوستام پیدام کنن؟", a: "از بخشِ «پروفایل» یه یوزرنیم برای خودت تنظیم کن." },
];

export default function SupportPage() {
  const mailto = "mailto:smm881517@gmail.com?subject=" + encodeURIComponent("گزارش مشکل — Arion");

  return (
    <section>
      <h1>پشتیبانی</h1>
      <div className="account-content-hint">اگه سوالی داری یا با مشکلی روبه‌رو شدی</div>

      <div className="about-list" style={{ marginTop: 0 }}>
        <div className="about-row">
          <span className="about-label">تماس با پشتیبانی</span>
          <a href="mailto:smm881517@gmail.com" className="mono" style={{ color: "var(--accent)", textDecoration: "none" }} dir="ltr">
            smm881517@gmail.com
          </a>
        </div>
        <div className="about-row">
          <span className="about-label">گزارش مشکل</span>
          <a href={mailto} className="mono" style={{ color: "var(--accent)", textDecoration: "none" }}>
            ارسالِ ایمیل
          </a>
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">سوالات متداول</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FAQ.map((f) => (
            <div key={f.q}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{f.q}</div>
              <div className="item-line">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
