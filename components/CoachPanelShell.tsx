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
 * رندر می‌شه: موبایل ته صفحه (قرص شناور)، دسکتاپ داخل سرتیتر.
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
  return (
    <div className={`ch-page${wantWide ? " is-wide" : ""}`}>
      <div className="ch-halo" aria-hidden="true" />
      <CoachHeader title={title} back={back} action={status === "authenticated" ? action : undefined} nav={wide ? navEl : undefined} />
      {status === "loading" && <PageLoader />}
      {status === "unauthenticated" && <AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شوید", "Sign in to use the mentors area")} />}
      {status === "authenticated" && children}
      {!wide && navEl}
    </div>
  );
}
