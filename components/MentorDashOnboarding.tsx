"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { MI_STROKE } from "./MentorUI";
import { MentorHero } from "./MentorHero";
import { tr } from "@/lib/i18n";
import { brandName } from "@/lib/brand";

type StepState = "done" | "now" | "later";
const stateWord = (): Record<StepState, string> => ({ done: tr("انجام شد", "Done"), now: tr("الان", "Now"), later: tr("بعدا", "Later") });

/**
 * /mentor برای کسی که هنوز پروفایل مربی‌گری نداره: سه قدم شماره‌دار بزرگ
 * (ساخت پروفایل، تایید هویت، نمایش در فهرست)، یک دکمه‌ی اصلی و چند نکته‌ی کوتاه.
 */
export function MentorDashOnboarding() {
  const steps: { n: number; title: string; text: string; state: StepState }[] = [
    { n: 1, title: tr("ساخت پروفایل", "Create your profile"), text: tr("حوزه، معرفی کوتاه و روش کارت رو بنویس", "Write your field, a short intro and how you work"), state: "now" },
    { n: 2, title: tr("تایید هویت", "Verify your identity"), text: tr("مدرک شناسایی رو بفرست تا ادمین‌ها بررسی کنن", "Send an ID document so the admins can review it"), state: "later" },
    { n: 3, title: tr("نمایش در فهرست", "Show in the listing"), text: tr("بعد از تایید، شاگردها پیدات می‌کنن و درخواست می‌دن", "Once verified, students can find you and send requests"), state: "later" },
  ];
  return (
    <div className="mv2-today">
      <MentorHero title={tr("خوش اومدی", "Welcome")} summary={tr("با سه قدم کوتاه، مربی‌گری‌ت شروع می‌شه.", "Three short steps and you are ready to mentor.")} />
      <ol className="mv2-today-steps">
        {steps.map((s) => (
          <li key={s.n} className={`mv2-today-step is-${s.state}`} aria-current={s.state === "now" ? "step" : undefined}>
            <span className="mv2-today-step-n" aria-hidden>{s.state === "done" ? <Check size={20} strokeWidth={MI_STROKE} /> : s.n}</span>
            <div className="mv2-today-step-body">
              <span className="mv2-today-step-state">{stateWord()[s.state]}</span>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mentor-form-actions">
        <Link href="/mentor/profile" className="trade-primary-btn mentor-btn">{tr("ساخت پروفایل", "Create profile")}</Link>
      </div>
      <ul className="mv2-today-notes">
        <li>{tr("آریون واسطه‌ی ارتباطه و مسئولیت محتوای برنامه‌ها با خود مربیه.", `${brandName()} only connects you with students. Mentors are responsible for the content of their programs.`)}</li>
        <li>{tr("هر شاگرد خودش تعیین می‌کنه چی رو ببینی.", "Each student decides what you can see.")}</li>
        <li>{tr("مدرک شناسایی فقط پیش تو و ادمین‌ها می‌مونه.", "Your ID document stays between you and the admins.")}</li>
      </ul>
    </div>
  );
}
