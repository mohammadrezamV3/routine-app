"use client";

import { Check, EyeOff, ShieldCheck } from "lucide-react";
import { AccountBlock } from "./AccountUI";
import { fa } from "./MentorDashKit";
import type { StudentPrivacySummary, StudentView } from "./MentorStudentTypes";

/**
 * «چه چیزهایی رو می‌بینی» — خلاصه‌ی تنظیماتِ حریم خصوصیِ شاگرد برای همین
 * رابطه. بخش‌های مخفی صریحا گفته می‌شن تا منتور خالی‌بودن رو با «کاری
 * نکرده» اشتباه نگیره.
 */
export function MentorStudentPrivacy({
  privacy: p, modules, scheduleHidden,
}: { privacy: StudentPrivacySummary; modules: StudentView["modules"]; scheduleHidden: boolean }) {
  const programs = p.shareAllPrograms
    ? { on: true, text: "همه‌ی برنامه‌های روتین به اشتراک گذاشته شده" }
    : p.sharedCount > 0
      ? { on: true, text: `${fa(p.sharedCount)} برنامه‌ی انتخابی به اشتراک گذاشته شده` }
      : { on: false, text: "هیچ برنامه‌ای به اشتراک گذاشته نشده" };

  const lines: { on: boolean; text: string }[] = [
    programs,
    scheduleHidden || !p.showSchedule
      ? { on: false, text: "برنامه زمانی مخفی است" }
      : { on: true, text: "برنامه زمانی قابل مشاهده است" },
    { on: p.showProgramName, text: p.showProgramName ? "نام برنامه‌ها دیده می‌شه" : "نام برنامه‌ها مخفی است" },
    { on: p.showTaskName, text: p.showTaskName ? "عنوان کارها دیده می‌شه" : "عنوان کارها مخفی است (به‌جاش «مشغول»)" },
    { on: p.showTaskDetails, text: p.showTaskDetails ? "جزئیات کارها دیده می‌شه" : "جزئیات کارها مخفی است" },
    { on: p.showProgress, text: p.showProgress ? "انجام‌شدن/نشدن کارها دیده می‌شه" : "پیشرفت روزانه مخفی است" },
    { on: modules.exercise !== null, text: modules.exercise !== null ? "خلاصه‌ی بدنسازی دیده می‌شه" : "بدنسازی مخفی است" },
    { on: modules.calorie !== null, text: modules.calorie !== null ? "خلاصه‌ی کالری دیده می‌شه" : "کالری‌شمار مخفی است" },
  ];

  return (
    <AccountBlock
      title="چه چیزهایی رو می‌بینی"
      icon={<ShieldCheck size={15} />}
      desc="این تنظیمات دست خودِ شاگرده و هر وقت بخواد عوضش می‌کنه. برنامه‌هایی که خودت فرستادی همیشه برات قابل مشاهده‌ان."
      index={0}
    >
      <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2 p-0 sm:grid-cols-2">
        {lines.map((l) => (
          <li key={l.text} className="flex items-start gap-2 text-[12px] leading-6" style={{ color: l.on ? "var(--text)" : "var(--muted)" }}>
            <span className="mt-1 shrink-0" style={{ color: l.on ? "var(--accent)" : "var(--muted)" }}>
              {l.on ? <Check size={14} /> : <EyeOff size={14} />}
            </span>
            {l.text}
          </li>
        ))}
      </ul>
    </AccountBlock>
  );
}
