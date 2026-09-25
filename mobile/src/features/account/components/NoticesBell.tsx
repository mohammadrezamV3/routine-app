import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { badgeLabel } from "../logic";
import { useNotices } from "../useNotices";
import { accountRoutePaths } from "../paths";

/** زنگوله‌ی اطلاعیه‌ها با بَجِ نخونده‌ها — برای `right` ِ AppHeader (بی‌بک‌گراند، مثلِ بقیه‌ی آیکون‌های هدر) */
export default function NoticesBell() {
  const navigate = useNavigate();
  const { unreadCount } = useNotices();
  const label = badgeLabel(unreadCount);
  return (
    <button
      type="button"
      onClick={() => navigate(accountRoutePaths.notices)}
      aria-label={label ? `اطلاعیه‌ها، ${label} نخوانده` : "اطلاعیه‌ها"}
      className="relative flex items-center justify-center"
      style={{ width: 40, height: 40 }}
    >
      <Bell size={20} color="var(--text)" />
      {label && (
        <span
          className="absolute flex min-w-[16px] items-center justify-center rounded-full px-1 font-latin text-[9.5px] font-bold"
          style={{ top: 5, insetInlineEnd: 4, height: 16, background: "var(--pnl-loss)", color: "white" }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
