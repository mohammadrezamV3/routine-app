"use client";

import { AlertTriangle } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { Spinner } from "./Spinner";
import { tr } from "@/lib/i18n";

// وضعیت ساخت پس‌زمینه‌ی یک رودمپ (lib/roadmapBuilder.ts → meta.build) —
// هم روی کارت لیست، هم بالای صفحه‌ی خود رودمپ. بدون بک‌گراند اضافه:
// فقط متن، آیکون و همان نوار پیشرفت .rp-bar که کارت‌ها دارند.
export type BuildInfo = { status: "building" | "ready" | "failed"; phase?: "outline" | "stages" | "guide"; done?: number; total?: number; error?: string } | null;

const phaseLabel = (): Record<string, string> => ({
  outline: tr("در حال طراحی اسکلت مسیر…", "Designing the path outline…"),
  stages: tr("در حال نوشتن جزئیات مرحله‌ها…", "Writing stage details…"),
  guide: tr("در حال نوشتن راهنمای مسیر…", "Writing the path guide…"),
});

export function RoadmapBuildStatus({ build, compact = false }: { build: BuildInfo; compact?: boolean }) {
  if (!build || build.status === "ready") return null;
  if (build.status === "failed") {
    return (
      <div className={`rp-build is-failed${compact ? " compact" : ""}`}>
        <AlertTriangle size={15} />
        <span>{build.error || tr("ساخت کامل نشد", "The build did not finish")}</span>
      </div>
    );
  }
  const total = build.total || 0;
  const done = build.done || 0;
  const pct = total ? Math.round((done / total) * 100) : 6;
  return (
    <div className={`rp-build${compact ? " compact" : ""}`} role="status" aria-live="polite">
      <div className="rp-build-head">
        <Spinner size={14} />
        <span>{phaseLabel()[build.phase || "outline"]}</span>
        {total > 0 && <b className="rp-build-count">{tr(`${faNum(done)} از ${faNum(total)} مرحله`, `${faNum(done)} of ${faNum(total)} stages`)}</b>}
      </div>
      <div className="rp-bar rp-build-bar"><span style={{ width: `${pct}%` }} /></div>
      {!compact && <p className="rp-build-hint">{tr("لازم نیست این‌جا بمونی — ساخت در پس‌زمینه ادامه داره و هر مرحله که آماده شد همین‌جا اضافه می‌شه.", "You do not need to stay here — the build continues in the background and each stage appears here as soon as it is ready.")}</p>}
    </div>
  );
}
