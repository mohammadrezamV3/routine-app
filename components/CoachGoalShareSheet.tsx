"use client";

// پنجره‌ی اشتراک کارت نتیجه‌ی هدف: تصویر + یک دکمه. با next/dynamic (ssr:false) لود کن.
import "./coach.css";
import { useCallback, useEffect, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import type { CoachGoal } from "@/lib/coachTypes";
import { goalCardInput, renderCoachGoalCard } from "@/lib/coachShareCard";
import { canvasToBlob } from "@/lib/shareCard";
import { useImageShare } from "@/lib/useImageShare";
import { MentorSheet } from "./MentorMotion";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

export default function CoachGoalShareSheet({ open, onClose, goal, withName, inviteCode }: { open: boolean; onClose: () => void; goal: CoachGoal; withName?: string | null; inviteCode?: string | null }) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { canShare, phase, result, share, reset } = useImageShare();
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  useEffect(() => {
    if (!open || !canvasEl) return;
    let dead = false;
    setBlob(null);
    setFailed(false);
    (async () => {
      try {
        const full = await renderCoachGoalCard(goalCardInput(goal, { withName, inviteCode }));
        const b = await canvasToBlob(full);
        if (dead) return;
        canvasEl.width = 540;
        canvasEl.height = 675;
        canvasEl.getContext("2d")?.drawImage(full, 0, 0, 540, 675);
        setBlob(b);
      } catch {
        if (!dead) setFailed(true);
      }
    })();
    return () => { dead = true; };
  }, [open, canvasEl, goal, withName, inviteCode, attempt]);

  const doShare = useCallback(() => {
    if (failed) { setAttempt((n) => n + 1); return; }
    if (!blob) return;
    const lead = goal.status === "DONE"
      ? tr(`هدفم رو کامل کردم: ${goal.title}`, `I completed my goal: ${goal.title}`)
      : tr(`${goal.weeksMet} هفته از ${goal.weeks} هفته‌ی هدفم رو موفق بودم`, `${goal.weeksMet} of ${goal.weeks} goal weeks done`);
    share(blob, `arion-goal-${goal.id}.png`, tr("هدف", "Goal"), lead);
  }, [blob, failed, goal, share]);

  const busy = phase === "busy";
  const rendering = !blob && !failed;
  const saveOnly = canShare === false;
  const label = phase === "done" ? (result === "downloaded" ? tr("ذخیره شد", "Saved") : tr("ارسال شد", "Sent"))
    : failed || phase === "error" ? tr("تلاش دوباره", "Try again")
    : saveOnly ? tr("ذخیره تصویر", "Save image") : tr("اشتراک‌گذاری", "Share");
  return (
    <MentorSheet open={open} onClose={onClose} size="sm" labelledBy={undefined} title={undefined}>
      <div className="ch-share" aria-label={tr("اشتراک هدف", "Share goal")}>
        <div className="ch-share-preview" aria-busy={rendering || undefined}>
          <canvas ref={setCanvasEl} className={rendering ? "is-hidden" : undefined} role="img" aria-label={tr("پیش‌نمایش کارت هدف", "Goal card preview")} />
          {rendering && <span className="ch-share-spin"><Spinner size={22} /></span>}
        </div>
        <button type="button" className="btn btn-primary" onClick={doShare} disabled={rendering || busy} aria-busy={busy || rendering || undefined}>
          {busy || rendering ? <Spinner size={16} /> : phase === "done" ? <Check size={17} aria-hidden="true" /> : saveOnly ? <Download size={17} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
          {!(busy || rendering) && <span>{label}</span>}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{tr("بستن", "Close")}</button>
      </div>
    </MentorSheet>
  );
}
