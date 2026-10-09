import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";
import { BRAND_FA, BRAND_EN, BRAND_TITLE } from "@/lib/brand";
import { isEn } from "@/lib/i18n";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/landingFaq";
import { fillPriceCopy } from "@/lib/planPricing";
import { getPricingConfig } from "@/lib/planPricingServer";

// این فایل عمدا Server Component شده (نه "use client" مثل قبل) — فقط
// برای اینکه بتونه metadata/JSON-LD صادر کنه؛ کل منطق/UI واقعی توی
// components/HomeClient.tsx بدون هیچ تغییری زندگی می‌کنه.
// صفحه‌ی اصلی جاییه که جست‌وجوی برند («آریون»، «آریون اپ») باید بهش برسه،
// پس عنوانش باید خود نام فارسی رو داشته باشه — نه فقط املای لاتین.
// عنوان/توضیح صفحه‌ی اصلی عمدا با عبارت‌هایی نوشته شده که کاربر فارسی‌زبان
// واقعا جست‌وجو می‌کند («روتین اپ»، «برنامه ریزی روزانه»، «برنامه بدنسازی»،
// «کالری شمار»، «ژورنال ترید») — ولی همچنان با خود نام برند شروع می‌شود.
const HOME_TITLE = `${BRAND_FA} | روتین اپ و برنامه ریزی روزانه، برنامه بدنسازی، کالری شمار و ژورنال ترید`;
const EN_HOME_TITLE = `${BRAND_EN} | Routine app and daily planner, AI workout plans, calorie tracker and trading journal`;
const EN_HOME_DESC =
  `${BRAND_EN}, a routine app with the Jalali calendar: daily and weekly planning, habit tracking, ` +
  `AI workout plans, a calorie tracker and a trading journal, all in one account. Start free.`;
const HOME_DESC =
  `${BRAND_FA}، روتین اپ فارسی با تقویم شمسی: برنامه ریزی روزانه و هفتگی، پیگیری عادت‌ها، ` +
  `برنامه بدنسازی با هوش مصنوعی، کالری شمار و ژورنال ترید — همه در یک حساب. رایگان شروع کن.`;

export function generateMetadata(): Metadata {
  const en = isEn();
  return {
    // absolute یعنی الگوی «%s | آریون» به این عنوان اضافه نشه؛ اسم برند از
    // قبل داخلش هست و تکرارش فقط عنوان رو بلند و بریده می‌کنه.
    ...pageMetadata({
      title: en ? EN_HOME_TITLE : HOME_TITLE,
      description: en ? EN_HOME_DESC : HOME_DESC,
      path: "/",
      ogTitle: en ? EN_HOME_TITLE : BRAND_TITLE,
      ownOgImage: true,
    }),
    keywords: en
      ? [
          BRAND_EN, "routine app", "daily planner", "weekly planner", "habit tracker", "trading journal",
          "AI workout plan", "calorie tracker", "forex economic calendar",
        ]
      : [
          BRAND_FA, "Arion", "روتین اپ", "روتین اپ آریون", "برنامه ریزی روزانه", "اپ برنامه ریزی روزانه",
          "برنامه روزانه", "برنامه هفتگی", "عادت ساز", "ژورنال ترید", "ژورنال معاملاتی", "برنامه بدنسازی",
          "برنامه بدنسازی با هوش مصنوعی", "کالری شمار", "کالری شمار فارسی", "تقویم اقتصادی فارکس",
        ],
  };
}

// قیمت «روتین من» داخل FAQ از پنل ادمین (/admin/pricing) پر می‌شه
export const revalidate = 300;

export default async function HomePage() {
  const faqItems = fillPriceCopy(FAQ_ITEMS, await getPricingConfig());
  // Organization/WebSite/SoftwareApplication (با @id) از root layout
  // میان — تکرار همون بلوک اینجا فقط یه کپی عینا یکسان توی <head> بود.
  // FAQPage سؤالات متداول لندینگ — همون الگوی صفحه‌های فرود (داده‌ی ثابت).
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqItems)) }} />
      <HomeClient />
    </>
  );
}
