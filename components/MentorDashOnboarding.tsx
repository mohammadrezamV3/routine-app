"use client";

import Link from "next/link";
import { AlertCircle, BadgeCheck, ClipboardList, ShieldCheck, UserRound } from "lucide-react";
import { MI, MI_STROKE, MentorEmptyState, MentorRow, MentorSection } from "./MentorUI";

/**
 * /mentor برای کاربری که هنوز پروفایل منتوری ندارد: یک حالت خالیِ کل صفحه
 * با یک اقدام (ساخت پروفایل) و سه نکته‌ی لازم پیش از شروع.
 * نکته‌ی اصلی: آریون واسطه است و مسئولیت محتوای برنامه با منتور است.
 */
export function MentorDashOnboarding() {
  return (
    <>
      <MentorEmptyState
        icon={<UserRound size={MI.empty} strokeWidth={MI_STROKE} aria-hidden />}
        title="هنوز پروفایل منتوری نداری"
        text="پس از ساخت و انتشار پروفایل، شاگردها می‌توانند درخواست بدهند و تو برایشان برنامه می‌فرستی"
        action={
          <Link href="/mentor/profile" className="trade-primary-btn mentor-btn">
            ساخت پروفایل
          </Link>
        }
      />

      <div style={{ marginTop: "var(--m-4)" }}>
        <MentorSection title="پیش از شروع" icon={<AlertCircle size={MI.section} strokeWidth={MI_STROKE} aria-hidden />} flush>
          <MentorRow
            lead={<ClipboardList size={MI.row} strokeWidth={MI_STROKE} aria-hidden />}
            title="مسئولیت برنامه‌ها"
            sub={<span>آریون واسطه‌ی ارتباط است و مسئولیت محتوای برنامه با منتور است</span>}
          />
          <MentorRow
            lead={<ShieldCheck size={MI.row} strokeWidth={MI_STROKE} aria-hidden />}
            title="حریم خصوصی شاگرد"
            sub={<span>هر شاگرد تعیین می‌کند چه بخشی از برنامه و پیشرفتش را ببینی</span>}
          />
          <MentorRow
            lead={<BadgeCheck size={MI.row} strokeWidth={MI_STROKE} aria-hidden />}
            title="احراز هویت و مدارک (اختیاری)"
            sub={<span>پس از تأیید، نشان «هویت تأییدشده» روی پروفایلت نمایش داده می‌شود</span>}
          />
        </MentorSection>
      </div>
    </>
  );
}
