import type { Metadata } from "next";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { AboutHero } from "@/components/AboutHero";
import {
  AboutContact, AboutFinalCTA, AboutInside, AboutPrivacy, AboutStats, AboutStory, AboutValues,
} from "@/components/AboutSections";
import { getTeamMembers } from "@/lib/teamServer";
import "./about.css";

// اعضای تیم از AppSetting خونده می‌شن؛ صفحه هر دقیقه تازه می‌شه
export const revalidate = 60;

export function generateMetadata(): Metadata {
  const brand = brandName();
  return pageMetadata({
    title: tr(`درباره ${brand} — اپ فارسی روتین و ورزش`, `About ${brand} - routine and fitness app`),
    description: tr(
      `${brand} چیست، چرا ساخته شد و چه بخش‌هایی دارد: روتین روزانه، برنامه‌ی هفتگی، ` +
        `برنامه‌ی بدنسازی، کالری‌شماری و ژورنال ترید — همه در یک حساب کاربری.`,
      `What ${brand} is, why it was built and what it includes: daily routine, weekly plan, ` +
        `workout plan, calorie counting and a trading journal, all in one account.`,
    ),
    path: "/about",
    ogTitle: tr(`درباره ${brand}`, `About ${brand}`),
    ownOgImage: true,
  });
}

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([{ name: brandName(), path: "/" }, { name: tr("درباره", "About"), path: "/about" }])) }}
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
