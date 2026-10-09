import type { Metadata } from "next";
import Link from "next/link";
import { tr } from "@/lib/i18n";

// بدون این فایل، نکست یه صفحه‌ی ۴۰۴ی کاملا پیش‌فرض/بدون‌برند نشون می‌داد.
// خود کد HTTP همچنان ۴۰۴ صحیح می‌مونه (App Router خودکار انجامش می‌ده)،
// این فقط ظاهرشو با بقیه‌ی سایت هماهنگ می‌کنه.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <section style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12, padding: "40px 16px" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{tr("صفحه پیدا نشد", "Page not found")}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320, lineHeight: 1.8 }}>
        {tr("آدرسی که دنبالش بودی وجود نداره یا جابه‌جا شده.", "The page you were looking for does not exist or has moved.")}
      </div>
      <Link href="/" className="auth-full-btn" style={{ marginTop: 8, display: "inline-block", textDecoration: "none", width: "auto", padding: "10px 24px" }}>
        {tr("بازگشت به خانه", "Back to home")}
      </Link>
    </section>
  );
}
