import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExerciseSeoView, type ExSection } from "@/components/ExerciseSeoView";
import { BRAND_FA, brandName } from "@/lib/brand";
import { EQUIPMENT_LABEL } from "@/lib/exerciseCatalog";
import {
  allExerciseSeo, difficultyText, exerciseBySlug, exerciseEn, exerciseEnglishName, exerciseFacts, howToJsonLd,
  muscleHubTitle, muscleLabelSeo, relatedExercises,
} from "@/lib/exerciseSeo";
import { isEn, tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return allExerciseSeo().map((i) => ({ slug: i.slug }));
}

function names(item: NonNullable<ReturnType<typeof exerciseBySlug>>) {
  const fa = item.entry.name;
  const en = exerciseEnglishName(item.entry);
  return { fa, en, shown: tr(fa, en || fa) };
}

function clip(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const item = exerciseBySlug(params.slug);
  if (!item) return {};
  const brand = brandName();
  const { fa, en, shown } = names(item);
  const e = item.entry;
  const enData = exerciseEn(e);
  const muscles = tr(e.muscleGroup, enData?.muscleGroup ?? e.muscleGroup);
  const { equipment } = exerciseFacts(e);
  const faTitleName = en ? `${fa} (${en})` : fa;
  return pageMetadata({
    title: tr(
      `آموزش حرکت ${faTitleName} | عضلات درگیر و روش اجرا | ${BRAND_FA}`,
      `${shown} exercise guide | Muscles worked and how to do it | ${brand}`,
    ),
    description: clip(
      tr(
        `آموزش حرکت ${fa}: روش اجرای مرحله‌به‌مرحله، عضلات درگیر (${muscles})، تجهیزات (${EQUIPMENT_LABEL[equipment]}) و فواید این حرکت بدنسازی.`,
        `How to do the ${shown}: step-by-step instructions, muscles worked (${muscles}), equipment (${EQUIPMENT_LABEL[equipment]}) and benefits of this exercise.`,
      ),
      170,
    ),
    path: `/exercises/${params.slug}`,
    ogTitle: tr(`آموزش حرکت ${fa}`, `${shown} exercise guide`),
  });
}

