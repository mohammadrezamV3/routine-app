"use client";

import { useState } from "react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { NavTopbar } from "./NavTopbar";
import { NavMenuPanel } from "./NavMenuPanel";

// ICONS حالا در NavIcons.tsx زندگی می‌کنه؛ این re-export فقط برای
// ایمپورت‌کننده‌های قدیمی (`import { ICONS } from "@/components/NavDrawer"`).
export { ICONS } from "./NavIcons";

// ترکیب هدر وب (NavTopbar) و کشوی منو (NavMenuPanel). مدل لینک‌ها/فیلتر
// ماژول در useNavModel و آیتم‌های منوی پروفایل در ProfileMenuList‌ن — تا
// اپ موبایل همون قطعه‌ها رو بدون هدر وب استفاده کنه. DOM خروجی دقیقا
// همون قبلیه: [statusbar-blur + header] (مگر در /auth و /admin) + overlay + nav.
export function NavDrawer() {
  const [open, setOpen] = useState(false);
  useLockBodyScroll(open);
  return (
    <>
      <NavTopbar drawerOpen={open} onOpenDrawer={() => setOpen(true)} onCloseDrawer={() => setOpen(false)} />
      <NavMenuPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
