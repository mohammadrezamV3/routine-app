"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { Spinner } from "./Spinner";
import { mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorEmpty, MentorField } from "./MentorUI";
import { MentorSheet } from "./MentorMotion";
import { categoryLabel } from "./MentorBadges";
import { isValidUsername } from "@/lib/validate";

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
    if (!u) { setUserErr("نام کاربری شاگرد را وارد کن"); return; }
    if (!isValidUsername(u)) { setUserErr("نام کاربری درست نیست؛ فقط حرف انگلیسی، عدد و _ بنویس"); return; }
    if (categories.length > 0 && cats.length === 0) { setCatErr("حداقل یک حوزه انتخاب کن"); return; }
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
    <MentorSheet open={open} onClose={onClose} title="دعوت شاگرد" size="md" dismissible={!sending}>
      {suspended ? (
        <MentorEmpty>تا وقتی حساب مربی‌گری‌ت بسته است، دعوت شاگرد تازه ممکن نیست</MentorEmpty>
      ) : (
        <form onSubmit={invite} noValidate>
          <div className="mentor-form">
            <MentorField
              label="نام کاربری" htmlFor="md-invite-user" error={userErr}
              hint="شاگرد تا قبول کردن دعوت، چیزی با تو به اشتراک نمی‌ذاره"
            >
              <input
                id="md-invite-user" type="text" className="wsearch-newform-name trade-glass-field mono" dir="ltr"
                style={{ textAlign: "right" }} value={username} placeholder="ali_rezaei" autoComplete="off" maxLength={21}
                onChange={(e) => { setUsername(e.target.value); setUserErr(null); setError(null); setSent(false); }}
              />
            </MentorField>
            {categories.length > 1 && (
              <MentorField label="حوزه‌ی همکاری" error={catErr}>
                <div className="trade-choice-grid" role="group" aria-label="حوزه‌ی همکاری">
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
            <MentorField label="پیام" htmlFor="md-invite-msg" optional>
              <textarea
                id="md-invite-msg" className="wsearch-newform-name trade-glass-field" rows={2} maxLength={500}
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="مثلا «برای برنامه‌ی تمرینی این فصل با هم کار کنیم»"
              />
            </MentorField>
          </div>
          {error && <div className="form-inline-error" role="alert">{error}</div>}
          <div className="mentor-form-actions">
            <button type="button" className="account-outline-btn muted mentor-btn" onClick={onClose} disabled={sending}>بستن</button>
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={sending}>
              {sending ? <Spinner size={14} /> : sent ? <><Check size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> دعوت فرستاده شد</> : <><Send size={MI.btn} strokeWidth={MI_STROKE} aria-hidden /> فرستادن دعوت</>}
            </button>
          </div>
        </form>
      )}
    </MentorSheet>
  );
}
