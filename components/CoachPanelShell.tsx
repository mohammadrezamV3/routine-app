"use client";

import "./coach.css";
import "./coach-pages.css";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { PageLoader } from "./PageLoader";
import { CoachHeader } from "./CoachHeader";
import { CoachNav, type CoachNavBadges } from "./CoachNav";
import { tr } from "@/lib/i18n";

/** true از 1024px به بالا (روی سرور و اولین رندر false تا هیدریشن یکی بمونه) */
export function useWideScreen(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width:1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

/**
 * قاب مشترک صفحه‌های مربی: گیت ورود، هاله، سرتیتر و ناوبری. CoachNav فقط یک بار
 * رندر می‌شه: موبایل ته صفحه (قرص شناور)، دسکتاپ (>=1024px) نوار کناری ثابت
 * (ناوبری عمودی) کنار ستون محتوا.
 */
export function CoachPanelShell({
  title, action, back, nav = true, badges, wide: wantWide, children,
}: {
  title: ReactNode;
  action?: ReactNode;
  back?: { href: string; label?: string };
  nav?: boolean;
  badges?: CoachNavBadges;
  /** عرض بیشتر روی دسکتاپ (صفحه‌ی امروز) */
  wide?: boolean;
  children: ReactNode;
}) {
  const { status } = useSession();
  const wide = useWideScreen();
  const navEl = nav ? <CoachNav badges={badges} /> : null;
  const side = wide && navEl;
  const header = <CoachHeader title={title} back={back} action={status === "authenticated" ? action : undefined} />;
  const body = (
    <>
      {header}
      {status === "loading" && <PageLoader />}
      {status === "unauthenticated" && <AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شوید", "Sign in to use the mentors area")} />}
      {status === "authenticated" && children}
    </>
  );
  return (
    <div className={`ch-page${wantWide || side ? " is-wide" : ""}${side ? " has-side" : ""}`}>
      <div className="ch-halo" aria-hidden="true" />
      {side ? (
        <>
          <aside className="ch-sidebar" aria-label={tr("بخش مربی", "Coach")}>
            <p className="ch-sidebar-title">{tr("مربی", "Coach")}</p>
            {navEl}
          </aside>
          <div className="ch-main">{body}</div>
        </>
      ) : (
        <>
          {body}
          {navEl}
        </>
      )}
    </div>
  );
}
