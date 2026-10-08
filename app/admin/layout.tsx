import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/requireAdmin";
import { AdminShell } from "@/components/AdminShell";

// این پنل دیتای خصوصی کسب‌وکار رو نشون می‌ده — علاوه بر X-Robots-Tag توی
// next.config.js و notFound() پایین، این هم یه لایه‌ی اضافه‌ست.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// گیت سمت سرور کل پنل — Server Component، پس روی *هر* درخواست به /admin/*
// قبل از رندر اجرا می‌شه. وضعیت ادمین مستقیم از دیتابیس خونده می‌شه (نه
// JWT) تا گرفتن دسترسی فوری اثر کنه. غیرادمین → notFound() تا حتی وجود
// روت لو نره. دسترسی هر صفحه جدا هم سمت سرور (requireAdmin توی هر API) چک
// می‌شه؛ AdminShell فقط منو رو فیلتر و صفحه‌ی «بدون دسترسی» نشون می‌ده.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext();
  if (!ctx) notFound();

  return <AdminShell isSuperAdmin={ctx.isSuperAdmin} permissions={ctx.permissions}>{children}</AdminShell>;
}
