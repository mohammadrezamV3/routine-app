"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { SegmentedTabs } from "./SegmentedTabs";

type ScanResult = { name: string; estimatedGrams: number; calories: number; proteinG: number; carbsG: number; fatG: number };

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, data] = result.split(",");
      resolve({ data, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// پاپ‌آپ اسکن عکس غذا با هوش مصنوعی — عکس می‌گیره/آپلود می‌شه، تحلیل رو
// نشون می‌ده، کاربر می‌تونه قبل از ثبت نهایی مقادیر رو ویرایش کنه (دقیقاً
// همون الگوی «بازبینی قبل از ذخیره» که رودمپ/برنامه‌ی ورزشی AI هم دارن).
export function CalorieAiScanModal({
  date,
  mealTypes,
  onClose,
  onLogged,
}: {
  date: string;
  mealTypes: { key: string; label: string }[];
  onClose: () => void;
  onLogged: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [mealType, setMealType] = useState(mealTypes[0]?.key ?? "lunch");
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const { data, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/calorie/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: data, mediaType }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "خطا در تحلیل عکس"); return; }
      if (json.result.recognized === false) { setError(json.result.message); return; }
      setResult(json.result);
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirmLog() {
    if (!result) return;
    setSaving(true);
    const res = await fetch("/api/calorie/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        customName: result.name,
        customCalories: Math.round(result.calories),
        grams: result.estimatedGrams,
        mealType,
        proteinG: result.proteinG,
        carbsG: result.carbsG,
        fatG: result.fatG,
        aiScanned: true,
      }),
    });
    setSaving(false);
    if (res.ok) { onLogged(); onClose(); }
  }

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel liquid-glass-panel dash-scope open">
        <div className="modal-head">
          <div className="modal-title">اسکن غذا با هوش مصنوعی</div>
          <button className="nav-close" onClick={onClose} aria-label="بستن">×</button>
        </div>
        <div className="modal-body">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {!preview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed py-10 text-[12.5px] font-semibold text-dash-muted"
              style={{ borderColor: "var(--line)" }}
            >
              <Camera className="h-7 w-7 text-dash-green" />
              عکس بگیر یا از گالری انتخاب کن
            </button>
          )}

          {preview && (
            <div className="overflow-hidden rounded-2xl border border-dash-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="block max-h-[220px] w-full object-cover" />
            </div>
          )}

          {analyzing && (
            <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-dash-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال تحلیل عکس…
            </div>
          )}

          {error && !analyzing && (
            <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{error}</div>
          )}

          {result && !analyzing && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-dash-text">
                <Sparkles className="h-4 w-4 text-dash-green" />
                {result.name}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: "کالری", value: faNum(Math.round(result.calories)) },
                  { label: "پروتئین (گرم)", value: faNum(Math.round(result.proteinG)) },
                  { label: "کربوهیدرات (گرم)", value: faNum(Math.round(result.carbsG)) },
                  { label: "چربی (گرم)", value: faNum(Math.round(result.fatG)) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-dash-border bg-white/[0.02] px-2.5 py-2 text-center">
                    <div className="mono text-[13px] font-bold text-dash-text">{s.value}</div>
                    <div className="mt-0.5 text-[9px] text-dash-muted">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10.5px] text-dash-muted">وزن تخمینی: {faNum(Math.round(result.estimatedGrams))} گرم — این یک تخمین بصریه، نه اندازه‌گیری دقیق.</div>

              <SegmentedTabs active={mealType} onChange={setMealType} options={mealTypes.map((m) => ({ value: m.key, label: m.label }))} />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setResult(null); setPreview(null); setError(null); }}
                  className="flex-1 rounded-2xl border py-2.5 text-[12px] font-semibold text-dash-muted"
                  style={{ borderColor: "var(--line)" }}
                >
                  عکس دیگه
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmLog}
                  className="flex-[2] rounded-2xl border py-2.5 text-[12.5px] font-bold disabled:opacity-40"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  {saving ? "در حال ثبت…" : "ثبت غذا"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
