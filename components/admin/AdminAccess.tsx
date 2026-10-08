"use client";

import { createContext, useContext } from "react";
import { AdminPermission, hasPermission } from "@/lib/adminPermissions";

type Access = { isSuperAdmin: boolean; permissions: readonly string[] };
export const AdminAccessContext = createContext<Access>({ isSuperAdmin: false, permissions: [] });

// فقط برای مخفی‌کردن دکمه‌هایی که ادمین اجازه‌شون رو نداره — تصمیم واقعی
// همیشه سمت سرور (requireAdmin) گرفته می‌شه.
export function useAdminAccess() {
  const access = useContext(AdminAccessContext);
  return { ...access, can: (perm?: AdminPermission) => hasPermission(access, perm) };
}
