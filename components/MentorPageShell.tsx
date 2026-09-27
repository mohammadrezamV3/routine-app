"use client";

import "./mentor.css";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { PanelSkeleton } from "./PanelSkeleton";

/**
 * پوسته‌ی مشترکِ صفحه‌های منتور — عینا الگوی TradePageShell (لینکِ بازگشت،
 * عنوان، اسکلت در حالتِ loading به‌جای پیامِ اشتباهِ «وارد شوید»، ورودِ
 * نرم)، فقط به‌جای گیتِ ماژولِ ترید، گیتِ قابلیتِ `mentors` از پنل ادمین.
 * enforcement واقعی سمت سروره (requireMentorsUser)؛ این فقط UI است.
 */
export function MentorPageShell({
  title,
  back,
  titleAction,
  head,
  children,
}: {
  title?: string;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  /** سرصفحه‌ی سفارشی (مثلا آواتار + نام) به‌جای عنوانِ ساده */
  head?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { status } = useSession();

  return (
    <section className="roadmaps-desktop mentor-page">
      <div className="trade-head-block">
        {back && (
          <Link href={back.href} prefetch className="trade-back-link">
            <ChevronRight size={15} /> {back.label}
          </Link>
        )}
        {head ?? (
          title && (
            <div className={titleAction ? "trade-head-row" : undefined}>
              <h1>{title}</h1>
              {titleAction}
            </div>
          )
        )}
      </div>

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message="برای استفاده از بخش منتورها وارد شوید" />}
      {status === "authenticated" && (
        <FeatureGate feature="mentors">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </FeatureGate>
      )}
    </section>
  );
}

/** بلوکِ خطا با «تلاش دوباره» — برای شکستِ شبکه/۵۰۰؛ ۴۰۳/۴۰۴ پیامِ دوستانه می‌گیرند */
export function MentorErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="trade-surface mentor-error" role="alert">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7.2v6.2M12 16.4v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="account-outline-btn" onClick={onRetry}>
          تلاش دوباره
        </button>
      )}
    </div>
  );
}
