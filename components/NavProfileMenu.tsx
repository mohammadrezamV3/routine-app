"use client";

// پنل پروفایل هدر (پنل کاربری / پنل مربی / ادمین / اشتراک / خروج). فقط با اولین
// کلیک روی آواتار لود می‌شه (NavDrawer، dynamic) و به بادی پورتال می‌شه — دلیل
// پورتال: app-topbar خودش backdrop-filter داره و پنل داخلش بلور واقعی نمی‌گرفت.
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ICONS } from "./NavIcons";
import { logoutAndRedirect } from "@/lib/logout";
import { tr } from "@/lib/i18n";

type Props = {
  state: "open" | "closed";
  anchor: { top: number; edge: number; start?: boolean };
  showMentor: boolean;
  showAdmin: boolean;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement>;
};

export default function NavProfileMenu({ state, anchor, showMentor, showAdmin, onClose, panelRef }: Props) {
  const router = useRouter();
  return createPortal(
    <div
      ref={panelRef}
      className="notif-panel profile-menu-panel open"
      data-state={state}
      style={anchor.start ? { position: "fixed", top: anchor.top, left: anchor.edge, right: "auto" } : { position: "fixed", top: anchor.top, right: anchor.edge, left: "auto" }}
    >
      <div className="notif-panel-list">
        <div
          className="notif-panel-item profile-menu-item"
          onClick={() => { onClose(); router.push("/account"); }}
        >
          <span className="nav-link-icon-svg">{ICONS.account}</span>
          <span>{tr("پنل کاربری", "Account")}</span>
        </div>
        {showMentor && (
          <div
            className="notif-panel-item profile-menu-item"
            onClick={() => { onClose(); router.push("/mentor"); }}
          >
            <span className="nav-link-icon-svg">{ICONS.mentorPanel}</span>
            <span>{tr("پنل مربی", "Mentor panel")}</span>
          </div>
        )}
        {showAdmin && (
          <div
            className="notif-panel-item profile-menu-item"
            onClick={() => { onClose(); router.push("/admin"); }}
          >
            <span className="nav-link-icon-svg">{ICONS.admin}</span>
            <span>{tr("پنل ادمین", "Admin panel")}</span>
          </div>
        )}
        <div
          className="notif-panel-item profile-menu-item"
          onClick={() => { onClose(); router.push("/subscription"); }}
        >
          <span className="nav-link-icon-svg">{ICONS.subscription}</span>
          <span>{tr("اشتراک", "Subscription")}</span>
        </div>
        <div
          className="notif-panel-item profile-menu-item"
          style={{ color: "#E05252" }}
          onClick={() => { onClose(); logoutAndRedirect(); }}
        >
          <span className="nav-link-icon-svg">{ICONS.logout}</span>
          <span>{tr("خروج از حساب", "Log out")}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
