import Link from "next/link";
import { LogIn } from "lucide-react";

// وقتی کاربر مهمون (لاگین‌نکرده) میاد سراغ یه بخش نیازمند حساب (ورزش/ترید)
// — عینا هم‌زبان بصری ModuleGate (پیش‌نمایش تار اسکلتی + پیام + دکمه)
// ولی برای «وارد نشدن» نه «اشتراک نداشتن». بعد ورود، خود ModuleGate
// تصمیم دسترسی ماژول رو می‌گیره — این گیت جایگزینش نمی‌شه، فقط قبلش می‌شینه.
export function AuthGate({ message = "برای استفاده از این سرویس وارد شوید" }: { message?: string }) {
  return (
    <div className="module-gate auth-gate">
      <div className="module-gate-blur" aria-hidden="true">
        <div className="mg-skel-line" style={{ width: "68%" }} />
        <div className="mg-skel-line" style={{ width: "42%" }} />
        <div className="mg-skel-row">
          <div className="mg-skel-card" />
          <div className="mg-skel-card" />
          <div className="mg-skel-card" />
        </div>
        <div className="mg-skel-line" style={{ width: "80%" }} />
        <div className="mg-skel-line" style={{ width: "55%" }} />
        <div className="mg-skel-row">
          <div className="mg-skel-card" />
          <div className="mg-skel-card" />
        </div>
      </div>
      <div className="module-gate-overlay">
        <span className="module-gate-icon">
          <LogIn size={20} />
        </span>
        <div className="module-gate-msg">{message}</div>
        <Link href="/auth/login" className="module-gate-cta">
          وارد شوید
        </Link>
      </div>
    </div>
  );
}
