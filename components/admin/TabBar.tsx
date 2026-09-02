"use client";

// نوار تب فیلتر مشترک پنل Owner — قبلا همین چند خط توی users/
// transactions/system-errors جدا کپی شده بود.
export function AdminTabBar<T extends string>({
  items, active, onChange,
}: { items: { key: T; label: string }[]; active: T; onChange: (key: T) => void }) {
  return (
    <div className="admin-tabs">
      {items.map((it) => (
        <button key={it.key} type="button" className={`admin-tab${active === it.key ? " active" : ""}`} onClick={() => onChange(it.key)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
