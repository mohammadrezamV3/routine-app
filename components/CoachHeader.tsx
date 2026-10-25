"use client";

import "./coach.css";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { SmartLink } from "./SmartLink";
import { tr } from "@/lib/i18n";

/**
 * سرتیتر صفحه‌ی مربی: عنوان (بدون زیرنویس)، لینک برگشت اختیاری، جای اکشن
 * انتهای ردیف و جای ناوبری دسکتاپ (nav: معمولا <CoachNav />).
 */
export function CoachHeader({ title, back, action, nav, leading }: { title: ReactNode; back?: { href: string; label?: string }; action?: ReactNode; nav?: ReactNode; leading?: ReactNode }) {
  return (
    <header className="ch-header">
      {back && (
        <SmartLink href={back.href} className="ch-back" aria-label={back.label ?? tr("برگشت", "Back")}>
          <ChevronRight size={20} strokeWidth={2} className="dir-flip" aria-hidden="true" />
        </SmartLink>
      )}
      {leading}
      <h1 className="ch-title">{title}</h1>
      {nav && <div className="ch-header-nav">{nav}</div>}
      {action && <div className="ch-header-action">{action}</div>}
    </header>
  );
}
