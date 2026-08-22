"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const PRESETS: { key: string; label: string }[] = [
  { key: "today", label: "امروز" },
  { key: "7d", label: "۷ روز" },
  { key: "30d", label: "۳۰ روز" },
  { key: "3m", label: "۳ ماه" },
  { key: "12m", label: "۱۲ ماه" },
];

// انتخاب‌گرِ بازه‌ی زمانیِ مشترکِ صفحاتِ تحلیلیِ پنل Owner — وضعیت توی خودِ
// URL نگه داشته می‌شه (?range=30d)، نه state محلی، تا لینک‌دادن/رفرش‌کردن
// همون بازه رو حفظ کنه.
export function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("range") || "30d";
  const [customOpen, setCustomOpen] = useState(active === "custom");
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");

  function setRange(key: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("range", key);
    sp.delete("from");
    sp.delete("to");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("range", "custom");
    sp.set("from", from);
    sp.set("to", to);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="admin-range-picker">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`admin-range-btn${active === p.key ? " active" : ""}`}
          onClick={() => { setCustomOpen(false); setRange(p.key); }}
        >
          {p.label}
        </button>
      ))}
      <button type="button" className={`admin-range-btn${active === "custom" ? " active" : ""}`} onClick={() => setCustomOpen((v) => !v)}>
        بازه دلخواه
      </button>
      {customOpen && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="date" className="admin-input" value={from} onChange={(e) => setFrom(e.target.value)} style={{ colorScheme: "dark" }} />
          <span style={{ color: "var(--adm-muted-2)", fontSize: 11 }}>تا</span>
          <input type="date" className="admin-input" value={to} onChange={(e) => setTo(e.target.value)} style={{ colorScheme: "dark" }} />
          <button type="button" className="admin-btn primary" onClick={applyCustom} disabled={!from || !to} style={{ padding: "7px 12px" }}>
            اعمال
          </button>
        </div>
      )}
    </div>
  );
}
