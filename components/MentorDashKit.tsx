"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { PanelSkeleton } from "./PanelSkeleton";
import { faNum } from "@/lib/jalali";

/**
 * تکه‌های مشترکِ صفحه‌های سمتِ منتور (/mentor/**): پوسته‌ی صفحه با گیتِ
 * ورود + فلگِ `mentors`، درخواستِ JSON با پیامِ خطای قابل‌نمایش، و حالت‌های
 * خطا/خالی. ظاهر عمدا از همون کلاس‌های موجودِ پنل کاربری/ترید ساخته شده
 * (account-shell، trade-back-link، acc-block، rp-empty) — هیچ سطح/بک‌گراندِ
 * جدیدی تعریف نمی‌شه.
 */

export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; error: string; status: number };

/** پیامِ خطای عمومی بر اساسِ کدِ وضعیت — وقتی سرور `error` نفرستاده باشه */
export function statusMessage(status: number): string {
  if (status === 0) return "ارتباط با سرور برقرار نشد — اتصال اینترنت رو بررسی کن";
  if (status === 401) return "نشستت منقضی شده — دوباره وارد شو";
  if (status === 403) return "اجازه‌ی این کار رو نداری";
  if (status === 404) return "پیدا نشد یا دسترسی نداری";
  if (status === 409) return "وضعیت تغییر کرده — صفحه رو تازه کن و دوباره امتحان کن";
  if (status === 413) return "حجم فایل حداکثر ۵ مگابایته";
  if (status === 415) return "فقط تصویر (JPG/PNG/WebP) یا PDF قابل قبوله";
  if (status === 429) return "تعداد درخواست‌ها زیاده — کمی بعد دوباره امتحان کن";
  if (status >= 500) return "خطای سرور — کمی بعد دوباره امتحان کن";
  return "انجام نشد — دوباره تلاش کن";
}

/** fetch با JSON و خطای یک‌دست؛ هیچ‌وقت throw نمی‌کنه */
export async function mentorApi<T>(url: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<ApiResult<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: init?.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
      signal: init?.signal,
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json && typeof json.error === "string" && json.error ? json.error : statusMessage(res.status);
      return { ok: false, error: msg, status: res.status };
    }
    return { ok: true, data: json as T, status: res.status };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { ok: false, error: "", status: -1 };
    return { ok: false, error: statusMessage(0), status: 0 };
  }
}

export const fa = (n: number | string | null | undefined) => faNum(n ?? 0);

export function formatBytes(n: number): string {
  if (n < 1024) return `${fa(n)} بایت`;
  if (n < 1024 * 1024) return `${fa(Math.round(n / 1024))} کیلوبایت`;
  return `${fa((n / (1024 * 1024)).toFixed(1))} مگابایت`;
}

/**
 * پوسته‌ی همه‌ی صفحه‌های /mentor: بازگشت + عنوان + گیت‌ها. تا وقتی نشست
 * در حالِ بارگذاریه اسکلت نشون داده می‌شه (نه پیامِ اشتباهِ «وارد شو»).
 */
export function MentorDashShell({
  title, hint, back, titleAction, children,
}: {
  title: string;
  hint?: string;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { status } = useSession();
  return (
    <section className="account-shell" dir="rtl">
      <div className="acc-head">
        {back && (
          <Link href={back.href} className="trade-back-link">
            <ChevronRight size={15} /> {back.label}
          </Link>
        )}
        <div className="trade-head-row">
          <h1>{title}</h1>
          {status === "authenticated" && titleAction}
        </div>
        {hint && <p className="acc-head-hint">{hint}</p>}
      </div>

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message="برای استفاده از بخش منتورها وارد شوید" />}
      {status === "authenticated" && (
        <FeatureGate feature="mentors">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </FeatureGate>
      )}
    </section>
  );
}

/** حالتِ خطای کلِ صفحه/بخش با دکمه‌ی «تلاش دوباره» */
export function MentorDashError({ message, onRetry, action }: { message: string; onRetry?: () => void; action?: React.ReactNode }) {
  return (
    <div className="trade-surface rp-empty" role="alert">
      <span className="rp-empty-icon" style={{ color: "#E05252", borderColor: "rgba(224,82,82,.35)" }}><AlertTriangle size={24} /></span>
      <p style={{ color: "var(--text)" }}>{message}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <button type="button" className="account-outline-btn" onClick={onRetry}>
            <RefreshCw size={14} /> تلاش دوباره
          </button>
        )}
        {action}
      </div>
    </div>
  );
}

/** پیامِ خالیِ داخلِ یک بخش (بدونِ قابِ اضافه) */
export function MentorDashEmpty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 py-3 text-center text-[12px] leading-7 text-dash-muted">{children}</p>;
}

/** نوارِ اطلاع‌رسانیِ داخلِ صفحه — فقط قابِ رنگی، بدونِ بک‌گراند */
export function MentorDashNotice({
  tone = "info", icon, title, children, action,
}: {
  tone?: "info" | "warn" | "danger" | "ok";
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const color = tone === "danger" ? "#E05252" : tone === "warn" ? "#e0a636" : tone === "ok" ? "var(--accent)" : "var(--secondary)";
  return (
    <div className="mb-3 flex items-start gap-3 rounded-[14px] border px-3.5 py-3" style={{ borderColor: color }} role={tone === "danger" ? "alert" : "status"}>
      {icon && <span className="mt-0.5 shrink-0" style={{ color }}>{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-bold" style={{ color }}>{title}</div>
        {children && <div className="mt-1 text-[11.5px] leading-6 text-dash-muted">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/** نوارِ پیشرفتِ باریک — همون `.rp-bar` رودمپ‌ها */
export function MentorDashBar({ rate }: { rate: number | null | undefined }) {
  const pct = Math.round(normRate(rate) * 100);
  return (
    <div className="rp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** نرخ ممکنه ۰..۱ یا ۰..۱۰۰ باشه — هر دو به ۰..۱ */
export function normRate(rate: number | null | undefined): number {
  const r = typeof rate === "number" && Number.isFinite(rate) ? rate : 0;
  return Math.min(1, Math.max(0, r > 1 ? r / 100 : r));
}

export function pct(rate: number | null | undefined): string {
  const v = Math.round(normRate(rate) * 100);
  return `${fa(v)}٪`;
}
