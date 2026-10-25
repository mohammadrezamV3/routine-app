"use client";

import "./coach.css";
import { usePathname } from "next/navigation";
import { CalendarCheck, UserRound, Users } from "lucide-react";
import { SmartLink } from "./SmartLink";
import { tr } from "@/lib/i18n";

export type CoachNavBadges = { today?: number; students?: number; settings?: number };

/**
 * ناوبری مربی: موبایل قرص شناور پایین صفحه، دسکتاپ (>=1024px) ردیف درون‌خطی
 * (قرارش با خود صفحه: داخل CoachHeader یا بالای ستون). اولویت تشخیص فعال از pathname.
 */
export function CoachNav({ badges, className }: { badges?: CoachNavBadges; className?: string }) {
  const path = usePathname() || "";
  const items = [
    { key: "today", href: "/mentor", label: tr("امروز", "Today"), Icon: CalendarCheck, active: path === "/mentor", badge: badges?.today },
    { key: "students", href: "/mentor/students", label: tr("شاگردها", "Students"), Icon: Users, active: path.startsWith("/mentor/students") || path.startsWith("/mentor/programs"), badge: badges?.students },
    { key: "settings", href: "/mentor/settings", label: tr("صفحه‌ی من", "My page"), Icon: UserRound, active: path.startsWith("/mentor/settings") || path.startsWith("/mentor/profile"), badge: badges?.settings },
  ];
  return (
    <nav className={`ch-nav${className ? ` ${className}` : ""}`} aria-label={tr("بخش مربی", "Coach")}>
      {items.map(({ key, href, label, Icon, active, badge }) => (
        <SmartLink key={key} href={href} className={`ch-nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
          <span className="ch-nav-ico">
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
            {badge ? <span className="ch-nav-badge" aria-label={String(badge)}>{badge > 9 ? "9+" : badge}</span> : null}
          </span>
          <span className="ch-nav-label">{label}</span>
        </SmartLink>
      ))}
    </nav>
  );
}
