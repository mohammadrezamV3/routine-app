import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FoodSeoView, type FoodBlock } from "@/components/FoodSeoView";
import { BRAND_FA, brandName } from "@/lib/brand";
import {
  allFoodSeo,
  BURN_WEIGHT_KG,
  burnMinutes,
  categoryAverage,
  categoryMeta,
  foodBySlug,
  foodPath,
  FOOD_HUB_PATH,
  portionTable,
  similarFoods,
  type FoodSeo,
} from "@/lib/foodSeo";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return allFoodSeo().map((f) => ({ slug: f.slug }));
}

const name = (f: FoodSeo) => tr(f.fa, f.en);

/** مدت به متن کوتاه: زیر 1 دقیقه یا N دقیقه یا H ساعت و M دقیقه */
function dur(min: number): string {
  if (min < 1) return tr("کمتر از 1 دقیقه", "under 1 minute");
  if (min < 60) return tr(`${min} دقیقه`, `${min} min`);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? tr(`${h} ساعت و ${m} دقیقه`, `${h} h ${m} min`) : tr(`${h} ساعت`, `${h} h`);
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const f = foodBySlug(params.slug);
  if (!f) return {};
  const brand = brandName();
  const p200 = Math.round(f.kcal * 2);
  const walk = burnMinutes(f.kcal).walking;
  return pageMetadata({
    title: tr(
      `کالری ${f.fa} چقدر است؟ | ${f.kcal} کالری در 100 گرم | ${BRAND_FA}`,
      `How many calories in ${f.en}? | ${f.kcal} kcal per 100 g | ${brand}`,
    ),
    description: tr(
      `${f.fa} در هر 100 گرم حدود ${f.kcal} کالری دارد و 200 گرم آن ${p200} کالری است. جدول کالری پرس‌های 50 تا 250 گرم، زمان سوزاندن (حدود ${dur(walk)} پیاده‌روی برای 100 گرم) و مقایسه با غذاهای مشابه.`,
      `${f.en} has about ${f.kcal} kcal per 100 g, and 200 g has ${p200} kcal. Portion table from 50 to 250 g, burn time (about ${dur(walk)} of walking for 100 g) and a comparison with similar foods.`,
    ),
    path: foodPath(f.slug),
    ownOgImage: false,
    ogTitle: tr(`کالری ${f.fa} | ${BRAND_FA}`, `Calories in ${f.en} | ${brand}`),
  });
}

