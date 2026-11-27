import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExerciseSeoView, type ExSection } from "@/components/ExerciseSeoView";
import { BRAND_FA, brandName } from "@/lib/brand";
import { EQUIPMENT_LABEL, getExerciseEquipment, type ExerciseEquipment } from "@/lib/exerciseCatalog";
import { exerciseEnglishName, exercisesForMuscle, isMergedHub, MERGED_HUBS, muscleBySlug, muscleHubs, muscleHubTitle, muscleIntro, muscleLabelSeo, type ExerciseSeoItem } from "@/lib/exerciseSeo";
import { tr } from "@/lib/i18n";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return muscleHubs().map((h) => ({ muscle: h.slug }));
}

export function generateMetadata({ params }: { params: { muscle: string } }): Metadata {
  const key = muscleBySlug(params.muscle);
  if (!key) return {};
  const brand = brandName();
  const { primary } = exercisesForMuscle(key);
  const title = muscleHubTitle(key);
  const sample = primary.slice(0, 4).map((i) => tr(i.entry.name, exerciseEnglishName(i.entry) || i.entry.name)).join(tr("، ", ", "));
  return pageMetadata({
    title: tr(
      `${title} | آموزش ${primary.length} حرکت با روش اجرا | ${BRAND_FA}`,
      `${title} | ${primary.length} exercises with instructions | ${brand}`,
    ),
    description: tr(
      `فهرست کامل ${title} با روش اجرای قدم‌به‌قدم، تجهیزات و میزان سختی؛ از جمله ${sample} و بیشتر.`,
      `Full list of ${title.toLowerCase()} with step-by-step instructions, equipment and difficulty, including ${sample} and more.`,
    ),
    path: `/exercises/muscle/${params.muscle}`,
    ogTitle: title,
  });
}

function group(items: ExerciseSeoItem[]): ExSection[] {
  const map = new Map<ExerciseEquipment, ExerciseSeoItem[]>();
  for (const it of items) {
    const eq = getExerciseEquipment(it.entry);
    const arr = map.get(eq) ?? [];
    arr.push(it);
    map.set(eq, arr);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([eq, arr]) => ({
      title: tr(`با ${EQUIPMENT_LABEL[eq]}`, `With ${EQUIPMENT_LABEL[eq]}`),
      links: arr.map((i) => ({
        href: `/exercises/${i.slug}`,
        label: tr(i.entry.name, exerciseEnglishName(i.entry) || i.entry.name),
        note: tr(i.entry.muscleGroup, "") || undefined,
      })),
    }));
}

export default function MuscleHubPage({ params }: { params: { muscle: string } }) {
  const key = muscleBySlug(params.muscle);
  if (!key) notFound();
  const brand = brandName();
  const title = muscleHubTitle(key);
  const { primary, secondary } = exercisesForMuscle(key);
  const path = `/exercises/muscle/${params.muscle}`;
  const breadcrumb = [
    { name: brand, path: "/" },
    { name: tr("کتابخانه حرکات", "Exercise library"), path: "/exercises" },
    { name: title, path },
  ];
  const link = (i: ExerciseSeoItem) => ({
    href: `/exercises/${i.slug}`,
    label: tr(i.entry.name, exerciseEnglishName(i.entry) || i.entry.name),
  });
  // هاب ترکیبی: یک H2 برای هر زیرعضله (هر حرکت فقط زیر عضله‌ی اصلی خودش، پس تکراری نیست)
  const body: ExSection[] = isMergedHub(key)
    ? MERGED_HUBS[key].flatMap((sub) => {
        const items = primary.filter((i) => i.entry.muscleKeys[0] === sub);
        return items.length ? [{ title: muscleHubTitle(sub), links: items.map(link) }] : [];
      })
    : group(primary);
  const sections: ExSection[] = [
    ...body,
    ...(secondary.length
      ? [{
          title: tr(`حرکاتی که ${muscleLabelSeo(key)} رو کمکی درگیر می‌کنن`, `Exercises that also work ${muscleLabelSeo(key).toLowerCase()}`),
          chips: true,
          links: secondary.map((i) => ({ href: `/exercises/${i.slug}`, label: tr(i.entry.name, exerciseEnglishName(i.entry) || i.entry.name) })),
        }]
      : []),
    {
      title: tr("عضله‌های دیگه", "Other muscles"),
      chips: true,
      links: muscleHubs().filter((h) => h.key !== key).map((h) => ({ href: `/exercises/muscle/${h.slug}`, label: muscleHubTitle(h.key) })),
    },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbJsonLd(breadcrumb)]) }}
      />
      <ExerciseSeoView
        breadcrumb={breadcrumb}
        h1={title}
        lead={muscleIntro(key)}
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
