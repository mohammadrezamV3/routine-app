"use client";

// نتیجه‌ی همگام‌سازی صف آفلاین رو با همون تُست موجود (reportLiveError ->
// LiveSyncToaster) نشون می‌ده: خطای رد شدن یک تغییر، و یک پیام کوتاه وقتی
// صف خالی شد. بدون رندر.
import { useEffect, useRef } from "react";
import { tr } from "@/lib/i18n";
import { reportLiveError } from "@/lib/liveSync";
import { clearOfflineError, useOfflineStatus } from "@/lib/offline/status";

const SUCCESS_GAP_MS = 8000;

export function useOfflineToasts() {
  const { online, pending, lastError } = useOfflineStatus();
  const prevPending = useRef<number | null>(null);
  const lastOkAt = useRef(0);
  const shownErrAt = useRef(0);

  useEffect(() => {
    if (lastError && lastError.at !== shownErrAt.current) {
      shownErrAt.current = lastError.at;
      reportLiveError(
        tr(
          `این تغییر ذخیره نشد: ${lastError.label} — ${lastError.message}`,
          `This change was not saved: ${lastError.label} — ${lastError.message}`
        )
      );
      clearOfflineError();
    }
    const prev = prevPending.current;
    prevPending.current = pending;
    if (prev !== null && prev > 0 && pending === 0 && online && !lastError) {
      const now = Date.now();
      if (now - lastOkAt.current > SUCCESS_GAP_MS) {
        lastOkAt.current = now;
        reportLiveError(tr("همه‌ی تغییرها همگام شد", "All changes are synced"));
      }
    }
  }, [online, pending, lastError]);
}

export default function OfflineToasts() {
  useOfflineToasts();
  return null;
}
