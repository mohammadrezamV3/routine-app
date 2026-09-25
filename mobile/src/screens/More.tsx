import { Map, User, Settings, Info, Moon, Sun, RefreshCw, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";
import { useTheme } from "@/lib/useTheme";
import { useSync } from "@/sync/SyncProvider";
import { formatLastSync } from "@/sync/format";

export default function More() {
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();
  const sync = useSync();

  return (
    <div>
      <AppHeader title="بیشتر" />
      <main className="pt-2">
        <ListRow icon={<Map size={18} color="var(--muted)" />} label="رودمپ‌ها" onClick={() => navigate("/roadmaps")} />
        <ListRow
          icon={<User size={18} color="var(--muted)" />}
          label="حساب کاربری"
          detail={sync.loggedIn ? sync.user?.name || undefined : "مهمان"}
          onClick={() => navigate("/more/account")}
        />
        {sync.enabled && (
          <ListRow
            icon={<LogIn size={18} color="var(--muted)" />}
            label={sync.loggedIn ? "ورود و خروج" : "ورود به حساب"}
            onClick={() => navigate("/login")}
          />
        )}
        {sync.enabled && sync.loggedIn && (
          <ListRow
            icon={<RefreshCw size={18} color="var(--muted)" className={sync.status === "syncing" ? "animate-spin" : undefined} />}
            label="همگام‌سازی"
            detail={
              sync.status === "syncing"
                ? "در حال انجام…"
                : sync.status === "offline"
                  ? "آفلاین"
                  : sync.status === "error"
                    ? "ناموفق"
                    : formatLastSync(sync.lastSyncAt)
            }
            onClick={() => void sync.syncNow()}
          />
        )}
        <ListRow
          icon={mode === "dark" ? <Moon size={18} color="var(--muted)" /> : <Sun size={18} color="var(--muted)" />}
          label={mode === "dark" ? "تم: تاریک" : "تم: روشن"}
          onClick={toggle}
        />
        <ListRow icon={<Settings size={18} color="var(--muted)" />} label="تنظیمات" onClick={() => navigate("/more/settings")} />
        <ListRow icon={<Info size={18} color="var(--muted)" />} label="درباره" onClick={() => navigate("/more/about")} />
      </main>
    </div>
  );
}
