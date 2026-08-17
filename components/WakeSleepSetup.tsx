"use client";

import { useState } from "react";
import { DEFAULT_SLEEP, DEFAULT_WAKE, setWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

// اولین بار که کاربر بعد از ثبت‌نام میره توی برنامه هفتگی، این ازش پرسیده
// می‌شه؛ همون کامپوننت از پنل کاربری هم برای تغییر دوباره استفاده می‌شه.
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

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open" style={{ maxWidth: 380 }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">تنظیم اولیه</div>
            <div className="modal-title">کی بیدار می‌شی، کی می‌خوابی؟</div>
          </div>
          {onClose && <button className="nav-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">
          <div className="item-line" style={{ marginBottom: 16, color: "var(--muted)" }}>
            این دو ساعت پایه‌ی تایم‌لاین روزانه‌تو می‌سازن. هر وقت خواستی از پنل کاربری می‌تونی عوضش کنی.
          </div>

          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>ساعت بیداری هدف</label>
          <input
            type="time"
            className="wsearch-newform-name"
            value={wake}
            onChange={(e) => setWake(e.target.value)}
            style={{ direction: "ltr", textAlign: "center" }}
          />

          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", margin: "14px 0 6px" }}>ساعت خواب هدف</label>
          <input
            type="time"
            className="wsearch-newform-name"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            style={{ direction: "ltr", textAlign: "center" }}
          />

          <button className="auth-full-btn" onClick={save} disabled={saving} style={{ marginTop: 20 }}>
            {saving ? "در حال ذخیره…" : "ثبت و ادامه"}
          </button>
        </div>
      </div>
    </>
  );
}
