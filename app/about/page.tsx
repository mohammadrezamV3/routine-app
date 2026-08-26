import type { Metadata } from "next";
import { EnamadBadge } from "@/components/EnamadBadge";

export const metadata: Metadata = {
  title: "درباره آریون",
  description: "درباره‌ی تیم سازنده‌ی آریون و راه‌های تماس.",
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: "درباره آریون" },
};

export default function AboutPage() {
  const rows = [
    { label: "سازنده", value: "Arion Group" },
    { label: "ایمیل", value: "smm881517@gmail.com", href: "mailto:smm881517@gmail.com" },
  ];

  return (
    <section>
      <h1>درباره ما</h1>
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
      <div style={{ marginTop: 24 }}>
        <EnamadBadge />
      </div>
    </section>
  );
}