export default function FoodCaloriesPage({ params }: { params: { slug: string } }) {
  const f = foodBySlug(params.slug);
  if (!f) notFound();
  const brand = brandName();
  const fname = name(f);
  const cat = categoryMeta(f.category);
  const similar = similarFoods(f, 6);
  const burn100 = burnMinutes(f.kcal);
  const avg = categoryAverage(f.category);
  const diff = f.kcal - avg;
  const kcalWord = tr("کالری", "kcal");

  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("جدول کالری غذاها", "Food calorie table"), path: FOOD_HUB_PATH },
    { name: tr(`کالری ${f.fa}`, `Calories in ${f.en}`), path: foodPath(f.slug) },
  ];

  const p200 = portionTable(f.kcal).find((p) => p.grams === 200)!.kcal;
  const faqs = [
    {
      q: tr(`${f.fa} چند کالری دارد؟`, `How many calories are in ${f.en}?`),
      a: tr(
        `هر 100 گرم ${f.fa} حدود ${f.kcal} کالری دارد. یک پرس 200 گرمی آن حدود ${p200} کالری و 50 گرم آن حدود ${Math.round(f.kcal / 2)} کالری است. این عدد تقریبی است و با روش پخت و مواد اولیه کمی فرق می‌کند.`,
        `Every 100 g of ${f.en} has about ${f.kcal} kcal. A 200 g serving has about ${p200} kcal and 50 g has about ${Math.round(f.kcal / 2)} kcal. This figure is approximate and varies a little with cooking method and ingredients.`,
      ),
    },
    {
      q: tr(`برای سوزاندن کالری 100 گرم ${f.fa} چقدر باید ورزش کرد؟`, `How much exercise burns the calories of 100 g of ${f.en}?`),
      a: tr(
        `برای فردی با وزن ${BURN_WEIGHT_KG} کیلوگرم، حدود ${dur(burn100.walking)} پیاده‌روی، ${dur(burn100.cycling)} دوچرخه‌سواری یا ${dur(burn100.running)} دویدن معادل ${f.kcal} کالری است.`,
        `For a ${BURN_WEIGHT_KG} kg person, about ${dur(burn100.walking)} of walking, ${dur(burn100.cycling)} of cycling or ${dur(burn100.running)} of running equals ${f.kcal} kcal.`,
      ),
    },
    {
      q: tr(`کالری ${f.fa} نسبت به غذاهای هم‌دسته چطور است؟`, `How do the calories of ${f.en} compare with similar foods?`),
      a: tr(
        `میانگین کالری غذاهای دسته‌ی «${cat.fa}» در این جدول حدود ${avg} کالری در 100 گرم است و ${f.fa} با ${f.kcal} کالری ${diff === 0 ? "برابر میانگین" : diff > 0 ? `حدود ${diff} کالری بالاتر از میانگین` : `حدود ${-diff} کالری پایین‌تر از میانگین`} است.`,
        `The average of the “${cat.en}” category in this table is about ${avg} kcal per 100 g, and ${f.en} at ${f.kcal} kcal is ${diff === 0 ? "equal to the average" : diff > 0 ? `about ${diff} kcal above the average` : `about ${-diff} kcal below the average`}.`,
      ),
    },
  ];

  const blocks: FoodBlock[] = [
    {
      type: "facts",
      title: tr(`خلاصه‌ی کالری ${f.fa}`, `${f.en} calories at a glance`),
      items: [
        { label: tr("کالری در 100 گرم", "Calories per 100 g"), value: `${f.kcal} ${kcalWord}` },
        { label: tr("پرس 200 گرمی", "200 g serving"), value: `${p200} ${kcalWord}` },
        { label: tr("دسته", "Category"), value: tr(cat.fa, cat.en) },
        { label: tr("میانگین دسته", "Category average"), value: `${avg} ${kcalWord}` },
      ],
    },
    {
      type: "table",
      title: tr(`جدول کالری ${f.fa} در مقدارهای مختلف`, `${f.en} calories by portion size`),
      headers: [tr("مقدار", "Amount"), tr("کالری", "Calories")],
      rows: portionTable(f.kcal).map((p) => [tr(`${p.grams} گرم`, `${p.grams} g`), `${p.kcal} ${kcalWord}`]),
      note: tr(
        "اعداد تقریبی‌اند و بسته به روش پخت و مواد اولیه کمی تفاوت دارند.",
        "Figures are approximate and vary a little with cooking method and ingredients.",
      ),
    },
    {
      type: "table",
      title: tr(`چقدر طول می‌کشد کالری ${f.fa} را بسوزانیم؟`, `How long does it take to burn off ${f.en}?`),
      headers: [tr("فعالیت", "Activity"), tr("50 گرم", "50 g"), tr("100 گرم", "100 g"), tr("200 گرم", "200 g")],
      rows: [
        [tr("پیاده‌روی", "Walking"), dur(burnMinutes(f.kcal / 2).walking), dur(burn100.walking), dur(burnMinutes(f.kcal * 2).walking)],
        [tr("دوچرخه‌سواری", "Cycling"), dur(burnMinutes(f.kcal / 2).cycling), dur(burn100.cycling), dur(burnMinutes(f.kcal * 2).cycling)],
        [tr("دویدن", "Running"), dur(burnMinutes(f.kcal / 2).running), dur(burn100.running), dur(burnMinutes(f.kcal * 2).running)],
      ],
      note: tr(
        `فرض محاسبه: فردی با وزن ${BURN_WEIGHT_KG} کیلوگرم؛ پیاده‌روی با شدت متوسط (حدود 3.5 MET)، دوچرخه‌سواری متوسط (حدود 7.5 MET) و دویدن (حدود 9.8 MET). مصرف واقعی انرژی با وزن و شدت فعالیت هر فرد فرق می‌کند.`,
        `Assumption: a ${BURN_WEIGHT_KG} kg person; moderate walking (about 3.5 MET), moderate cycling (about 7.5 MET) and running (about 9.8 MET). Real energy use varies with each person's weight and effort.`,
      ),
    },
    ...(similar.length
      ? [
          {
            type: "table" as const,
            title: tr(`مقایسه با غذاهای مشابه ${f.fa}`, `${f.en} compared with similar foods`),
            headers: [tr("غذا", "Food"), tr("کالری در 100 گرم", "Calories per 100 g")],
            rows: [
              [name(f), `${f.kcal} ${kcalWord}`],
              ...similar.map((s) => [{ text: name(s), href: foodPath(s.slug) }, `${s.kcal} ${kcalWord}`]),
            ],
          },
        ]
      : []),
    {
      type: "faq",
      title: tr(`سوال‌های رایج درباره کالری ${f.fa}`, `Frequently asked questions about ${f.en}`),
      faqs,
    },
    {
      type: "links",
      title: tr("ادامه بده", "Keep going"),
      links: [
        {
          href: FOOD_HUB_PATH,
          label: tr("جدول کالری همه‌ی غذاها", "Calorie table of all foods"),
          note: tr("کالری صدها غذا و خوراکی دیگر را ببین.", "See the calories of hundreds of other foods."),
        },
        {
          href: "/calorie-calculator",
          label: tr("ماشین‌حساب کالری روزانه", "Daily calorie calculator"),
          note: tr("ببین امروز چقدر کالری نیاز داری.", "Find out how many calories you need today."),
        },
        {
          href: "/calorie-counter",
          label: tr("کالری‌شمار فارسی", "Calorie counter"),
          note: tr(`${f.fa} و غذاهای دیگرت را ثبت کن و مجموع کالری روزانه را ببین.`, `Log ${f.en} and your other meals and see your daily total.`),
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumb), faqJsonLd(faqs)]) }}
      />
      <FoodSeoView
        breadcrumb={breadcrumb}
        h1={tr(`کالری ${f.fa} در 100 گرم`, `Calories in 100 g of ${f.en}`)}
        lead={tr(
          `هر 100 گرم ${f.fa} حدود ${f.kcal} کالری دارد. در این صفحه کالری پرس‌های مختلف، زمان لازم برای سوزاندن آن و مقایسه با غذاهای مشابه را می‌بینی.`,
          `Every 100 g of ${f.en} has about ${f.kcal} kcal. This page shows the calories of different portions, the time needed to burn them and a comparison with similar foods.`,
        )}
        blocks={blocks}
        ctaLabel={tr("ثبت غذا در کالری‌شمار", "Log food in the calorie counter")}
        ctaHref="/auth/signup"
        secondaryHref="/calorie-counter"
        secondaryLabel={tr("بیشتر درباره کالری‌شمار", "More about the calorie counter")}
      />
    </>
  );
}
