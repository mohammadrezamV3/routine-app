import type { Metadata } from "next";
import { BRAND_FA } from "@/lib/brand";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { AboutHero } from "@/components/AboutHero";
import {
  AboutContact, AboutFinalCTA, AboutInside, AboutPrivacy, AboutStats, AboutStory, AboutValues,
} from "@/components/AboutSections";
import { getTeamMembers } from "@/lib/teamServer";
import "./about.css";

// اعضای تیم از AppSetting خونده می‌شن؛ صفحه هر دقیقه تازه می‌شه
export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: `درباره ${BRAND_FA} — اپ فارسی روتین و ورزش`,
  description:
    `${BRAND_FA} چیست، چرا ساخته شد و چه بخش‌هایی دارد: روتین روزانه، برنامه‌ی هفتگی، ` +
    `برنامه‌ی بدنسازی، کالری‌شماری و ژورنال ترید — همه در یک حساب کاربری.`,
  path: "/about",
  ogTitle: `درباره ${BRAND_FA}`,
  ownOgImage: true,
});

// محتوای این صفحه عمدا واقعی و دقیقا منطبق بر کاری‌ست که اپ الان انجام
// می‌دهد — بدون ادعای اثبات‌نشدنی «بهترین»، آمار ساختگی، جایزه یا نقل‌قول
// کاربر. تنها عددها از LandingStats می‌آیند (واقعی + پایه‌ی
// lib/publicStatsBase.ts). همه‌ی متن در HTML سرور هست (برای سئو)؛ حرکت‌ها
// فقط لایه‌ی نمایشی‌اند و با حرکت‌کاهی (MotionTuner) خاموش می‌شوند.
export default async function AboutPage() {
  const team = await getTeamMembers();
  return (
    <div className="ab-root">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: BRAND_FA, path: "/" }, { name: "درباره", path: "/about" }])) }}
      />
      <AboutHero />
      <AboutStats />
      <AboutStory />
      <AboutValues />
      <AboutInside />
      <AboutPrivacy />
      <AboutContact team={team} />
      <AboutFinalCTA />
    </div>
  );
}
