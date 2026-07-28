"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type GateModule = "EXERCISE" | "CALORIE" | "TRADE" | "CODING" | "ROADMAP" | "AI_INSIGHT";

/**
 * برای صفحاتی که به یک ماژول خاص از پلن نیاز دارن. اگه کاربر دسترسی نداشته
 * باشه، محتوای واقعی اصلاً لود/فچ نمی‌شه — به‌جاش یک پیش‌نمایش تار (اسکلت
 * تزئینی، نه دیتای واقعی) + پیام + دکمه‌ی خرید اشتراک نشون داده می‌شه.
 *
 * برای کاربر مهمون (لاگین‌نکرده) این گیت هیچ کاری نمی‌کنه و children رو
 * همون‌طور رد می‌کنه — «اشتراک نداری» با «هنوز حساب نداری» فرق داره؛
 * پیام لاگین رو خودِ صفحه/کامپوننتِ فرزند (که از قبل status رو چک می‌کنه) نشون می‌ده.
 */
export function ModuleGate({ module, children }: { module: GateModule; children: React.ReactNode }) {
  const { status } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const now = Date.now();
        const has = !!data?.user && (data.user.moduleAccess || []).some(
          (m: { module: string; active: boolean; expiresAt: string | null }) =>
            m.module === module && m.active && (!m.expiresAt || new Date(m.expiresAt).getTime() > now)
        );
        setAllowed(has);
      })
      .catch(() => { if (!cancelled) setAllowed(false); });
    return () => { cancelled = true; };
  }, [status, module]);

  if (status !== "authenticated") return <>{children}</>;
  if (allowed === null) return <div className="item-line" style={{ marginTop: 14 }}>در حال بررسی دسترسی…</div>;
  if (allowed) return <>{children}</>;

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
          onClick={() => window.dispatchEvent(new Event("open-account-panel"))}
        >
          خرید اشتراک
        </button>
      </div>
    </div>
  );
}
