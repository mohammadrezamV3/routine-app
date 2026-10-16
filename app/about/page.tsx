import type { Metadata } from "next";
import { brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { AboutHero } from "@/components/AboutHero";
import {
  AboutContact, AboutFaq, AboutFinalCTA, AboutInside, AboutPrivacy, AboutStats, AboutStory, AboutValues,
} from "@/components/AboutLazy";
import { faqJsonLd } from "@/lib/seo";
import { getSectionAbout, sectionAboutBreadcrumb, sectionAboutMetadata } from "@/lib/sectionAbout";
import { getHostSection, getSection } from "@/lib/sectionServer";
import { getTeamMembers } from "@/lib/teamServer";
import { getSessionFast } from "@/lib/serverSession";
import "./about.css";

// اعضای تیم از AppSetting خونده می‌شن؛ صفحه هر دقیقه تازه می‌شه
export const revalidate = 60;

export function generateMetadata(): Metadata {
  // زیردامنه‌ی یک بخش: درباره‌ی همون محصول با canonical روی خود زیردامنه
  const section = getSection();
  if (section) return sectionAboutMetadata(section, getHostSection());
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
  // کاربر واردشده بخش CTA پایانی (ساخت حساب/ورود) را اصلا نمی‌بیند؛ تصمیم سمت سرور
  // گرفته می‌شود تا جای خالی یا جاگیر لودینگ هم نماند.
  const authed = Boolean(await getSessionFast());
  const section = getSection();
  const sa = section ? getSectionAbout(section) : null;
  const ld = section
    ? [sectionAboutBreadcrumb(section, getHostSection()), faqJsonLd(sa!.faq)]
    : [breadcrumbJsonLd([{ name: brandName(), path: "/" }, { name: tr("درباره", "About"), path: "/about" }])];
  return (
    <div className="ab-root">
      {ld.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }} />
      ))}
      <AboutHero section={section} hero={sa?.hero ?? null} />
      <AboutStats section={section} />
      <AboutStory section={section} />
      <AboutValues section={section} />
      <AboutInside section={section} />
      <AboutPrivacy section={section} />
      <AboutFaq section={section} />
      <AboutContact team={team} section={section} />
      {!authed && <AboutFinalCTA section={section} />}
    </div>
  );
}
