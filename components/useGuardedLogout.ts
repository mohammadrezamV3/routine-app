"use client";

// خروج از حساب آفلاین نصفه‌کاره می‌شد (نشست و کش پاک می‌شد ولی سرور خبر
// نمی‌گرفت). همه‌ی دکمه‌های خروج UI از این هوک استفاده می‌کنن؛ lib/logout.ts
// دست‌نخورده می‌مونه و هنوز تنها مسیر خروجه.
import { logoutAndRedirect } from "@/lib/logout";
import { reportLiveError } from "@/lib/liveSync";
import { onlineOnlyLogoutText } from "@/components/OnlineOnly";
import { useOfflineStatus } from "@/lib/offline/status";

export function useGuardedLogout() {
  const { online } = useOfflineStatus();
  const logout = () => {
    if (!online) { reportLiveError(onlineOnlyLogoutText()); return; }
    void logoutAndRedirect();
  };
  return { logout, offline: !online, title: online ? undefined : onlineOnlyLogoutText() };
}
