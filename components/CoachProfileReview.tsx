"use client";

import "./coach.css";
import "./coach-discover.css";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { CoachSheet, CoachSheetActions, CoachSheetBody } from "./CoachSheet";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { Spinner } from "./Spinner";
import { networkError, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import type { Review } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

const REVIEW_MAX = 1000;

/** ستاره‌های فقط‌نمایشی نظر */
export function CoachStars({ value }: { value: number }) {
  const filled = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <span className="chpf-stars" role="img" aria-label={tr(`امتیاز ${faNum(value)} از 5`, `Rated ${faNum(value)} out of 5`)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} strokeWidth={1.75} className={i <= filled ? undefined : "is-empty"} fill={i <= filled ? "currentColor" : "none"} aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * نوشتن، ویرایش و حذف نظر خودم (POST/PUT/DELETE /api/mentors/[id]/reviews) در یک شیت.
 * دکمه‌ی اصلی آخر ردیف؛ حذف در پاورقی با تایید جدا.
 */
export function CoachProfileReviewSheet({
  open, mentorId, myReview, onClose, onChanged,
}: {
  open: boolean;
  mentorId: string;
  myReview: Review | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [body, setBody] = useState(myReview?.body ?? "");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tooLong = body.trim().length > REVIEW_MAX;

  useEffect(() => {
    if (open) { setRating(myReview?.rating ?? 0); setBody(myReview?.body ?? ""); setError(null); setRatingError(null); }
  }, [open, myReview]);

  async function save() {
    if (rating < 1 || rating > 5) { setRatingError(tr("امتیاز را انتخاب کن", "Choose a rating")); return; }
    if (tooLong) return;
    setBusy("save");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, {
        method: myReview ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined }),
      });
      if (res.status === 409) { setError(tr("برای این مربی قبلا نظر ثبت کرده‌ای", "You've already reviewed this mentor")); onChanged(); return; }
      if (!res.ok) { setError(await readApiError(res, tr("نظر ثبت نشد؛ دوباره تلاش کن", "Couldn't save your review. Try again"))); return; }
      onChanged();
      onClose();
    } catch {
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/mentors/${mentorId}/reviews`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) { setError(await readApiError(res, tr("نظر حذف نشد؛ دوباره تلاش کن", "Couldn't delete your review. Try again"))); return; }
      setConfirmDelete(false);
      onChanged();
      onClose();
    } catch {
      setError(networkError());
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <CoachSheet open={open && !confirmDelete} onClose={onClose} title={myReview ? tr("نظر من", "My review") : tr("نظر بده", "Write a review")} dismissible={!busy}>
        <CoachSheetBody>
          <div className="chpf-field">
            <span className="chpf-label">{tr("امتیاز", "Rating")}</span>
            <div className="chpf-star-input" role="radiogroup" aria-label={tr("امتیاز", "Rating")}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i} type="button" role="radio" aria-checked={rating === i} className={i <= rating ? "on" : undefined}
                  aria-label={tr(`${faNum(i)} ستاره`, `${faNum(i)} ${i === 1 ? "star" : "stars"}`)}
                  onClick={() => { setRating(i); setRatingError(null); }}
                >
                  <Star size={26} strokeWidth={1.75} fill={i <= rating ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              ))}
            </div>
            {ratingError && <span className="chpf-field-error" role="alert">{ratingError}</span>}
          </div>
          <div className="chpf-field">
            <label htmlFor="chpf-review-body">{tr("نظرت", "Your review")} <span className="chpf-count">{tr("(اختیاری)", "(optional)")}</span></label>
            <textarea
              id="chpf-review-body" className="trade-glass-field" rows={4} value={body} maxLength={REVIEW_MAX + 50}
              onChange={(e) => setBody(e.target.value)} aria-invalid={tooLong}
              placeholder={tr("مثلا «برنامه‌ها دقیق و قابل اجرا بود»", "For example: \"The programs were precise and doable\"")}
            />
            {tooLong && <span className="chpf-field-error" role="alert">{tr(`نظر حداکثر ${faNum(REVIEW_MAX)} حرف است`, `Reviews can be up to ${faNum(REVIEW_MAX)} characters`)}</span>}
          </div>
          {error && <p className="chpf-error" role="alert">{error}</p>}
        </CoachSheetBody>
        <CoachSheetActions>
          {myReview && (
            <button type="button" className="btn btn-ghost btn-danger" onClick={() => { setError(null); setConfirmDelete(true); }} disabled={!!busy}>
              {tr("حذف نظر", "Delete review")}
            </button>
          )}
          <button type="button" className={`btn btn-primary${busy === "save" ? " is-loading" : ""}`} onClick={save} disabled={!!busy || tooLong}>
            {busy === "save" ? <Spinner size={16} /> : myReview ? tr("ذخیره", "Save") : tr("ثبت نظر", "Post review")}
          </button>
        </CoachSheetActions>
      </CoachSheet>
      {confirmDelete && (
        <MentorConfirmDialog
          message={tr("نظرت حذف شود؟", "Delete your review?")}
          hint={tr("امتیاز مربی بدون این نظر دوباره حساب می‌شود.", "The mentor's rating will be recalculated without this review.")}
          confirmLabel={tr("حذف نظر", "Delete review")}
          busy={busy === "delete"}
          error={error}
          onConfirm={remove}
          onCancel={() => { setConfirmDelete(false); setError(null); }}
        />
      )}
    </>
  );
}
