import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useSync } from "@/sync/SyncProvider";

// نشانگرِ کوچکِ وضعیتِ سینک کنارِ OfflinePill. فقط برای کاربرِ واردشده؛
// حالتِ آفلاین رو خودِ OfflinePill نشون می‌ده. لمس = «همگام‌سازی الان».
// دکمه عمدا بی‌بک‌گراند (ریستِ سراسریِ button در index.css).
export default function SyncStatusIcon() {
  const { enabled, loggedIn, status, syncNow } = useSync();
  if (!enabled || !loggedIn || status === "offline") return null;

  const label = status === "syncing" ? "در حال همگام‌سازی" : status === "error" ? "همگام‌سازی ناموفق" : "همگام‌شده";

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      aria-label={label}
      title={label}
      className="no-select flex items-center justify-center"
      style={{ width: 32, height: 32, background: "transparent" }}
    >
      {status === "syncing" ? (
        <RefreshCw size={16} color="var(--muted)" className="animate-spin" />
      ) : status === "error" ? (
        <CloudOff size={16} color="var(--pnl-loss)" />
      ) : (
        <Cloud size={16} color="var(--muted)" />
      )}
    </button>
  );
}
