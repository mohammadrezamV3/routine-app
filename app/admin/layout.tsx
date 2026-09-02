import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";

// این پنل دیتای خصوصی کسب‌وکار (کاربران، تراکنش‌ها) رو نشون می‌ده — علاوه
// بر X-Robots-Tag توی next.config.js و notFound() پایین (که اصلا محتوایی
// به غیر سوپرادمین نمی‌ده)، این هم یه لایه‌ی اضافه‌ست.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// گیت سمت سرور کامل پنل Owner — این یک Server Component است (نه
// "use client")، پس این چک روی *هر* درخواست به /admin/* قبل از رندر هر
// چیزی اجرا می‌شه، نه فقط یک گیت بصری کلاینتی که با تغییر URL دور زده
// بشه. یک کاربر عادی که مستقیم /admin رو باز کنه، اصلا محتوایی دریافت
// نمی‌کنه — notFound() (نه redirect) چون طبق درخواست صریح نباید حتی وجود
// این روت لو بره.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
  if (!isSuperAdmin) notFound();

  return <AdminShell>{children}</AdminShell>;
}
