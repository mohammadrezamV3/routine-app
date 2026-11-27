import type { Metadata } from "next";
import { FoodSeoView, type FoodBlock } from "@/components/FoodSeoView";
import { BRAND_FA, brandName } from "@/lib/brand";
import { allFoodSeo, foodCategories, foodPath, FOOD_HUB_PATH } from "@/lib/foodSeo";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  const n = allFoodSeo().length;
  return pageMetadata({
    title: tr(
      `جدول کالری غذاها | کالری ${n} غذا و خوراکی در 100 گرم | ${BRAND_FA}`,
      `Food calorie table | Calories of ${n} foods per 100 g | ${brand}`,
    ),
    description: tr(
      `جدول کامل کالری غذاهای ایرانی و خارجی: کالری برنج، انواع نان، خورش‌ها، گوشت، لبنیات، میوه و تنقلات در 100 گرم. روی هر غذا بزن تا کالری پرس‌های مختلف و زمان سوزاندن آن را ببینی.`,
      `A full calorie table of Iranian and international foods: calories of rice, breads, stews, meat, dairy, fruit and snacks per 100 g. Open any food to see its portion calories and the time needed to burn it.`,
    ),
    path: FOOD_HUB_PATH,
    ownOgImage: true,
    ogTitle: tr(`جدول کالری غذاها | ${BRAND_FA}`, `Food calorie table | ${brand}`),
  });
}

export default function FoodCaloriesHubPage() {
  const brand = brandName();
  const n = allFoodSeo().length;
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("جدول کالری غذاها", "Food calorie table"), path: FOOD_HUB_PATH },
  ];

  const blocks: FoodBlock[] = [
    {
      type: "text",
      title: tr("جدول کالری غذاها را چطور بخوانیم؟", "How to read the food calorie table"),
      paragraphs: [
        tr(
          "عدد کنار هر غذا، کالری آن در هر 100 گرم است. برای پیدا کردن کالری مقدار دلخواه، عدد را در وزن غذا (به گرم) ضرب کن و بر 100 تقسیم کن؛ مثلا 200 گرم غذایی با 130 کالری در 100 گرم، حدود 260 کالری دارد.",
          "The number next to each food is its calories per 100 g. To get the calories of any amount, multiply the number by the weight in grams and divide by 100. For example, 200 g of a food with 130 kcal per 100 g has about 260 kcal.",
        ),
        tr(
          "کالری غذاها به روش پخت، نوع مواد اولیه و برند فرق می‌کند، پس این اعداد تقریبی و برای برنامه‌ریزی روزانه هستند. غذاها بر اساس دسته‌بندی مرتب شده‌اند و با زدن روی نام هر غذا، جدول پرس‌ها، زمان سوزاندن و غذاهای مشابه را می‌بینی.",
          "Calories vary with cooking method, ingredients and brand, so these figures are approximate and meant for daily planning. Foods are grouped by category; open any food to see its portion table, burn time and similar foods.",
        ),
      ],
    },
    ...foodCategories().map<FoodBlock>((c) => ({
      type: "table",
      title: tr(`کالری ${c.fa}`, `Calories of ${c.en.toLowerCase()}`),
      headers: [tr("غذا", "Food"), tr("کالری در 100 گرم", "Calories per 100 g")],
      rows: c.items.map((f) => [{ text: tr(f.fa, f.en), href: foodPath(f.slug) }, `${f.kcal} ${tr("کالری", "kcal")}`]),
    })),
    {
      type: "links",
      title: tr("ابزارهای مرتبط", "Related tools"),
      links: [
        {
          href: "/calorie-calculator",
          label: tr("ماشین‌حساب کالری روزانه", "Daily calorie calculator"),
          note: tr("کالری موردنیاز روزانه‌ات (TDEE) را رایگان حساب کن.", "Work out your daily calorie needs (TDEE) for free."),
        },
        {
          href: "/calorie-counter",
          label: tr("کالری‌شمار فارسی", "Calorie counter"),
          note: tr("غذاهای هر روز را ثبت کن و مجموع کالری را با هدفت مقایسه کن.", "Log your meals each day and compare the total with your target."),
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumb)]) }}
      />
      <FoodSeoView
        breadcrumb={breadcrumb}
        h1={tr("جدول کالری غذاها", "Food calorie table")}
        lead={tr(
          `کالری ${n} غذا و خوراکی ایرانی و بین‌المللی در هر 100 گرم، از برنج و نان سنگک تا خورش‌ها، میوه‌ها و تنقلات؛ یک‌جا و مرتب‌شده بر اساس دسته.`,
          `Calories of ${n} Iranian and international foods per 100 g, from rice and sangak bread to stews, fruit and snacks, all in one place and grouped by category.`,
        )}
        blocks={blocks}
        ctaLabel={tr("ثبت غذا در کالری‌شمار", "Log food in the calorie counter")}
        ctaHref="/calorie-counter"
        secondaryHref="/calorie-calculator"
        secondaryLabel={tr("محاسبه کالری روزانه", "Calculate daily calories")}
      />
    </>
  );
}
