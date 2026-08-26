import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arionapp.ir";

// فقط URLهای عمومی و کانونیکال — نه صفحاتِ خصوصی/داشبورد (اون‌ها توی
// robots.ts هم disallow شدن)، نه چک‌اوت (صفحه‌ی تراکنشی، نه محتوایی)، نه
// /subscription (پشتِ AuthGate‌ـه؛ جدولِ پلن‌های عمومی همینجا، توی خودِ
// صفحه‌ی اصلیه)، نه هیچ مسیرِ تکراری/موقتی.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
