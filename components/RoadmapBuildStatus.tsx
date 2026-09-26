"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { faNum } from "@/lib/jalali";

// وضعیتِ ساختِ پس‌زمینه‌ی یک رودمپ (lib/roadmapBuilder.ts → meta.build) —
// هم روی کارتِ لیست، هم بالای صفحه‌ی خودِ رودمپ. بدونِ بک‌گراندِ اضافه:
// فقط متن، آیکون و همان نوارِ پیشرفتِ .rp-bar که کارت‌ها دارند.
export type BuildInfo = { status: "building" | "ready" | "failed"; phase?: "outline" | "stages" | "guide"; done?: number; total?: number; error?: string } | null;

const PHASE_LABEL: Record<string, string> = {
  outline: "در حال طراحیِ اسکلتِ مسیر…",
  stages: "در حال نوشتنِ جزئیاتِ مرحله‌ها…",
  guide: "در حال نوشتنِ راهنمای مسیر…",
};

export function RoadmapBuildStatus({ build, compact = false }: { build: BuildInfo; compact?: boolean }) {
  if (!build || build.status === "ready") return null;
  if (build.status === "failed") {
    return (
      <div className={`rp-build is-failed${compact ? " compact" : ""}`}>
        <AlertTriangle size={15} />
        <span>{build.error || "ساخت کامل نشد"}</span>
      </div>
    );
  }
  const total = build.total || 0;
  const done = build.done || 0;
  const pct = total ? Math.round((done / total) * 100) : 6;
  return (
    <div className={`rp-build${compact ? " compact" : ""}`} role="status" aria-live="polite">
      <div className="rp-build-head">
        <Loader2 size={15} className="trade-spin" />
        <span>{PHASE_LABEL[build.phase || "outline"]}</span>
        {total > 0 && <b className="rp-build-count">{faNum(done)} از {faNum(total)} مرحله</b>}
      </div>
      <div className="rp-bar rp-build-bar"><span style={{ width: `${pct}%` }} /></div>
      {!compact && <p className="rp-build-hint">لازم نیست این‌جا بمونی — ساخت در پس‌زمینه ادامه داره و هر مرحله که آماده شد همین‌جا اضافه می‌شه.</p>}
    </div>
  );
}