export default function ExercisePage({ params }: { params: { slug: string } }) {
  const item = exerciseBySlug(params.slug);
  if (!item) notFound();
  const brand = brandName();
  const e = item.entry;
  const enData = exerciseEn(e);
  const en = isEn();
  const { fa, en: enName, shown } = names(item);
  const { level, equipment } = exerciseFacts(e);
  const path = `/exercises/${params.slug}`;
  const primaryKey = e.muscleKeys[0];
  const secondaryKeys = e.muscleKeys.slice(1);
  const howTo = en && enData?.howTo?.length ? enData.howTo : e.howTo;
  const benefits = en && enData?.benefits ? enData.benefits : e.benefits;
  const muscleGroup = en && enData?.muscleGroup ? enData.muscleGroup : e.muscleGroup;
  const sep = tr("، ", ", ");

  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("کتابخانه حرکات", "Exercise library"), path: "/exercises" },
    { name: muscleHubTitle(primaryKey), path: `/exercises/muscle/${primaryKey}` },
    { name: shown, path },
  ];

  const tips: string[] = [
    tr(
      `${fa} یک حرکت ${EQUIPMENT_LABEL[equipment]}ی با سطح سختی ${difficultyText(level)} (${level} از 5) است.`,
      `The ${shown} is a ${EQUIPMENT_LABEL[equipment].toLowerCase()} exercise with a ${difficultyText(level).toLowerCase()} difficulty (${level} of 5).`,
    ),
    tr(
      `عضله‌ی اصلی این حرکت ${muscleLabelSeo(primaryKey)} است${secondaryKeys.length ? ` و ${secondaryKeys.map(muscleLabelSeo).join(sep)} به‌عنوان عضله‌ی کمکی کار می‌کنند` : ""}.`,
      `The main muscle is the ${muscleLabelSeo(primaryKey).toLowerCase()}${secondaryKeys.length ? `, with ${secondaryKeys.map((k) => muscleLabelSeo(k).toLowerCase()).join(sep)} assisting` : ""}.`,
    ),
    tr(
      `اگر تازه‌کار هستی، ابتدا با وزنه‌ی سبک مراحل اجرا را مرور کن و بعد وزنه را کم‌کم زیاد کن.`,
      `If you are a beginner, first go through the steps with a light weight, then increase the load gradually.`,
    ),
  ];
  if (level >= 4) {
    tips.push(tr(
      "این حرکت از نظر تکنیکی سخت‌تر است؛ بهتر است اجرای درست آن را زیر نظر مربی یاد بگیری.",
      "This exercise is technically demanding, so it is best to learn the correct form with a coach.",
    ));
  }

  const rel = relatedExercises(e, 8);
  const sections: ExSection[] = [
    {
      title: tr("مشخصات حرکت", "Exercise details"),
      facts: [
        { label: tr("عضله‌ی اصلی", "Primary muscle"), value: muscleLabelSeo(primaryKey) },
        ...(secondaryKeys.length ? [{ label: tr("عضلات کمکی", "Secondary muscles"), value: secondaryKeys.map(muscleLabelSeo).join(sep) }] : []),
        { label: tr("عضلات درگیر", "Muscles worked"), value: muscleGroup },
        { label: tr("تجهیزات", "Equipment"), value: EQUIPMENT_LABEL[equipment] },
        { label: tr("میزان سختی", "Difficulty"), value: `${difficultyText(level)} (${level}/5)` },
      ],
    },
    { title: tr(`روش اجرای ${fa}`, `How to do the ${shown}`), steps: howTo },
    { title: tr("فواید این حرکت", "Benefits"), paragraphs: [benefits] },
    { title: tr("نکته‌ها", "Tips"), bullets: tips },
    ...(rel.length
      ? [{
          title: tr("حرکات مرتبط", "Related exercises"),
          chips: true,
          links: rel.map((r) => ({ href: `/exercises/${r.slug}`, label: tr(r.entry.name, exerciseEnglishName(r.entry) || r.entry.name) })),
        }]
      : []),
    {
      title: tr("ادامه‌ی مسیر", "Keep exploring"),
      links: [
        {
          href: `/exercises/muscle/${primaryKey}`,
          label: muscleHubTitle(primaryKey),
          note: tr(`همه‌ی حرکات ${muscleLabelSeo(primaryKey)} را یک‌جا ببین.`, `See every ${muscleLabelSeo(primaryKey).toLowerCase()} exercise in one place.`),
        },
        {
          href: "/bodybuilding-program",
          label: tr("ساخت برنامه‌ی بدنسازی", "Build a bodybuilding program"),
          note: tr(`${BRAND_FA} این حرکت را با بقیه در یک برنامه‌ی هفتگی برایت می‌چیند.`, `${brand} arranges this exercise with others in a weekly program for you.`),
        },
      ],
    },
  ];

  const howToName = tr(`آموزش حرکت ${fa}`, `How to do the ${shown}`);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(breadcrumb),
            howToJsonLd({ name: howToName, description: clip(benefits, 200), steps: howTo, path }),
          ]),
        }}
      />
      <ExerciseSeoView
        breadcrumb={breadcrumb}
        h1={tr(`آموزش حرکت ${fa}`, `${shown} exercise guide`)}
        subtitle={!en && enName ? enName : undefined}
        lead={tr(
          `${fa}${enName ? ` (${enName})` : ""} یک حرکت بدنسازی برای ${muscleLabelSeo(primaryKey)} است. در این صفحه عضلات درگیر، روش اجرای مرحله‌به‌مرحله و فواید آن را می‌بینی.`,
          `The ${shown} is a bodybuilding exercise for the ${muscleLabelSeo(primaryKey).toLowerCase()}. This page covers the muscles worked, step-by-step instructions and benefits.`,
        )}
        cta={{
          href: "/bodybuilding-program",
          label: tr("ساخت برنامه‌ی تمرینی", "Build a workout program"),
          secondaryHref: "/auth/signup",
          secondaryLabel: tr(`ثبت‌نام در ${BRAND_FA}`, `Sign up for ${brand}`),
        }}
        sections={sections}
      />
    </>
  );
}
