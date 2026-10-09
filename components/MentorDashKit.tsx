"use client";

import "./mentor.css";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { PanelSkeleton } from "./PanelSkeleton";
import { MentorErrorState, MentorPageHead } from "./MentorPageShell";
import { MentorEmpty, MentorNotice, MentorPage } from "./MentorUI";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

/**
 * تکه‌های مشترک صفحه‌های سمت منتور (/mentor/**): پوسته با گیت ورود + فلگ
 * `mentors`، درخواست JSON با پیام خطای قابل‌نمایش، و حالت‌های خطا/خالی.
 * سرصفحه، خطا و اطلاعیه همان پایه‌های MentorPageShell/MentorUI هستند تا
 * سمت منتور و سمت شاگرد یک‌شکل باشند. بدون بک‌گراند تازه؛ حرکت از MentorMotion.
 */

export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; error: string; status: number };

/** پیام خطای عمومی بر اساس کد وضعیت — وقتی سرور `error` نفرستاده باشه */
export function statusMessage(status: number): string {
  if (status === 0) return tr("ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کن", "Could not reach the server. Check your internet connection.");
  if (status === 401) return tr("نشستت تمام شده است؛ دوباره وارد شو", "Your session has ended. Sign in again.");
  if (status === 403) return tr("اجازه‌ی این کار را نداری", "You are not allowed to do this");
  if (status === 404) return tr("پیدا نشد یا به آن دسترسی نداری", "Not found, or you do not have access to it");
  if (status === 409) return tr("وضعیت تغییر کرده است؛ صفحه را تازه کن", "Things have changed. Refresh the page.");
  if (status === 413) return tr("حجم فایل حداکثر 5 مگابایت است", "The file can be at most 5 MB");
  if (status === 415) return tr("فقط تصویر (JPG، PNG، WebP) یا PDF پذیرفته می‌شود", "Only images (JPG, PNG, WebP) or PDF files are accepted");
  if (status === 429) return tr("تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد دوباره تلاش کن", "Too many requests. Try again in a few minutes.");
  if (status >= 500) return tr("خطای سرور؛ چند دقیقه بعد دوباره تلاش کن", "Server error. Try again in a few minutes.");
  return tr("انجام نشد؛ دوباره تلاش کن", "Something went wrong. Try again.");
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
  if (n < 1024) return tr(`${fa(n)} بایت`, `${fa(n)} B`);
  if (n < 1024 * 1024) return tr(`${fa(Math.round(n / 1024))} کیلوبایت`, `${fa(Math.round(n / 1024))} KB`);
  return tr(`${fa((n / (1024 * 1024)).toFixed(1))} مگابایت`, `${fa((n / (1024 * 1024)).toFixed(1))} MB`);
}

/**
 * پوسته‌ی همه‌ی صفحه‌های /mentor: بازگشت + عنوان + گیت‌ها. ظرف عرض
 * (account-shell، که فرم‌های AuthField ظاهرشان را از آن می‌گیرند) و نوار
 * ناوبری پنل در app/mentor/layout.tsx هستند. تا وقتی نشست در حال بارگذاری
 * است اسکلت نشان داده می‌شود (نه پیام اشتباه «وارد شوید»).
 * محتوا داخل یک ظرف واحد (MentorPage) می‌نشیند؛ `surface={false}` برای
 * صفحه‌ای که خودش چند ظرف لازم دارد. `hint` دیگر رندر نمی‌شود.
 */
export function MentorDashShell({
  title, back, titleAction, surface = true, children,
}: {
  title: string;
  /** @deprecated زیرعنوان صفحه حذف شد؛ نادیده گرفته می‌شود */
  hint?: string;
  back?: { href: string; label: string } | null;
  titleAction?: React.ReactNode;
  surface?: boolean;
  children: React.ReactNode;
}) {
  const { status } = useSession();
  return (
    <div className="mentor-panel-page">
      <MentorPageHead
        title={title}
        back={back}
        titleAction={status === "authenticated" ? titleAction : undefined}
      />

      {status === "loading" && <PanelSkeleton />}
      {status === "unauthenticated" && <AuthGate message={tr("برای استفاده از بخش مربی‌ها وارد شوید", "Sign in to use the mentors area")} />}
      {status === "authenticated" && (
        <FeatureGate feature="mentors">
          {surface ? <MentorPage>{children}</MentorPage> : children}
        </FeatureGate>
      )}
    </div>
  );
}

/** خطای کل صفحه/بخش با «تلاش دوباره» — همان MentorErrorState */
export function MentorDashError({ message, onRetry, action }: { message: string; onRetry?: () => void; action?: React.ReactNode }) {
  return <MentorErrorState message={message} onRetry={onRetry} action={action} />;
}

/** پیام خالی داخل یک بخش (بدون قاب اضافه) — همان MentorEmpty */
export function MentorDashEmpty({ children }: { children: React.ReactNode }) {
  return <MentorEmpty>{children}</MentorEmpty>;
}

/**
 * اطلاعیه‌ی درون‌صفحه — همان MentorNotice (یک ردیف فشرده، بی‌بک‌گراند).
 * برای وضعیت صرفا اطلاعاتی (مثل «در صف بررسی») از MentorChip استفاده کنید.
 */
export function MentorDashNotice({
  tone = "info", icon, title, children, action,
}: {
  tone?: "info" | "warn" | "danger" | "ok";
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return <MentorNotice tone={tone} icon={icon} title={title} action={action}>{children}</MentorNotice>;
}

/** نوار پیشرفت باریک — همون `.rp-bar` رودمپ‌ها */
export function MentorDashBar({ rate, label }: { rate: number | null | undefined; label?: string }) {
  const pct = Math.round(normRate(rate) * 100);
  return (
    <div className="rp-bar" role="progressbar" aria-label={label} aria-valuetext={tr(`${pct} درصد`, `${pct} percent`)} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
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
  return tr(`${fa(v)}٪`, `${fa(v)}%`);
}
