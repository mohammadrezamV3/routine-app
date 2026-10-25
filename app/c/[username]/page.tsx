import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachProfileView } from "@/components/CoachProfileView";
import { loadPublicCoach } from "@/lib/coachProfileSsr";
import { pageMetadata } from "@/lib/seo";
import { tr } from "@/lib/i18n";

// صفحه‌ی عمومی مربی با لینک کوتاه (docs/coach-v3.md): SSR با متادیتا؛ فقط مربی منتشرشده و غیرمعلق
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const coach = await loadPublicCoach(params.username);
  if (!coach) return { title: tr("مربی پیدا نشد", "Mentor not found"), robots: { index: false, follow: false } };
  const m = coach.data.mentor;
  return pageMetadata({
    title: tr(`${m.name} | مربی`, `${m.name} | Mentor`),
    description: m.headline || tr(`صفحه‌ی ${m.name}، مربی در آریون`, `${m.name}, a mentor on Arion`),
    path: `/c/${coach.username}`,
  });
}

export default async function CoachShortLinkPage({ params }: { params: { username: string } }) {
  const coach = await loadPublicCoach(params.username);
  if (!coach) notFound();
  return <CoachProfileView mentorId={coach.data.mentor.userId} initial={coach.data} username={coach.username} path={`/c/${coach.username}`} />;
}
