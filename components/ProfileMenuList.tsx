"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { invalidateStorageCache } from "@/lib/storage";
import { invalidateAccountCache } from "@/lib/accountCache";
import { clearAuthHintCookie } from "@/lib/preload";
import { ICONS } from "./NavIcons";

// خروج کامل: کش storage/حساب و کوکی راهنمای auth پاک، بعد signOut.
export function signOutAndClear() {
  invalidateStorageCache();
  invalidateAccountCache();
  clearAuthHintCookie();
  signOut({ callbackUrl: "/" });
}

// آیتم‌های منوی پروفایل (پنل کاربری/پنل ادمین/اشتراک/خروج) — توی وب داخل
// پنل پورتال‌شده‌ی چیپ آواتار هدر رندر می‌شه؛ جدا شده تا اپ موبایل هم بتونه
// همین لیست رو (مثلا ته NavMenuPanel) بذاره. `onPick` قبل از هر اقدام صدا
// زده می‌شه تا صاحب پنل ببندتش.
export function ProfileMenuList({ onPick }: { onPick: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  return (
    <div className="notif-panel-list">
      <div
        className="notif-panel-item profile-menu-item"
        onClick={() => { onPick(); router.push("/account"); }}
      >
        <span className="nav-link-icon-svg">{ICONS.account}</span>
        <span>پنل کاربری</span>
      </div>
      {((session?.user as any)?.isAdmin || (session?.user as any)?.isSuperAdmin) && (
        <div
          className="notif-panel-item profile-menu-item"
          onClick={() => { onPick(); router.push("/admin"); }}
        >
          <span className="nav-link-icon-svg">{ICONS.admin}</span>
          <span>پنل ادمین</span>
        </div>
      )}
      <div
        className="notif-panel-item profile-menu-item"
        onClick={() => { onPick(); router.push("/subscription"); }}
      >
        <span className="nav-link-icon-svg">{ICONS.subscription}</span>
        <span>اشتراک</span>
      </div>
      <div
        className="notif-panel-item profile-menu-item"
        style={{ color: "#E05252" }}
        onClick={() => { onPick(); signOutAndClear(); }}
      >
        <span className="nav-link-icon-svg">{ICONS.logout}</span>
        <span>خروج از حساب</span>
      </div>
    </div>
  );
}
