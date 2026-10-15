"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { tr } from "@/lib/i18n";

// تابع (نه ثابت ماژول) تا برچسب‌ها با زبان جاری حل بشن
function presets(): { key: string; label: string }[] {
  return [
    { key: "today", label: tr("امروز", "Today") },
    { key: "7d", label: tr("7 روز", "7 days") },
    { key: "30d", label: tr("30 روز", "30 days") },
    { key: "3m", label: tr("3 ماه", "3 months") },
    { key: "12m", label: tr("12 ماه", "12 months") },
  ];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// انتخاب‌گر بازه‌ی زمانی مشترک صفحات تحلیلی پنل Owner — وضعیت توی خود
// URL نگه داشته می‌شه (?range=30d)، نه state محلی، تا لینک‌دادن/رفرش‌کردن
// همون بازه رو حفظ کنه. تاریخ‌ها YYYY-MM-DD هستن و سرور «تا» رو تا آخر
// همون روز حساب می‌کنه.
export function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("range") || "30d";
  const urlFrom = searchParams.get("from") || "";
  const urlTo = searchParams.get("to") || "";
  const [customOpen, setCustomOpen] = useState(active === "custom");
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);

  // با back/forward مرورگر URL عوض می‌شه ولی state محلی نه — همگامش می‌کنیم
  useEffect(() => {
    setFrom(urlFrom);
    setTo(urlTo);
    if (active === "custom") setCustomOpen(true);
  }, [active, urlFrom, urlTo]);

  function push(sp: URLSearchParams) {
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  function setRange(key: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("range", key);
    sp.delete("from");
    sp.delete("to");
    sp.delete("page");
    push(sp);
  }

  const valid = DATE_RE.test(from) && DATE_RE.test(to);
  const reversed = valid && from > to;

  function applyCustom() {
    if (!valid || reversed) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("range", "custom");
    sp.set("from", from);
    sp.set("to", to);
    sp.delete("page");
    push(sp);
  }

  const max = todayLocal();

  return (
    <div className="admin-range-picker">
      <div className="admin-range-presets" role="group" aria-label={tr("بازه‌ی زمانی", "Date range")}>
        {presets().map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={active === p.key}
            className={`admin-range-btn${active === p.key ? " active" : ""}`}
            onClick={() => { setCustomOpen(false); setRange(p.key); }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          aria-expanded={customOpen}
          className={`admin-range-btn${active === "custom" ? " active" : ""}${customOpen ? " is-open" : ""}`}
          onClick={() => setCustomOpen((v) => !v)}
        >
          {tr("بازه دلخواه", "Custom range")}
        </button>
      </div>
      {customOpen && (
        <form className="admin-range-custom" onSubmit={(e) => { e.preventDefault(); applyCustom(); }}>
          <label className="admin-range-date">
            <span>{tr("از", "From")}</span>
            <input type="date" className="admin-input" value={from} max={to || max} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="admin-range-date">
            <span>{tr("تا", "To")}</span>
            <input type="date" className="admin-input" value={to} min={from || undefined} max={max} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="submit" className="admin-btn primary sm" disabled={!valid || reversed}>
            {tr("اعمال", "Apply")}
          </button>
          {reversed && <span className="admin-form-error">{tr("تاریخ «از» باید قبل از «تا» باشه", "The «From» date must be before the «To» date")}</span>}
        </form>
      )}
    </div>
  );
}
