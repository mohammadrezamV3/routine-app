"use client";

import "./mentor.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { BarChart3, LayoutDashboard, LayoutTemplate, Settings, Users } from "lucide-react";
import { mentorApi } from "./MentorDashKit";
import { M_DUR, mT } from "./MentorMotion";
import type { MentorSelf } from "@/lib/mentorTypes";

/**
 * ناوبریِ خودِ پنلِ منتور (همه‌ی /mentor/*): یک نوارِ تبِ فشرده بالای پنل،
 * با همان ظاهرِ SegmentedTabs سایت (auth-tabs) ولی لینک و آیکون‌دار؛ نشانگرِ
 * فعال بینِ صفحه‌ها می‌لغزد چون این نوار در app/mentor/layout.tsx است و با
 * ناوبری دوباره mount نمی‌شود. فقط برای کسی که پروفایلِ منتوری دارد دیده
 * می‌شود؛ تا وقتی معلوم نیست، جایش رزرو است (بدونِ پرشِ layout).
 */

export const MENTOR_PANEL_TABS = [
  { href: "/mentor", label: "داشبورد", Icon: LayoutDashboard, match: (p: string) => p === "/mentor" },
  { href: "/mentor/students", label: "شاگردها", Icon: Users, match: (p: string) => p.startsWith("/mentor/students") },
  { href: "/mentor/templates", label: "قالب‌ها", Icon: LayoutTemplate, match: (p: string) => p.startsWith("/mentor/templates") || p.startsWith("/mentor/programs") },
  { href: "/mentor/reports", label: "گزارش‌ها", Icon: BarChart3, match: (p: string) => p.startsWith("/mentor/reports") },
  { href: "/mentor/settings", label: "تنظیمات", Icon: Settings, match: (p: string) => p.startsWith("/mentor/settings") || p.startsWith("/mentor/profile") },
] as const;

/* ── پروفایلِ منتوریِ خودم: یک درخواست برای نوار و صفحه‌ها ────────── */
type SelfState = { status: "unknown" | "loading" | "ready" | "error"; profile: MentorSelf | null; error?: string; code?: number };
let selfState: SelfState = { status: "unknown", profile: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const HINT_KEY = "mentor-panel-has-profile";

function emit(next: SelfState) {
  selfState = next;
  if (next.status === "ready") {
    try { sessionStorage.setItem(HINT_KEY, next.profile ? "1" : "0"); } catch { /* ذخیره‌ی مرورگر در دسترس نیست */ }
  }
  listeners.forEach((l) => l());
}

/** دوباره خواندنِ /api/mentors/me (مثلاً پس از ساختِ پروفایل) */
export function reloadMentorSelf(silent = false): Promise<void> {
  if (inflight) return inflight;
  if (!silent || selfState.status !== "ready") emit({ ...selfState, status: "loading" });
  inflight = mentorApi<{ profile: MentorSelf | null }>("/api/mentors/me").then((r) => {
    inflight = null;
    if (r.ok) emit({ status: "ready", profile: r.data.profile });
    else emit({ status: "error", profile: selfState.profile, error: r.error, code: r.status });
  });
  return inflight;
}

/** پس از ذخیره‌ی پروفایل: بدونِ درخواستِ تازه به‌روز کن */
export function setMentorSelf(profile: MentorSelf | null) {
  emit({ status: "ready", profile });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** وضعیتِ پروفایلِ منتوری؛ بارِ اول خودش می‌خواند (یک درخواست برای همه). */
export function useMentorSelf() {
  const state = useSyncExternalStore(subscribe, () => selfState, () => selfState);
  useEffect(() => {
    if (selfState.status === "unknown") reloadMentorSelf();
  }, []);
  const reload = useCallback((silent = false) => reloadMentorSelf(silent), []);
  return { ...state, reload };
}

function readHint(): boolean {
  try { return sessionStorage.getItem(HINT_KEY) !== "0"; } catch { return true; }
}

export function MentorPanelNav() {
  const pathname = usePathname() || "/mentor";
  const { status } = useSession();
  const self = useMentorSelf();
  const [hint, setHint] = useState(true);
  useEffect(() => setHint(readHint()), []);

  if (status === "unauthenticated") return null;
  // معلوم: فقط با پروفایل. نامعلوم (در حالِ خواندن): طبقِ آخرین بار در همین
  // نشست، تا نوار نه بی‌دلیل ظاهر شود نه دیر بیاید و محتوا را هل بدهد.
  const show = self.status === "ready"
    ? !!self.profile
    : self.status === "error"
      ? !(self.code === 401 || self.code === 403 || self.code === 404) && hint
      : hint;
  if (!show) return null;

  return (
    <nav className="mentor-panel-nav" aria-label="پنل منتور">
      <div className="auth-tabs mentor-panel-tabs">
        {MENTOR_PANEL_TABS.map(({ href, label, Icon, match }) => {
          const on = match(pathname);
          return (
            <Link
              key={href} href={href} prefetch
              className={`auth-tab mentor-panel-tab${on ? " active" : ""}`}
              aria-current={on ? "page" : undefined}
            >
              {on && (
                <motion.span
                  layoutId="mentor-panel-ind"
                  className="mentor-panel-ind"
                  transition={mT(M_DUR.slow)}
                  aria-hidden
                />
              )}
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
