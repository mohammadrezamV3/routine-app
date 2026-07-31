"use client";

import { Importance, IMPORTANCE_LABELS } from "@/lib/storage";
import { SegmentedTabs } from "./SegmentedTabs";
import { ToggleSwitch } from "./ToggleSwitch";

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
  selectedPrograms,
  onToggleProgram,
  onSelectAll,
  onClearAll,
  onClose,
}: {
  importance: "all" | Importance;
  onImportanceChange: (v: "all" | Importance) => void;
  programNames: string[];
  selectedPrograms: Set<string> | null; // null = فیلتری فعال نیست، یعنی همه نشون داده می‌شن
  onToggleProgram: (name: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  const isChecked = (name: string) => selectedPrograms === null || selectedPrograms.has(name);

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open">
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
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" className="small" onClick={onSelectAll} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  همه
                </button>
                <button type="button" className="small" onClick={onClearAll}>هیچ‌کدام</button>
              </span>
            </div>
            {programNames.length === 0 ? (
              <div className="item-line empty">هنوز برنامه‌ای ثبت نکردی.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {programNames.map((name) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <ToggleSwitch checked={isChecked(name)} onChange={() => onToggleProgram(name)} label={name} />
                    <span className="item-line" style={{ flex: 1, textAlign: "right" }}>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
