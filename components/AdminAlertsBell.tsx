"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useAdminAlerts, relAge } from "@/components/AdminAlerts";

export function AdminAlertsBell() {
  const { items, total } = useAdminAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const active = items.filter((i) => i.count > 0);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="ads-bell" ref={ref}>
      <button type="button" className="ads-round-btn" aria-label={`هشدارها، ${total} مورد`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Bell size={18} />
        {total > 0 && <span className="ads-bell-badge">{total > 99 ? "99+" : total}</span>}
      </button>
      {open && (
        <div className="ads-bell-pop" role="menu" aria-label="هشدارها">
          <div className="ads-bell-head">نیاز به اقدام</div>
          {active.length === 0 ? (
            <div className="ads-bell-empty">همه‌چیز مرتبه</div>
          ) : (
            active.map((i) => (
              <Link key={i.key} href={i.href} className="ads-bell-row" role="menuitem">
                <span className={`ads-dot ads-dot-${i.tone}`} />
                <span className="ads-bell-text">
                  <span>{i.label}</span>
                  {i.oldestAt && <span className="ads-bell-sub">قدیمی‌ترین: {relAge(i.oldestAt)}</span>}
                </span>
                <strong>{i.count}</strong>
              </Link>
            ))
          )}
          <Link href="/admin/alerts" className="ads-bell-all">همه‌ی هشدارها</Link>
        </div>
      )}
    </div>
  );
}
