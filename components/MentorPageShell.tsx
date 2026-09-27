"use client";

import "./mentor.css";
import Link from "next/link";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { PanelSkeleton } from "./PanelSkeleton";

/**
 * سرصفحه‌ی مشترک همه‌ی صفحه‌های منتور — همان مارک‌آپ TradePageShell:
 * لینک بازگشت، زیرش ردیفِ عنوان با اکشنِ عنوان در انتهای ردیف (سمت چپ)،
 * و یک خط توضیح اختیاری. MentorDashShell هم از همین استفاده می‌کند.
 */
export function MentorPageHead({
  title, hint, back, titleAction, head,
}: {
  title?: string;
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
      {hint && <p className="section-note">{hint}</p>}
    </div>
  );
}

/**
 * پوسته‌ی صفحه‌های سمت شاگرد (/mentors، /mentorship، /mentor-programs).
 * تا وقتی نشست در حال بارگذاری است اسکلت نشان داده می‌شود (نه پیام اشتباهِ
 * «وارد شوید»)، بعد گیتِ قابلیت `mentors`. محتوا بدون انیمیشن ورود رندر
 * می‌شود. enforcement واقعی سمت سرور است (requireMentorsUser).
 */
export function MentorPageShell({
  title,
  hint,
  back,
  titleAction,
  head,
  children,
}: {
  title?: string;
  /** یک خط توضیح زیر عنوان */
  hint?: string;
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
        hint={hint}
        back={back}
        head={head}
        titleAction={status === "authenticated" ? titleAction : undefined}
      />

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message="برای استفاده از بخش منتورها وارد شوید" />}
      {status === "authenticated" && <FeatureGate feature="mentors">{children}</FeatureGate>}
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
  return (
    <div className="trade-surface mentor-error" role="alert">
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
