"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getAccount, activeModulesOf } from "@/lib/accountCache";

type GateModule = "EXERCISE" | "CALORIE" | "TRADE" | "ROADMAP" | "AI_INSIGHT";

/**
 * برای صفحاتی که به یک ماژول خاص از پلن نیاز دارن. اگه کاربر دسترسی نداشته
 * باشه، محتوای واقعی اصلا لود/فچ نمی‌شه — به‌جاش یک پیش‌نمایش تار (اسکلت
 * تزئینی، نه دیتای واقعی) + پیام + دکمه‌ی خرید اشتراک نشون داده می‌شه.
 *
 * برای کاربر مهمون (لاگین‌نکرده) این گیت هیچ کاری نمی‌کنه و children رو
 * همون‌طور رد می‌کنه — «اشتراک نداری» با «هنوز حساب نداری» فرق داره؛
 * پیام لاگین رو خود صفحه/کامپوننت فرزند (که از قبل status رو چک می‌کنه) نشون می‌ده.
 */
export function ModuleGate({ module, children }: { module: GateModule; children: React.ReactNode }) {
  const { status } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    // از کش مشترک می‌خونه — NavDrawer دقیقا همین پاسخ رو لازم داره و
    // قبلا هردو مستقلا فچ می‌زدن (دو بار /api/account در هر لود صفحه).
    getAccount()
      .then((data) => {
        if (cancelled) return;
        setAllowed(!!data?.user && activeModulesOf(data).has(module));
      })
      .catch(() => { if (!cancelled) setAllowed(false); });
    return () => { cancelled = true; };
  }, [status, module]);

  if (allowed === false) return <GateDenied />;

  // چه سشن هنوز لودینگ/مهمونه، چه دسترسی تاییدشده، چه هنوز در حال چکه —
  // children رو بلافاصله مونت می‌کنیم (نه بعد از رسیدن جواب /api/account).
  // قبلا تا وقتی allowed مشخص نمی‌شد یه پیام «در حال بررسی دسترسی…» جدا
  // نشون داده می‌شد و children کلا un‌mount بود — یعنی فچ داخلی خود
  // children (مثلا /api/exercise/plan) فقط بعد این چک شروع می‌شد، نه
  // موازیش. enforcement واقعی همیشه سمت سرور (requireModule) انجام می‌شه،
  // پس مونت‌کردن زودتر children مشکلی نداره — فقط اگه واقعا دسترسی نبود
  // (allowed===false)، به‌جاش پیش‌نمایش تار+پیام خرید نشون داده می‌شه.
  return <>{children}</>;
}

function GateDenied() {
  const router = useRouter();
  return (
    <div className="module-gate">
      <div className="module-gate-blur" aria-hidden="true">
        <div className="mg-skel-line" style={{ width: "68%" }} />
        <div className="mg-skel-line" style={{ width: "42%" }} />
        <div className="mg-skel-row">
          <div className="mg-skel-card" />
          <div className="mg-skel-card" />
        </div>
        <div className="mg-skel-line" style={{ width: "80%" }} />
        <div className="mg-skel-line" style={{ width: "55%" }} />
      </div>
      <div className="module-gate-overlay">
        <span className="module-gate-icon">
          <svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </span>
        <div className="module-gate-msg">اشتراک این بخش رو نداری</div>
        <button
          type="button"
          className="module-gate-cta"
          onClick={() => router.push("/subscription")}
        >
          خرید این پلن
        </button>
      </div>
    </div>
  );
}
