"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE } from "./MentorUI";
import { MentorSheet } from "./MentorMotion";
import { MentorIntakeAnswers } from "./MentorIntakeAnswers";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { GoldenName } from "./GoldenName";
import { categoryLabel } from "./MentorBadges";
import { fmtRelative } from "@/lib/mentorFormat";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorshipRow } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

/**
 * برگه‌ی «دیدن درخواست»: پیام شاگرد، جواب سوال‌های اول کار و قبول/رد.
 * PATCH /api/mentorships/[id] با accept/reject؛ شرط‌های سمت سرور (تایید هویت،
 * شرایط منتوری، ظرفیت) همان پیام خطای سرور را نشان می‌دهند.
 */
export function MentorTodayRequestSheet({
  row, onClose, suspended, onChanged,
}: { row: MentorshipRow | null; onClose: () => void; suspended: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "accept" | "reject") {
    if (!row || busy) return;
    setBusy(action);
    setError(null);
    const r = await mentorApi<unknown>(`/api/mentorships/${row.id}`, { method: "PATCH", body: { action } });
    setBusy(null);
    if (!r.ok) {
      setError(r.error);
      if (r.status === 409 || r.status === 404) onChanged();
      return;
    }
    onChanged();
    onClose();
  }

  const name = row ? publicUserName(row.counterpart) : "";
  return (
    <MentorSheet open={!!row} onClose={() => { setError(null); onClose(); }} title={tr("درخواست شاگردی", "Student request")} size="md" dismissible={!busy}>
      {row && (
        <div className="mv2-today-req">
          <div className="mv2-today-req-head">
            <MentorUserAvatar avatarUrl={row.counterpart.avatarUrl} name={name} size={44} />
            <div>
              <b><GoldenName golden={row.counterpart.golden} staff={row.counterpart.staff}>{name}</GoldenName></b>
              <p>
                {fmtRelative(row.createdAt)}
                {row.categories.length > 0 && ` · ${row.categories.map(categoryLabel).join(tr("، ", ", "))}`}
              </p>
            </div>
          </div>
          {row.message && <p className="mentor-quote">{row.message}</p>}
          <MentorIntakeAnswers answers={row.intakeAnswers} />
          {suspended && <p className="mv2-today-req-note">{tr("تا وقتی حساب مربی‌گری‌ت بسته است، شاگرد تازه قبول نمی‌شه", "You cannot accept new students while your mentor account is closed")}</p>}
          {error && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="mentor-form-actions">
            <button type="button" className="account-outline-btn muted mentor-btn" disabled={!!busy} onClick={() => act("reject")}>
              {busy === "reject" ? <Spinner size={14} /> : <><X size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("رد کردن", "Decline")}</>}
            </button>
            <button type="button" className="trade-primary-btn mentor-btn" disabled={!!busy || suspended} onClick={() => act("accept")}>
              {busy === "accept" ? <Spinner size={14} /> : <><Check size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("قبول کردن", "Accept")}</>}
            </button>
          </div>
        </div>
      )}
    </MentorSheet>
  );
}
