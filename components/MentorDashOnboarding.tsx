"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MI_STROKE } from "./MentorUI";
import { MentorHero } from "./MentorHero";

type StepState = "done" | "now" | "later";
const STATE_WORD: Record<StepState, string> = { done: "انجام شد", now: "الان", later: "بعدا" };

/**
 * /mentor برای کسی که هنوز پروفایل مربی‌گری نداره: سه قدم شماره‌دار بزرگ
 * (ساخت پروفایل، تایید هویت، نمایش در فهرست)، یک دکمه‌ی اصلی و چند نکته‌ی کوتاه.
 */
export function MentorDashOnboarding() {
  const steps: { n: number; title: string; text: string; state: StepState }[] = [
    { n: 1, title: "ساخت پروفایل", text: "حوزه، معرفی کوتاه و روش کارت رو بنویس", state: "now" },
    { n: 2, title: "تایید هویت", text: "مدرک شناسایی رو بفرست تا ادمین‌ها بررسی کنن", state: "later" },
    { n: 3, title: "نمایش در فهرست", text: "بعد از تایید، شاگردها پیدات می‌کنن و درخواست می‌دن", state: "later" },
  ];
  return (
    <div className="mv2-today">
      <MentorHero title="خوش اومدی" summary="با سه قدم کوتاه، مربی‌گری‌ت شروع می‌شه." />
      <ol className="mv2-today-steps">
        {steps.map((s) => (
          <li key={s.n} className={`mv2-today-step is-${s.state}`} aria-current={s.state === "now" ? "step" : undefined}>
            <span className="mv2-today-step-n" aria-hidden>{s.state === "done" ? <Check size={20} strokeWidth={MI_STROKE} /> : s.n}</span>
            <div className="mv2-today-step-body">
              <span className="mv2-today-step-state">{STATE_WORD[s.state]}</span>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mentor-form-actions">
        <Link href="/mentor/profile" className="trade-primary-btn mentor-btn">ساخت پروفایل</Link>
      </div>
      <ul className="mv2-today-notes">
        <li>آریون واسطه‌ی ارتباطه و مسئولیت محتوای برنامه‌ها با خود مربیه.</li>
        <li>هر شاگرد خودش تعیین می‌کنه چی رو ببینی.</li>
        <li>مدرک شناسایی فقط پیش تو و ادمین‌ها می‌مونه.</li>
      </ul>
    </div>
  );
}
