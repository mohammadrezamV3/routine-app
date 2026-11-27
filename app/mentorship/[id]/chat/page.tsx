import { redirect } from "next/navigation";

/** گفت‌وگو حالا بخشی از فضای همکاری است؛ لینک‌های قدیمی (?report=1) هم همراه می‌آن */
export default function MentorshipChatRedirect({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const q = new URLSearchParams();
  for (const k of ["report", "draft"]) {
    const v = searchParams[k];
    if (typeof v === "string") q.set(k, v);
  }
  const qs = q.toString();
  redirect(`/mentorship/${encodeURIComponent(params.id)}${qs ? `?${qs}` : ""}`);
}
