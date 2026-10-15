"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { DEFAULT_SLEEP, DEFAULT_WAKE, setWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { TimeInput } from "./TimeInput";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

type Step = "intro" | "form";

// اولین بار که کاربر بعد از ثبت‌نام میره توی برنامه هفتگی، این ازش پرسیده
// می‌شه؛ همون کامپوننت از پنل کاربری هم برای تغییر دوباره استفاده می‌شه —
// وقتی initial پر باشه (یعنی ویرایش دوباره‌ست، نه اولین‌بار)، مرحله‌ی
// راهنما رد می‌شه و مستقیم فرم نشون داده می‌شه.
export function WakeSleepSetup({
  initial,
  onDone,
  onClose,
}: {
  initial?: WakeSleepTimes | null;
  onDone: (v: WakeSleepTimes) => void;
  onClose?: () => void;
}) {
  useLockBodyScroll();
  const [step, setStep] = useState<Step>(initial ? "form" : "intro");
  const [wake, setWake] = useState(initial?.wake || DEFAULT_WAKE);
  const [sleep, setSleep] = useState(initial?.sleep || DEFAULT_SLEEP);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const v = { wake, sleep };
    await setWakeSleepTimes(v);
    setSaving(false);
    onDone(v);
  }

  if (step === "intro") {
    return (
      <>
        <div className="modal-overlay open" onClick={onClose} />
        <div className="modal-panel dash-scope open" style={{ maxWidth: 380 }}>
          <div className="modal-head">
            <div className="modal-title">{tr("خوش اومدی 👋", "Welcome 👋")}</div>
            {onClose && <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>}
          </div>
          <div className="modal-body">
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-dash-green"
                style={{ background: "rgba(var(--accent-rgb),.14)" }}
              >
                <Clock size={26} />
              </span>
              <div className="text-[14px] font-bold text-dash-text sm:text-[15px]">{tr("قبل از هر چیز، یه چیز کوچیک ازت می‌پرسیم", "First, one small question")}</div>
              <div className="text-[11.5px] leading-relaxed text-dash-muted sm:text-[12.5px]">
                {tr("ساعت بیداری و خوابت پایه‌ی تایم‌لاین روزانه‌ته — باهاش برنامه‌های هر روزت رو روی یه خط زمانی می‌چینیم. هر وقت خواستی از پنل کاربری می‌تونی عوضش کنی.", "Your wake and sleep times are the base of your daily timeline — we use them to lay out each day's plans on one timeline. You can change them anytime from your account panel.")}
              </div>
            </div>
            <button className="auth-full-btn" onClick={() => setStep("form")} style={{ marginTop: 8 }}>
              {tr("بریم", "Let's go")}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel dash-scope open" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">{tr("تنظیم اولیه", "Initial setup")}</div>
            <div className="modal-title">{tr("کی بیدار می‌شی، کی می‌خوابی؟", "When do you wake up and go to sleep?")}</div>
          </div>
          {onClose && <button className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>}
        </div>
        <div className="modal-body">
          <div className="item-line" style={{ marginBottom: 16, color: "var(--muted)" }}>
            {tr("این دو ساعت پایه‌ی تایم‌لاین روزانه‌تو می‌سازن. هر وقت خواستی از پنل کاربری می‌تونی عوضش کنی.", "These two times form the base of your daily timeline. You can change them anytime from your account panel.")}
          </div>

          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{tr("ساعت بیداری هدف", "Target wake-up time")}</label>
          <TimeInput value={wake} onChange={setWake} className="wsearch-newform-name" />

          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", margin: "14px 0 6px" }}>{tr("ساعت خواب هدف", "Target bedtime")}</label>
          <TimeInput value={sleep} onChange={setSleep} className="wsearch-newform-name" />

          <button className="auth-full-btn" onClick={save} disabled={saving} style={{ marginTop: 20 }}>
            {saving ? <Spinner size={15} /> : tr("ثبت و ادامه", "Save and continue")}
          </button>
        </div>
      </div>
    </>
  );
}
