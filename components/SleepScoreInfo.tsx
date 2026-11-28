"use client";

import "./sleep-sheet.css";
import "./sleep-detail.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useSheetFocus } from "@/lib/useSheetFocus";
import { faNum } from "@/lib/jalali";
import { isEn, tr } from "@/lib/i18n";
import { SCORE_WEIGHTS, type SleepScoreParts } from "@/lib/sleep";

// توضیح «امتیاز خواب چطور حساب می‌شه؟»: هر بخش با پایه‌ی علمیش. اگه parts بدیم
// امتیاز هر بخش همون شب هم کنار توضیح نشون داده می‌شه.

type Row = { key: keyof SleepScoreParts; title: string; basis: string };

function rows(): Row[] {
  return [
    {
      key: "duration",
      title: tr("مدت خواب", "Duration"),
      basis: tr(
        "بزرگسال 7 تا 9 ساعت (توصیه‌ی AASM/SRS و بنیاد ملی خواب آمریکا). 6 تا 7 و 9 تا 10 ساعت افت کم، زیر 6 یا بالای 10 ساعت افت بیشتر.",
        "Adults 7 to 9 hours (AASM/SRS and National Sleep Foundation guidance). 6-7 and 9-10 hours lose a little, under 6 or over 10 hours lose more.",
      ),
    },
    {
      key: "continuity",
      title: tr("پیوستگی خواب", "Sleep continuity"),
      basis: tr(
        "به خواب رفتن تا 30 دقیقه و حداکثر یک بار بیدارشدن وسط شب (شاخص‌های کیفیت خواب NSF و مولفه‌های PSQI).",
        "Falling asleep within 30 minutes and at most one awakening (NSF sleep quality indicators and PSQI components).",
      ),
    },
    {
      key: "timing",
      title: tr("نظم ساعت خواب", "Bedtime regularity"),
      basis: tr(
        "فاصله‌ی ساعت خواب از ساعت خواب هدف خودت؛ تا 30 دقیقه کامل. نامنظمی ساعت خواب با پیامدهای سلامتی مرتبطه.",
        "How far your bedtime is from your own target; within 30 minutes is full marks. Irregular bedtimes are linked to poorer health outcomes.",
      ),
    },
    {
      key: "quality",
      title: tr("کیفیت از نظر خودت", "Your own rating"),
      basis: tr(
        "خودارزیابی 1 تا 5 (مولفه‌ی کیفیت ذهنی در پرسشنامه‌ی PSQI).",
        "Your 1 to 5 self-rating (the subjective quality component of the PSQI questionnaire).",
      ),
    },
  ];
}

export function SleepScoreInfoButton({ parts, className }: { parts?: SleepScoreParts | null; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost btn-icon btn-sm sli-btn${className ? ` ${className}` : ""}`}
        onClick={() => setOpen(true)}
        aria-label={tr("امتیاز چطور حساب می‌شه؟", "How is the score calculated?")}
        aria-haspopup="dialog"
      >
        <Info aria-hidden width={17} height={17} />
      </button>
      {open && typeof document !== "undefined" && createPortal(<Body parts={parts ?? null} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function Body({ parts, onClose }: { parts: SleepScoreParts | null; onClose: () => void }) {
  useLockBodyScroll();
  const panelRef = useRef<HTMLDivElement>(null);
  useSheetFocus(panelRef);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  const list = rows();
  return (
    <>
      <div className="modal-overlay open sli-overlay sleep-ov" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="modal-panel liquid-glass-panel open sleep-scope slg-panel sli-panel" role="dialog" aria-modal="true" aria-label={tr("امتیاز خواب چطور حساب می‌شه؟", "How the sleep score works")} dir={isEn() ? "ltr" : "rtl"}>
        <div className="modal-head">
          <div className="modal-title">{tr("امتیاز خواب چطور حساب می‌شه؟", "How the sleep score works")}</div>
          <button type="button" className="nav-close" onClick={onClose} aria-label={tr("بستن", "Close")}>×</button>
        </div>
        <div className="slg-body sli-body">
          <p className="sli-lead">
            {tr(
              "امتیاز از 0 تا 100 و ترکیبی از چهار بخش بر پایه‌ی توصیه‌های علمی خواب بزرگسالانه. بخشی که داده‌اش رو ثبت نکردی حذف می‌شه و بقیه دوباره تقسیم می‌شن.",
              "The score runs 0 to 100 and combines four parts based on adult sleep guidance. A part you did not log is left out and the rest are re-weighted.",
            )}
          </p>
          <ul className="sli-list">
            {list.map((r) => {
              const v = parts ? parts[r.key] : null;
              return (
                <li key={r.key}>
                  <div className="sli-row-head">
                    <b>{r.title}</b>
                    <span className="sli-weight">{tr(`وزن ${faNum(SCORE_WEIGHTS[r.key])}%`, `Weight ${SCORE_WEIGHTS[r.key]}%`)}</span>
                    {parts && <span className="sli-val">{v == null ? tr("ثبت نشده", "Not logged") : faNum(v)}</span>}
                  </div>
                  <p>{r.basis}</p>
                </li>
              );
            })}
          </ul>
          <p className="sli-note">
            {tr(
              "این یک شاخص راهنماست و ابزار تشخیص پزشکی نیست؛ وزن‌های ترکیب تقریب خود برنامه‌ست. اگه مشکل خواب مداوم داری با پزشک مشورت کن.",
              "This is a guide, not a medical diagnosis; the combination weights are the app's own approximation. If you have persistent sleep problems, talk to a doctor.",
            )}
          </p>
        </div>
        <div className="slg-foot">
          <div className="slg-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>{tr("فهمیدم", "Got it")}</button>
          </div>
        </div>
      </div>
    </>
  );
}
