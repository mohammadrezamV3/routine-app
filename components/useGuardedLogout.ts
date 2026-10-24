"use client";

// خروج از حساب آفلاین نصفه‌کاره می‌شد (نشست و کش پاک می‌شد ولی سرور خبر
// نمی‌گرفت). همه‌ی دکمه‌های خروج UI از این هوک استفاده می‌کنن؛ lib/logout.ts
// دست‌نخورده می‌مونه و هنوز تنها مسیر خروجه.
import { logoutAndRedirect } from "@/lib/logout";
import { reportLiveError } from "@/lib/liveSync";
import { onlineOnlyLogoutText } from "@/components/OnlineOnly";
import { getOfflineStatus, syncNow, useOfflineStatus } from "@/lib/offline/status";
import { tr } from "@/lib/i18n";

const SYNC_CAP_MS = 5000;
let checking = false;

/** پیام وقتی تغییر ارسال‌نشده هست (خروج، صف آفلاین رو پاک می‌کنه) */
export function pendingBlocksLogoutText(n: number): string {
  return tr(`${n} تغییر هنوز ارسال نشده؛ اول آنلاین بمون تا ارسال بشه`, `${n} change(s) have not been sent yet; stay online until they sync`);
}

export function useGuardedLogout() {
  const { online } = useOfflineStatus();
  const logout = async () => {
    if (!online) { reportLiveError(onlineOnlyLogoutText()); return; }
    if (checking) return;
    checking = true;
    try {
      // خروج صف آفلاین رو پاک می‌کنه: اول یک بار (با سقف) ارسالش می‌کنیم
      if (getOfflineStatus().pending > 0) {
        await Promise.race([syncNow().catch(() => {}), new Promise<void>((r) => setTimeout(r, SYNC_CAP_MS))]);
        const left = getOfflineStatus().pending;
        if (left > 0) { reportLiveError(pendingBlocksLogoutText(left)); return; }
      }
    } finally { checking = false; }
    void logoutAndRedirect();
  };
  return { logout, offline: !online, title: online ? undefined : onlineOnlyLogoutText() };
}
