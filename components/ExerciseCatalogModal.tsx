"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { EXERCISE_CATALOG, ExerciseCatalogEntry } from "@/lib/exerciseCatalog";
import { normalizeFa } from "@/lib/utils";

// «مشاهده حرکات» — کاتالوگِ کاملِ حرکاتِ بدنسازی؛ کلیک روی هرکدوم نحوه‌ی
// انجام، عضلاتِ درگیر و مزایاش رو نشون می‌ده. جستجو با normalizeFa (همون
// نرمالایزرِ فیلترِ برنامه‌های روتین) تا کیبوردِ عربی/فارسی فرقی نکنه.
export function ExerciseCatalogModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ExerciseCatalogEntry | null>(null);

  const normalizedQuery = normalizeFa(query);
  const visible = EXERCISE_CATALOG.filter((e) => !normalizedQuery || normalizeFa(e.name).includes(normalizedQuery));

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel dash-scope open">
        <div className="modal-head">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-[13px] font-semibold text-dash-green"
            >
              <ChevronRight size={16} />
              بازگشت
            </button>
          ) : (
            <div className="modal-title">مشاهده حرکات</div>
          )}
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>

        <div className="modal-body">
          {selected ? (
            <div>
              <h3 className="text-[16px] font-bold text-dash-text sm:text-[18px]">{selected.name}</h3>

              <div className="tm-extra" style={{ marginTop: 12 }}>
                <div className="domain-sub">عضلاتِ درگیر</div>
                <div className="item-line">{selected.muscleGroup}</div>
              </div>

              <div className="tm-extra">
                <div className="domain-sub">نحوه‌ی انجام</div>
                <ol style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, paddingRight: 18 }}>
                  {selected.howTo.map((step, i) => (
                    <li key={i} className="item-line" style={{ listStyle: "decimal" }}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="tm-extra">
                <div className="domain-sub">مزایا</div>
                <div className="item-line">{selected.benefits}</div>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="text"
                dir="auto"
                className="wsearch-newform-name trade-glass-field pill-glass-field"
                placeholder="جستجوی حرکت…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {visible.length === 0 ? (
                  <div className="item-line empty">حرکتی پیدا نشد.</div>
                ) : (
                  visible.map((e) => (
                    <div
                      key={e.name}
                      onClick={() => setSelected(e)}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-dash-border bg-white/[0.02] px-3.5 py-3 text-right transition hover:border-white/10"
                    >
                      <span className="text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{e.name}</span>
                      <span className="shrink-0 text-[10.5px] text-dash-muted sm:text-[11.5px]">{e.muscleGroup}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
