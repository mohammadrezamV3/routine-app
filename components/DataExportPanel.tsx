"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { AccountBlock } from "@/components/AccountUI";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { Spinner } from "@/components/Spinner";
import { useSection } from "@/components/SectionProvider";
import { OnlineOnly } from "@/components/OnlineOnly";
import { activeModulesOf, getAccount } from "@/lib/accountCache";
import { useFeatures } from "@/lib/useFeatures";
import { downloadExport } from "@/lib/export/download";
import { EXPORT_META, EXPORT_MODULES, exportModuleLabel, type ExportFormat, type ExportTarget } from "@/lib/export/modules";
import { tr } from "@/lib/i18n";

// «خروجی گرفتن از داده‌ها» — فقط ماژول‌هایی که کاربر بهشون دسترسی داره و در
// بخش فعلی (زیردامنه) هستن + «همه‌ی داده‌ها» (JSON) همه‌جا. گیت واقعی سمت
// سرور در /api/export ـه؛ این‌جا فقط UI رو جمع‌وجور نگه می‌داره.
export function DataExportPanel() {
  const section = useSection();
  const features = useFeatures();
  const [active, setActive] = useState<Set<string> | null>(null);
  const [target, setTarget] = useState<ExportTarget | null>(null);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    getAccount().then((d) => { if (alive) setActive(activeModulesOf(d)); }).catch(() => { if (alive) setActive(new Set()); });
    return () => { alive = false; };
  }, []);

  const options = useMemo(() => {
    if (!active || !features) return null;
    const list: ExportTarget[] = EXPORT_MODULES.filter((m) => {
      const meta = EXPORT_META[m];
      if (section && !meta.sections.includes(section)) return false;
      if (!features[meta.feature]) return false;
      return !meta.moduleKey || active.has(meta.moduleKey);
    });
    return [...list, "all" as const];
  }, [active, features, section]);

  const current: ExportTarget | null = target && options?.includes(target) ? target : options?.[0] ?? null;
  const fmt: ExportFormat = current === "all" ? "json" : format;

  async function run() {
    if (!current || busy) return;
    setBusy(true); setError(null); setDone(false);
    const err = await downloadExport({ module: current, format: fmt, from: from || undefined, to: to || undefined });
    setBusy(false);
    if (err) setError(err); else setDone(true);
  }

  if (!options || !current) {
    return <AccountBlock icon={<Download size={17} />} title={tr("خروجی گرفتن از داده‌ها", "Export your data")}><span className="ap-skel" style={{ width: "100%", height: 44 }} /></AccountBlock>;
  }

  return (
    <AccountBlock icon={<Download size={17} />} title={tr("خروجی گرفتن از داده‌ها", "Export your data")}>
      <div className="ap-field-stack">
        <SegmentedTabs
          ariaLabel={tr("داده‌ی مورد نظر", "Data to export")}
          active={current}
          onChange={(v) => { setTarget(v); setDone(false); setError(null); }}
          options={options.map((m) => ({ value: m, label: exportModuleLabel(m) }))}
        />
        {current !== "all" && (
          <SegmentedTabs
            ariaLabel={tr("قالب فایل", "File format")}
            active={fmt}
            onChange={(v) => { setFormat(v); setDone(false); }}
            options={[{ value: "csv", label: "CSV" }, { value: "json", label: "JSON" }]}
          />
        )}
        <div className="ap-field-grid">
          <label className="ap-export-field">
            <span className="ap-field-note">{tr("از تاریخ (اختیاری)", "From (optional)")}</span>
            <input type="date" dir="ltr" className="wsearch-newform-name" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="ap-export-field">
            <span className="ap-field-note">{tr("تا تاریخ (اختیاری)", "To (optional)")}</span>
            <input type="date" dir="ltr" className="wsearch-newform-name" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>
      <OnlineOnly feature="export">
        <div className="ap-savebar">
          {error && <div className="field-error-msg" role="alert" style={{ display: "block" }}>{error}</div>}
          <button type="button" className={`btn btn-primary ap-save-btn${busy ? " is-loading" : ""}`} onClick={run} disabled={busy} aria-busy={busy || undefined}>
            {busy && <Spinner className="btn-spinner" size={16} label={null} />}
            {tr("دانلود", "Download")}
          </button>
        </div>
      </OnlineOnly>
      {done && <span className="sr-only" role="status">{tr("فایل آماده شد", "File is ready")}</span>}
    </AccountBlock>
  );
}
