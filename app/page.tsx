import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { BRAND_FA, BRAND_EN, BRAND_BOTH, BRAND_TITLE, BRAND_DESC, BRAND_ALT_NAMES, OG_BASE } from "@/lib/brand";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arionapp.ir";

// این فایل عمداً Server Component شده (نه "use client" مثل قبل) — فقط
// برای اینکه بتونه metadata/JSON-LD صادر کنه؛ کل منطق/UI واقعی توی
// components/HomeClient.tsx بدون هیچ تغییری زندگی می‌کنه.
// صفحه‌ی اصلی جاییه که جست‌وجوی برند («آریون»، «آریون اپ») باید بهش برسه،
// پس عنوانش باید خودِ نامِ فارسی رو داشته باشه — نه فقط املای لاتین.
export const metadata: Metadata = {
  title: {
    // absolute یعنی الگوی «%s | Arion آریون» به این عنوان اضافه نشه؛ اسمِ
    // برند از قبل داخلش هست و تکرارش فقط عنوان رو بلند و بریده می‌کنه.
    absolute: BRAND_TITLE,
  },
  description: BRAND_DESC,
  alternates: { canonical: "/" },
  openGraph: { ...OG_BASE, url: "/", title: BRAND_TITLE, description: BRAND_DESC },
};

const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: BRAND_BOTH,
  alternateName: BRAND_ALT_NAMES,
  url: SITE_URL,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  inLanguage: "fa-IR",
  description: BRAND_DESC,
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APPLICATION_JSON_LD) }}
      />
      <HomeClient />
    </>
  );
}
