"use client";

import "./mentor.css";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { FeatureGate } from "./FeatureGate";
import { PanelSkeleton } from "./PanelSkeleton";
import { MentorErrorState, MentorPageHead } from "./MentorPageShell";
import { MentorEmpty, MentorNotice, MentorPage } from "./MentorUI";
import { faNum } from "@/lib/jalali";

/**
 * تکه‌های مشترک صفحه‌های سمت منتور (/mentor/**): پوسته با گیت ورود + فلگ
 * `mentors`، درخواست JSON با پیام خطای قابل‌نمایش، و حالت‌های خطا/خالی.
 * سرصفحه، خطا و اطلاعیه همان پایه‌های MentorPageShell/MentorUI هستند تا
 * سمت منتور و سمت شاگرد یک‌شکل باشند. بدون بک‌گراند تازه؛ حرکت از MentorMotion.
 */

export type ApiResult<T> = { ok: true; data: T; status: number } | { ok: false; error: string; status: number };

/** پیامِ خطای عمومی بر اساسِ کدِ وضعیت — وقتی سرور `error` نفرستاده باشه */
export function statusMessage(status: number): string {
  if (status === 0) return "ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کن";
  if (status === 401) return "نشستت تمام شده است؛ دوباره وارد شو";
  if (status === 403) return "اجازه‌ی این کار را نداری";
  if (status === 404) return "پیدا نشد یا به آن دسترسی نداری";
  if (status === 409) return "وضعیت تغییر کرده است؛ صفحه را تازه کن";
  if (status === 413) return "حجم فایل حداکثر 5 مگابایت است";
  if (status === 415) return "فقط تصویر (JPG، PNG، WebP) یا PDF پذیرفته می‌شود";
  if (status === 429) return "تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد دوباره تلاش کن";
  if (status >= 500) return "خطای سرور؛ چند دقیقه بعد دوباره تلاش کن";
  return "انجام نشد؛ دوباره تلاش کن";
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
 * پوسته‌ی همه‌ی صفحه‌های /mentor: بازگشت + عنوان + گیت‌ها. ظرفِ عرض
 * (account-shell، که فرم‌های AuthField ظاهرشان را از آن می‌گیرند) و نوارِ
 * ناوبریِ پنل در app/mentor/layout.tsx هستند. تا وقتی نشست در حال بارگذاری
 * است اسکلت نشان داده می‌شود (نه پیام اشتباه «وارد شوید»).
 * محتوا داخلِ یک ظرفِ واحد (MentorPage) می‌نشیند؛ `surface={false}` برای
 * صفحه‌ای که خودش چند ظرف لازم دارد. `hint` دیگر رندر نمی‌شود.
 */
export function MentorDashShell({
  title, back, titleAction, surface = true, children,
}: {
  title: string;
  /** @deprecated زیرعنوانِ صفحه حذف شد؛ نادیده گرفته می‌شود */
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
      {status === "unauthenticated" && <AuthGate message="برای استفاده از بخش مربی‌ها وارد شوید" />}
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

/** پیام خالیِ داخل یک بخش (بدون قاب اضافه) — همان MentorEmpty */
export function MentorDashEmpty({ children }: { children: React.ReactNode }) {
  return <MentorEmpty>{children}</MentorEmpty>;
}

/**
 * اطلاعیه‌ی درون‌صفحه — همان MentorNotice (یک ردیف فشرده، بی‌بک‌گراند).
 * برای وضعیت صرفاً اطلاعاتی (مثل «در صف بررسی») از MentorChip استفاده کنید.
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
