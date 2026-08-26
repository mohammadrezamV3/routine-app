import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";

// این فایل عمداً Server Component شده (نه "use client" مثل قبل) — فقط
// برای اینکه بتونه metadata/JSON-LD صادر کنه؛ کل منطق/UI واقعی توی
// components/HomeClient.tsx بدون هیچ تغییری زندگی می‌کنه.
export const metadata: Metadata = {
  title: "Arion — روتین، ورزش، تغذیه و ترید در یک اپ",
  description:
    "آریون یک اپ شخصی برای مدیریت روتین روزانه، خواب، برنامه‌ی ورزشی، تغذیه و ژورنال ترید — همه‌جا یکجا و همیشه در دسترس.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Arion",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  description:
    "آریون یک اپ شخصی برای مدیریت روتین روزانه، خواب، برنامه‌ی ورزشی، تغذیه و ژورنال ترید.",
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
