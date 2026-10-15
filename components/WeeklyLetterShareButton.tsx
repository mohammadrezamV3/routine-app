"use client";

// دکمه‌ی اشتراک کارت خلاصه‌ی هفته (همون کارت canvas آنالیز هفتگی).
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

  return (
    <button type="button" className="account-outline-btn wl-live-btn wl-live-share" onClick={share} disabled={busy} aria-label={tr("اشتراک‌گذاری کارت این هفته", "Share this week's card")}>
      {busy ? <Spinner size={14} label={null} /> : <><Share2 size={14} />{failed ? tr("تلاش دوباره", "Try again") : tr("اشتراک‌گذاری", "Share")}</>}
    </button>
  );
}
