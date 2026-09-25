import { Map, User, Settings, Info, Moon, Sun, RefreshCw, LogIn, CreditCard, Users, MessagesSquare, LifeBuoy, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";
import { useTheme } from "@/lib/useTheme";
import { useSync } from "@/sync/SyncProvider";
import { formatLastSync } from "@/sync/format";
import { accountRoutePaths } from "@/features/account/paths";
import { socialRoutePaths } from "@/features/social/paths";
import { useNotices } from "@/features/account/useNotices";
import { badgeLabel } from "@/features/account/logic";

export default function More() {
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();
  const sync = useSync();
  const { unreadCount } = useNotices();
  const noticesBadge = badgeLabel(unreadCount);

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
        <ListRow
          icon={<CreditCard size={18} color="var(--muted)" />}
          label="حساب و اشتراک"
          onClick={() => navigate(accountRoutePaths.hub)}
        />
        <ListRow
          icon={<Users size={18} color="var(--muted)" />}
          label="دوستان و گزارش هفتگی"
          onClick={() => navigate(socialRoutePaths.home)}
        />
        <ListRow
          icon={<MessagesSquare size={18} color="var(--muted)" />}
          label="چت نماد"
          onClick={() => navigate(socialRoutePaths.chatRooms)}
        />
        <ListRow
          icon={<LifeBuoy size={18} color="var(--muted)" />}
          label="پشتیبانی"
          onClick={() => navigate(accountRoutePaths.support)}
        />
        <ListRow
          icon={<Bell size={18} color="var(--muted)" />}
          label="اعلانیه‌ها"
          detail={noticesBadge ? `${noticesBadge} نخوانده` : undefined}
          onClick={() => navigate(accountRoutePaths.notices)}
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
