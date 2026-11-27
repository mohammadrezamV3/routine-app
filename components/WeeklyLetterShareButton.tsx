"use client";

// دکمه‌ی اشتراک کارت خلاصه‌ی هفته (همون کارت canvas آنالیز هفتگی): فقط آیکون، داخل جلد.
import { useState } from "react";
import { Share2 } from "lucide-react";
import { tr } from "@/lib/i18n";
import { Spinner } from "./Spinner";
import { shareWeeklyCard } from "./WeeklyAnalysisShare";
import type { LetterCtx } from "./WeeklyLetterCtx";
import "./weekly-letter.css";

export function WeeklyLetterShareButton({ ctx }: { ctx: LetterCtx }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await shareWeeklyCard(ctx.analysis);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const label = failed ? tr("اشتراک‌گذاری ناموفق بود، تلاش دوباره", "Share failed, try again") : tr("اشتراک‌گذاری کارت این هفته", "Share this week's card");
  return (
    <button type="button" className={`btn btn-ghost btn-icon btn-sm wl-live-share${failed ? " is-failed" : ""}`} onClick={share} disabled={busy} aria-label={label} title={label}>
      {busy ? <Spinner size={16} label={null} /> : <Share2 size={17} />}
    </button>
  );
}
