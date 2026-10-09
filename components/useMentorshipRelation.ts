"use client";

import { useLiveRefresh } from "@/lib/liveSync";
import { useCallback, useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import type { MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";
import { networkError, readApiError } from "@/lib/mentorFormat";

export type RelationRole = "student" | "mentor";
export type Relation = { row: MentorshipRow; role: RelationRole };

/**
 * یک رابطه‌ی منتوری + نقش بیننده. قرارداد GET تکی رابطه ندارد؛ دو فهرست
 * «شاگرد/منتور» خوانده و همین id پیدا می‌شود (هر دو طرف صفحه‌ی رابطه و
 * گفت‌وگو را می‌بینند). مشترک /mentorship/[id] و /mentorship/[id]/chat.
 */
export function useMentorshipRelation(id: string) {
  const [rel, setRel] = useState<Relation | null>(null);
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, m] = await Promise.all([
        fetch("/api/mentorships?role=student", { cache: "no-store" }),
        fetch("/api/mentorships?role=mentor", { cache: "no-store" }),
      ]);
      if (!s.ok && !m.ok) {
        setError({ msg: await readApiError(s, tr("اطلاعات رابطه دریافت نشد؛ دوباره تلاش کن", "Couldn't load the mentorship. Try again")), retry: s.status >= 500 });
        return;
      }
      const sd: MentorshipsResponse | null = s.ok ? await s.json() : null;
      const md: MentorshipsResponse | null = m.ok ? await m.json() : null;
      const asStudent = sd?.mentorships.find((r) => r.id === id);
      const asMentor = md?.mentorships.find((r) => r.id === id);
      if (asStudent) setRel({ row: asStudent, role: "student" });
      else if (asMentor) setRel({ row: asMentor, role: "mentor" });
      else setError({ msg: tr("این رابطه پیدا نشد یا به آن دسترسی نداری", "This mentorship wasn't found or you don't have access to it"), retry: false });
    } catch {
      setError({ msg: networkError(), retry: true });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor:mentorship", () => { load(); });

  return { rel, error, reload: load };
}
