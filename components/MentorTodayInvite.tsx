"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorField } from "./MentorUI";
import { MentorSheet } from "./MentorMotion";
import { categoryLabel } from "./MentorBadges";
import { isValidUsername } from "@/lib/validate";
import { isEn, tr } from "@/lib/i18n";

/**
 * برگه‌ی «دعوت شاگرد» (از کاشی میان‌بر صفحه‌ی امروز): نام کاربری، حوزه‌ی همکاری و پیام.
 * همان قرارداد قبلی: POST /api/mentorships با studentUsername/categories/message.
 */
export function MentorTodayInviteSheet({
  open, onClose, suspended, categories, onSent,
}: { open: boolean; onClose: () => void; suspended: boolean; categories: string[]; onSent: () => void }) {
  const [cats, setCats] = useState<string[]>(categories);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [userErr, setUserErr] = useState<string | null>(null);
  const [catErr, setCatErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invite(e?: React.FormEvent) {
    e?.preventDefault();
    if (sending) return;
    setError(null);
    setSent(false);
    const u = username.trim().replace(/^@/, "");
    if (!u) { setUserErr(tr("نام کاربری شاگرد را وارد کن", "Enter the student's username")); return; }
    if (!isValidUsername(u)) { setUserErr(tr("نام کاربری درست نیست؛ فقط حرف انگلیسی، عدد و _ بنویس", "That username is not valid. Use only English letters, numbers and _.")); return; }
    if (categories.length > 0 && cats.length === 0) { setCatErr(tr("حداقل یک حوزه انتخاب کن", "Pick at least one field")); return; }
    setSending(true);
    const body: { studentUsername: string; message?: string; categories?: string[] } = { studentUsername: u };
    if (categories.length > 0) body.categories = cats;
    if (message.trim()) body.message = message.trim();
    const r = await mentorApi<unknown>("/api/mentorships", { method: "POST", body });
    setSending(false);
    if (!r.ok) { setError(r.error); return; }
    setUsername("");
    setMessage("");
    setSent(true);
    onSent();
    setTimeout(() => { setSent(false); onClose(); }, 1200);
  }

  return (
    <MentorSheet open={open} onClose={onClose} title={tr("دعوت شاگرد", "Invite a student")} size="md" dismissible={!sending}>
      {suspended ? (
        <MentorEmpty>{tr("تا وقتی حساب مربی‌گری‌ت بسته است، دعوت شاگرد تازه ممکن نیست", "You cannot invite new students while your mentor account is closed")}</MentorEmpty>
      ) : (
        <form onSubmit={invite} noValidate>
          <div className="mentor-form">
            <MentorField
              label={tr("نام کاربری", "Username")} htmlFor="md-invite-user" error={userErr}
              hint={tr("شاگرد تا قبول کردن دعوت، چیزی با تو به اشتراک نمی‌ذاره", "The student shares nothing with you until they accept the invite")}
            >
              <input
                id="md-invite-user" type="text" className="wsearch-newform-name trade-glass-field mono" dir="ltr"
                style={{ textAlign: isEn() ? "left" : "right" }} value={username} placeholder="ali_rezaei" autoComplete="off" maxLength={21}
                onChange={(e) => { setUsername(e.target.value); setUserErr(null); setError(null); setSent(false); }}
              />
            </MentorField>
            {categories.length > 1 && (
              <MentorField label={tr("حوزه‌ی همکاری", "Field of work")} error={catErr}>
                <div className="trade-choice-grid" role="group" aria-label={tr("حوزه‌ی همکاری", "Field of work")}>
                  {categories.map((c) => {
                    const on = cats.includes(c);
                    return (
                      <button
                        key={c} type="button" className={`trade-choice${on ? " active" : ""}`} aria-pressed={on}
                        onClick={() => { setCats((p) => (on ? p.filter((x) => x !== c) : [...p, c])); setCatErr(null); }}
                      >
                        {categoryLabel(c)}
                      </button>
                    );
                  })}
                </div>
              </MentorField>
            )}
            <MentorField label={tr("پیام", "Message")} htmlFor="md-invite-msg" optional>
              <textarea
                id="md-invite-msg" className="wsearch-newform-name trade-glass-field" rows={2} maxLength={500}
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder={tr("مثلا «برای برنامه‌ی تمرینی این فصل با هم کار کنیم»", "For example: \"Let's work on this season's training plan together\"")}
              />
            </MentorField>
          </div>
          {error && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="mentor-form-actions">
            <button type="button" className="account-outline-btn muted mentor-btn" onClick={onClose} disabled={sending}>{tr("بستن", "Close")}</button>
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={sending}>
              {sending ? <Spinner size={14} /> : sent ? <><Check size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("دعوت فرستاده شد", "Invite sent")}</> : <><Send size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> {tr("فرستادن دعوت", "Send invite")}</>}
            </button>
          </div>
        </form>
      )}
    </MentorSheet>
  );
}
