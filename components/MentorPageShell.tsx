"use client";

import "./mentor.css";
import Link from "next/link";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { PanelSkeleton } from "./PanelSkeleton";
import { MentorPage, useMentorFlat } from "./MentorUI";

/**
 * سرصفحه‌ی مشترک همه‌ی صفحه‌های منتور — همان مارک‌آپ TradePageShell:
 * لینک بازگشت، زیرش ردیفِ عنوان با اکشنِ عنوان در انتهای ردیف (سمت چپ)،
 * MentorDashShell هم از همین استفاده می‌کند. زیرعنوان (`hint`) دیگر رندر
 * نمی‌شود (قانونِ دورِ ۳: بدونِ زیرعنوان زیرِ عنوانِ صفحه).
 */
export function MentorPageHead({
  title, back, titleAction, head,
}: {
  title?: string;
  /** @deprecated نادیده گرفته می‌شود */
  hint?: string;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  head?: React.ReactNode;
}) {
  return (
    <div className="trade-head-block">
      {back && (
        <Link href={back.href} prefetch className="trade-back-link">
          <ChevronRight size={15} /> {back.label}
        </Link>
      )}
      {head ?? (
        title && (
          <div className="trade-head-row">
            <h1>{title}</h1>
            {titleAction}
          </div>
        )
      )}
    </div>
  );
}

/**
 * پوسته‌ی صفحه‌های سمت شاگرد (/mentors، /mentorship، /mentor-programs).
 * تا وقتی نشست در حال بارگذاری است اسکلت نشان داده می‌شود (نه پیام اشتباهِ
 * «وارد شوید»)، بعد گیتِ قابلیت `mentors`. ورودِ صفحه را template.tsx
 * (MentorRouteTransition) می‌دهد. `surface` کلِ محتوا را در یک ظرف (MentorPage)
 * می‌گذارد. enforcement واقعی سمت سرور است (requireMentorsUser).
 */
export function MentorPageShell({
  title,
  back,
  titleAction,
  head,
  surface = false,
  children,
}: {
  title?: string;
  /** @deprecated زیرعنوانِ صفحه حذف شد؛ نادیده گرفته می‌شود */
  hint?: string;
  /** کلِ محتوا داخلِ یک ظرفِ واحد (بخش‌ها تخت می‌شوند) */
  surface?: boolean;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  /** سرصفحه‌ی سفارشی (مثلا آواتار + نام) به‌جای عنوان ساده */
  head?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { status } = useSession();

  return (
    <section className="roadmaps-desktop mentor-page">
      <MentorPageHead
        title={title}
        back={back}
        head={head}
        titleAction={status === "authenticated" ? titleAction : undefined}
      />

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message="برای استفاده از بخش مربی‌ها وارد شوید" />}
      {status === "authenticated" && (
        <FeatureGate feature="mentors">{surface ? <MentorPage>{children}</MentorPage> : children}</FeatureGate>
      )}
    </section>
  );
}

/**
 * خطای کل صفحه یا یک بخش (شبکه/۵۰۰) با «تلاش دوباره». ۴۰۳/۴۰۴ هم همین را
 * با پیام مشخص نشان می‌دهند، نه صفحه‌ی خالی.
 */
export function MentorErrorState({
  message, onRetry, action,
}: {
  message: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}) {
  const flat = useMentorFlat();
  return (
    <div className={flat ? "mentor-error" : "trade-surface mentor-error"} role="alert">
      <AlertTriangle size={24} strokeWidth={1.75} aria-hidden />
      <p>{message}</p>
      {(onRetry || action) && (
        <div className="mentor-btn-group">
          {onRetry && (
            <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={onRetry}>
              <RefreshCw size={14} strokeWidth={1.75} /> تلاش دوباره
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
