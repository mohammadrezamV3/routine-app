"use client";

// صفحه‌بندی مشترک پنل Owner — قبلا همین سه‌خط (دکمه‌ی قبلی/شماره‌صفحه/
// دکمه‌ی بعدی) توی users/transactions/system-errors جدا کپی شده بود.
// خود onChange تصمیم می‌گیره چطور صفحه عوض بشه (query string یا state
// محلی)، این کامپوننت فقط UI/شرط نمایشه.
export function AdminPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  // totalPages ممکنه 0/NaN بیاد (مثلا total=0) و page از URL خارج از بازه —
  // هر دو رو به یک بازه‌ی معتبر می‌بریم تا «۷ از ۳» یا دکمه‌ی فعالِ بی‌اثر نشه.
  const pages = Number.isFinite(totalPages) ? Math.max(1, Math.floor(totalPages)) : 1;
  if (pages <= 1) return null;
  const cur = Math.min(pages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  return (
    <nav className="admin-pagination" aria-label="صفحه‌بندی">
      <button type="button" className="admin-btn sm" disabled={cur <= 1} onClick={() => onChange(cur - 1)}>قبلی</button>
      <span className="admin-pagination-info">
        صفحه <b className="admin-ltr">{cur}</b> از <b className="admin-ltr">{pages}</b>
      </span>
      <button type="button" className="admin-btn sm" disabled={cur >= pages} onClick={() => onChange(cur + 1)}>بعدی</button>
    </nav>
  );
}
