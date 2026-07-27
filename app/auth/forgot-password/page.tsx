import Link from "next/link";
import { AuthBackButton, AuthBrandMark } from "@/components/AuthChrome";

// این پروژه هنوز زیرساخت ارسال ایمیل/پیامک نداره، پس به‌جای شبیه‌سازی یک فرم
// «بازیابی خودکار» که در عمل کاری انجام نمی‌ده، مسیر واقعی (تماس مستقیم با
// پشتیبانی) رو صادقانه نشون می‌دیم.
export default function ForgotPasswordPage() {
  return (
    <section className="auth-page">
      <AuthBackButton />
      <div className="auth-shell">
        <div className="auth-box">
          <AuthBrandMark />
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>فراموشی رمز عبور</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.8 }}>
              بازیابی خودکار رمز فعلاً از طریق سایت انجام نمی‌شه. برای تغییر رمز حسابت،
              از یکی از راه‌های زیر با پشتیبانی در تماس باش تا هویتت تأیید و رمز جدید برات ثبت بشه.
            </div>
          </div>

          <div className="about-list" style={{ marginTop: 10 }}>
            <div className="about-row">
              <span className="about-label">شماره تماس</span>
              <a href="tel:+989058969548" className="mono" dir="ltr" style={{ color: "var(--accent)", textDecoration: "none" }}>+98 905 896 9548</a>
            </div>
            <div className="about-row">
              <span className="about-label">ایمیل</span>
              <a href="mailto:smm881517@gmail.com" className="mono" dir="ltr" style={{ color: "var(--accent)", textDecoration: "none" }}>smm881517@gmail.com</a>
            </div>
          </div>

          <div className="wsearch-newform-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
            <Link href="/auth/login" style={{ borderRadius: 8, padding: "9px 20px", border: "1px solid var(--accent)", color: "var(--accent)" }}>
              بازگشت به ورود
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
