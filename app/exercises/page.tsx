import type { Metadata } from "next";
import { ExerciseSeoView } from "@/components/ExerciseSeoView";
import { BRAND_FA, brandName } from "@/lib/brand";
import { tr } from "@/lib/i18n";
import { allExerciseSeo, exerciseEnglishName, muscleHubTitle, muscleHubs, muscleIntro, POPULAR_EXERCISE_NAMES } from "@/lib/exerciseSeo";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const brand = brandName();
  const total = allExerciseSeo().length;
  return pageMetadata({
    title: tr(
      `کتابخانه حرکات بدنسازی | آموزش ${total} حرکت با عضلات درگیر | ${BRAND_FA}`,
      `Exercise library | ${total} exercises with muscles worked | ${brand}`,
    ),
    description: tr(
      `آموزش ${total} حرکت بدنسازی به تفکیک عضله: سینه، پشت، سرشانه، بازو، پا، شکم و بیشتر. برای هر حرکت روش اجرای مرحله‌به‌مرحله، عضلات درگیر، تجهیزات و میزان سختی رو ببین.`,
      `${total} bodybuilding exercises by muscle: chest, back, shoulders, arms, legs, abs and more. See step-by-step instructions, muscles worked, equipment and difficulty for each.`,
    ),
    path: "/exercises",
    ownOgImage: true,
    ogTitle: tr(`کتابخانه حرکات بدنسازی ${BRAND_FA}`, `${brand} exercise library`),
  });
}

export default function ExercisesHubPage() {
  const brand = brandName();
  const hubs = muscleHubs();
  const all = allExerciseSeo();
  const byName = new Map(all.map((i) => [i.entry.name, i]));
  const popular = POPULAR_EXERCISE_NAMES.map((n) => byName.get(n)).filter((x): x is NonNullable<typeof x> => !!x);
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("کتابخانه حرکات", "Exercise library"), path: "/exercises" },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumb)]) }}
      />
      <ExerciseSeoView
        breadcrumb={breadcrumb}
        h1={tr("کتابخانه حرکات بدنسازی", "Exercise library")}
        lead={tr(
          `اینجا ${all.length} حرکت بدنسازی رو به تفکیک عضله پیدا می‌کنی. هر حرکت صفحه‌ی خودش رو داره با روش اجرای قدم‌به‌قدم، عضلات درگیر، تجهیزات لازم و میزان سختی. از حرکات سینه و پشت تا تمرین سرشانه، بازو، پا و شکم.`,
          `Find ${all.length} bodybuilding exercises by muscle group. Each has its own page with step-by-step instructions, muscles worked, required equipment and difficulty, from chest and back to shoulders, arms, legs and abs.`,
        )}
        cta={{
          href: "/bodybuilding-program",
          label: tr("ساخت برنامه‌ی تمرینی", "Build a workout program"),
          secondaryHref: "/auth/signup",
          secondaryLabel: tr(`ثبت‌نام در ${BRAND_FA}`, `Sign up for ${brand}`),
        }}
        sections={[
          {
            title: tr("حرکات بدنسازی به تفکیک عضله", "Exercises by muscle"),
            links: hubs.map((h) => ({
              href: `/exercises/muscle/${h.slug}`,
              label: `${muscleHubTitle(h.key)} (${h.count})`,
              note: muscleIntro(h.key).split(/[.؟]/)[0] + ".",
            })),
          },
          ...(popular.length
            ? [{
                title: tr("حرکات محبوب", "Popular exercises"),
                chips: true,
                links: popular.map((i) => ({
                  href: `/exercises/${i.slug}`,
                  label: tr(i.entry.name, exerciseEnglishName(i.entry) || i.entry.name),
                })),
              }]
            : []),
        ]}
      />
    </>
  );
}
