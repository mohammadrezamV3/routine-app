"use client";

// صفحه‌بندیِ مشترکِ پنل Owner — قبلاً همین سه‌خط (دکمه‌ی قبلی/شماره‌صفحه/
// دکمه‌ی بعدی) توی users/transactions/system-errors جدا کپی شده بود.
// خودِ onChange تصمیم می‌گیره چطور صفحه عوض بشه (query string یا state
// محلی)، این کامپوننت فقط UI/شرطِ نمایشه.
export function AdminPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button type="button" className="admin-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>قبلی</button>
      <span style={{ fontSize: 12, color: "var(--adm-muted)" }}>{page} از {totalPages}</span>
      <button type="button" className="admin-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>بعدی</button>
    </div>
  );
}
