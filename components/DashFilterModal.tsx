"use client";

import { useState } from "react";
import { Importance, IMPORTANCE_LABELS } from "@/lib/storage";
import { SegmentedTabs } from "./SegmentedTabs";
import { ToggleSwitch } from "./ToggleSwitch";
import { normalizeFa } from "@/lib/utils";

const IMPORTANCE_TABS: { value: "all" | Importance; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "low", label: IMPORTANCE_LABELS.low },
  { value: "medium", label: IMPORTANCE_LABELS.medium },
  { value: "high", label: IMPORTANCE_LABELS.high },
  { value: "veryHigh", label: IMPORTANCE_LABELS.veryHigh },
];

// پاپ‌آپِ واحدِ فیلتر — هم میزانِ اهمیت هم انتخابِ برنامه‌ها (به‌جای دو
// کنترلِ جدا: دراپ‌داونِ قدیمی + دکمه‌ی روشن/خاموشِ «فیلتر»). با تیک‌زدن هر
// برنامه، فقط همون‌ها توی «برنامه‌های امروز» می‌مونن.
export function DashFilterModal({
  importance,
  onImportanceChange,
  programNames,
  programTags,
  programImportance,
  selectedPrograms,
  onToggleProgram,
  onSelectAll,
  onClose,
}: {
  importance: "all" | Importance;
  onImportanceChange: (v: "all" | Importance) => void;
  programNames: string[];
  programTags?: Record<string, string[]>; // اسمِ برنامه → تگ‌هایی که بهش اضافه شده، برای جستجو
  programImportance?: Record<string, Importance[]>; // اسمِ برنامه → سطوحِ اهمیتی که براش ثبت شده
  selectedPrograms: Set<string> | null; // null = فیلتری فعال نیست، یعنی همه نشون داده می‌شن
  onToggleProgram: (name: string) => void;
  onSelectAll: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const isChecked = (name: string) => selectedPrograms === null || selectedPrograms.has(name);
  const normalizedQuery = normalizeFa(query);
  // انتخابِ «میزان اهمیت» بالا فقط رویِ «برنامه‌های امروز» اثر نمی‌ذاره —
  // همین‌جا هم لیستِ چک‌باکسِ برنامه‌ها رو محدود می‌کنه به اونایی که واقعاً
  // اون سطحِ اهمیت رو دارن، تا خودِ دکمه هم قابل‌لمس/معنی‌دار باشه.
  const visibleNames = programNames
    .filter((n) => importance === "all" || (programImportance?.[n] ?? ["low"]).includes(importance))
    .filter(
      (n) =>
        !normalizedQuery ||
        normalizeFa(n).includes(normalizedQuery) ||
        (programTags?.[n] ?? []).some((tag) => normalizeFa(tag).includes(normalizedQuery))
    );

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel dash-scope open">
        <div className="modal-head">
          <div className="modal-title">فیلتر برنامه‌ها</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <div className="tm-extra" style={{ marginTop: 0 }}>
            <div className="domain-sub">میزان اهمیت</div>
            <SegmentedTabs active={importance} onChange={onImportanceChange} options={IMPORTANCE_TABS} />
          </div>

          <div className="tm-extra">
            <div className="domain-sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>برنامه‌ها</span>
              <button type="button" className="small" onClick={onSelectAll} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                همه
              </button>
            </div>

            {programNames.length > 0 && (
              <input
                type="text"
                dir="auto"
                className="wsearch-newform-name trade-glass-field pill-glass-field"
                placeholder="جستجوی برنامه یا تگ…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}

            {programNames.length === 0 ? (
              <div className="item-line empty">هنوز برنامه‌ای ثبت نکردی.</div>
            ) : visibleNames.length === 0 ? (
              <div className="item-line empty">
                {importance !== "all" ? "برنامه‌ای با این میزان اهمیت پیدا نشد." : "برنامه‌ای پیدا نشد."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {visibleNames.map((name) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span className="item-line" style={{ textAlign: "right" }}>{name}</span>
                    <ToggleSwitch checked={isChecked(name)} onChange={() => onToggleProgram(name)} label={name} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wsearch-newform-actions">
            <button type="button" className="wsearch-newform-submit" onClick={onClose} aria-label="اعمال تغییرات">
              <svg className="wns-check" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
