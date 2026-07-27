export default function AboutPage() {
  const rows = [
    { label: "سازنده", value: "محمدرضا ابوالحسن" },
    { label: "شماره تماس", value: "+989058969548", href: "tel:+989058969548" },
    { label: "ایمیل", value: "smm881517@gmail.com", href: "mailto:smm881517@gmail.com" },
  ];

  return (
    <section>
      <h1>درباره من</h1>
      <div className="about-list">
        {rows.map((r) => (
          <div key={r.label} className="about-row">
            <span className="about-label">{r.label}</span>
            {r.href ? (
              <a href={r.href} className="mono" style={{ color: "var(--accent)", textDecoration: "none" }} dir="ltr">
                {r.value}
              </a>
            ) : (
              <span className="mono" dir="ltr">{r.value}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
