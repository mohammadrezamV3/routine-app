"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { mentorApi } from "./MentorDashKit";
import type { MentorSelf } from "@/lib/mentorTypes";

/* ── پروفایل منتوری خودم: یک درخواست برای نوار و صفحه‌ها ────────── */
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

/** دوباره خواندن /api/mentors/me (مثلا پس از ساخت پروفایل) */
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

/** پس از ذخیره‌ی پروفایل: بدون درخواست تازه به‌روز کن */
export function setMentorSelf(profile: MentorSelf | null) {
  emit({ status: "ready", profile });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** وضعیت پروفایل منتوری؛ بار اول خودش می‌خواند (یک درخواست برای همه). */
export function useMentorSelf() {
  const state = useSyncExternalStore(subscribe, () => selfState, () => selfState);
  useEffect(() => {
    if (selfState.status === "unknown") reloadMentorSelf();
  }, []);
  const reload = useCallback((silent = false) => reloadMentorSelf(silent), []);
  return { ...state, reload };
}
