import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { BRAND_TITLE, BRAND_DESC, OG_BASE } from "@/lib/brand";

// این فایل عمدا Server Component شده (نه "use client" مثل قبل) — فقط
// برای اینکه بتونه metadata/JSON-LD صادر کنه؛ کل منطق/UI واقعی توی
// components/HomeClient.tsx بدون هیچ تغییری زندگی می‌کنه.
// صفحه‌ی اصلی جاییه که جست‌وجوی برند («آریون»، «آریون اپ») باید بهش برسه،
// پس عنوانش باید خود نام فارسی رو داشته باشه — نه فقط املای لاتین.
export const metadata: Metadata = {
  title: {
    // absolute یعنی الگوی «%s | Arion آریون» به این عنوان اضافه نشه؛ اسم
    // برند از قبل داخلش هست و تکرارش فقط عنوان رو بلند و بریده می‌کنه.
    absolute: BRAND_TITLE,
  },
  description: BRAND_DESC,
  alternates: { canonical: "/" },
  openGraph: { ...OG_BASE, url: "/", title: BRAND_TITLE, description: BRAND_DESC },
  twitter: { card: "summary_large_image", title: BRAND_TITLE, description: BRAND_DESC, images: ["/og.png"] },
};

export default function HomePage() {
  // Organization/WebSite/SoftwareApplication (با @id) از root layout
  // میان — تکرارِ همون بلوک اینجا فقط یه کپیِ عینا یکسان توی <head> بود.
  return <HomeClient />;
}
