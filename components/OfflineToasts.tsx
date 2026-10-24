"use client";

// نتیجه‌ی همگام‌سازی صف آفلاین رو با همون تُست موجود (reportLiveError ->
// LiveSyncToaster) نشون می‌ده: خطای رد شدن یک تغییر، و یک پیام کوتاه وقتی
// صف خالی شد. بدون رندر.
import { useEffect, useRef } from "react";
import { tr } from "@/lib/i18n";
import { reportLiveError } from "@/lib/liveSync";
import { clearOfflineError, useOfflineStatus } from "@/lib/offline/status";

const SUCCESS_GAP_MS = 8000;
const ERR_QUIET_MS = 5000;

export function useOfflineToasts() {
  const { online, pending, lastError } = useOfflineStatus();
  const prevPending = useRef<number | null>(null);
  const lastOkAt = useRef(0);
  const shownErrAt = useRef(0);
  const errToastAt = useRef(0);

  useEffect(() => {
    if (lastError && lastError.at !== shownErrAt.current) {
      shownErrAt.current = lastError.at;
      errToastAt.current = Date.now();
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
      // پیام «همگام شد» نباید پیام رد شدن یک تغییر رو که همین الان نشون داده شد پنهان کنه (تست فقط یکیه)
      if (now - lastOkAt.current > SUCCESS_GAP_MS && now - errToastAt.current > ERR_QUIET_MS) {
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
