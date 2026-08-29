import type { Metadata } from "next";
import { OG_BASE, SOCIAL, SUPPORT_EMAIL } from "@/lib/brand";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { EnamadBadge } from "@/components/EnamadBadge";

export const metadata: Metadata = {
  title: "درباره آریون",
  description: "درباره‌ی تیم سازنده‌ی آریون و راه‌های تماس.",
  alternates: { canonical: "/about" },
  openGraph: { ...OG_BASE, url: "/about", title: "درباره آریون" },
};

export default function AboutPage() {
  const rows = [
    { label: "سازنده", value: "Arion Group" },
    { label: "ایمیل", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
    { label: "تلگرام", value: SOCIAL.telegram.handle, href: SOCIAL.telegram.url, icon: <TelegramIcon size={14} /> },
    { label: "اینستاگرام", value: SOCIAL.instagram.handle, href: SOCIAL.instagram.url, icon: <InstagramIcon size={14} /> },
  ];

  return (
    <section>
      <h1>درباره ما</h1>
      <div className="about-list">
        {rows.map((r) => (
          <div key={r.label} className="about-row">
            <span className="about-label">{r.label}</span>
            {r.href ? (
              <a
                href={r.href}
                className="mono"
                style={{ color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                dir="ltr"
                {...(r.href.startsWith("http")
                  ? { target: "_blank", rel: "me noopener noreferrer" }
                  : {})}
              >
                {r.icon}
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
