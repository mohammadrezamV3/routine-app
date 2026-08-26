import type { Metadata } from "next";
import Link from "next/link";

// بدونِ این فایل، نکست یه صفحه‌ی ۴۰۴ی کاملاً پیش‌فرض/بدون‌برند نشون می‌داد.
// خودِ کدِ HTTP همچنان ۴۰۴ صحیح می‌مونه (App Router خودکار انجامش می‌ده)،
// این فقط ظاهرشو با بقیه‌ی سایت هماهنگ می‌کنه.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <section style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12, padding: "40px 16px" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>صفحه پیدا نشد</div>
      <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 320, lineHeight: 1.8 }}>
        آدرسی که دنبالش بودی وجود نداره یا جابه‌جا شده.
      </div>
      <Link href="/" className="auth-full-btn" style={{ marginTop: 8, display: "inline-block", textDecoration: "none", width: "auto", padding: "10px 24px" }}>
        بازگشت به خانه
      </Link>
    </section>
  );
}
