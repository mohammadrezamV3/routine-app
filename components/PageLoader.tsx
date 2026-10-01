// لودینگ تمام‌صفحه برای بالا آمدن صفحه‌ها (loading.tsx ها) — به‌جای یک
// دایره‌ی کوچک وسط صفحه‌ی خالی: نشان برند داخل یک حلقه‌ی گرادیانی چرخان،
// و زیرش اسکلت یک صفحه (عنوان + کارت‌ها) با درخشش، تا از همون لحظه‌ی کلیک
// ساختار صفحه دیده بشه. بدون "use client" و بدون state — مستقیم داخل HTML
// سرور و حتی قبل از لود جاوااسکریپت دیده می‌شه. چرخش با CSS (globals.css).
export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="در حال بارگذاری">
      <div className="page-loader-mark">
        <svg className="page-loader-ring" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="pl-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="5" className="page-loader-track" />
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="5" stroke="url(#pl-grad)" strokeLinecap="round" strokeDasharray="190 277" />
        </svg>
        <svg className="page-loader-orbit" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="49" fill="none" strokeWidth="1" strokeDasharray="2 7" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-icon-dark-theme.png" alt="" className="page-loader-logo is-dark" width={40} height={34} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-icon-light-theme.webp" alt="" className="page-loader-logo is-light" width={40} height={34} />
      </div>
      <div className="page-loader-skel" aria-hidden="true">
        <span className="pls-line" style={{ width: "38%" }} />
        <span className="pls-line pls-thin" style={{ width: "56%" }} />
        <div className="pls-grid">
          <span className="pls-card" />
          <span className="pls-card" />
          <span className="pls-card pls-wide" />
        </div>
      </div>
    </div>
  );
}
