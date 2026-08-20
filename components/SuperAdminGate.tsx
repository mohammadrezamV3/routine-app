"use client";

import { useSession } from "next-auth/react";

// برای بخش‌هایی که فعلاً کلاً برای همه به‌جز سوپریوزر غیرفعالن (رودمپ،
// نوت‌پد) — برخلافِ ModuleGate، اینجا هیچ دکمه‌ی «خرید اشتراک» نشون داده
// نمی‌شه چون این بخش‌ها اصلاً خریدنی نیستن؛ enforcement واقعی همیشه سمتِ
// سرور (requireSuperAdmin) انجام می‌شه.
export function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  if ((session?.user as any)?.isSuperAdmin) return <>{children}</>;
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
        <div className="module-gate-msg">این بخش موقتاً غیرفعال است</div>
      </div>
    </div>
  );
}
