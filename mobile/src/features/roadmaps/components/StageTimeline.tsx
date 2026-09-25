import { Check, Clock, Target } from "lucide-react";
import { tapHaptic } from "@/lib/haptics";
import type { RoadmapStage, RoadmapStepProgress } from "@/lib/api-contract";

function faDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/**
 * تایم‌لاینِ عمودیِ مرحله‌ها — پورتِ حسِ `rm-steps` وب به موبایل: هر مرحله
 * یک دایره‌ی شماره/تیک دارد و یک خطِ عمودی بین‌شان. تیک‌زدن کاملاً آفلاین
 * و فوری است (هپتیک + optimistic از طریق onToggle که والد را re-render می‌کند).
 */
export default function StageTimeline({
  stages,
  stepProgress,
  onToggle,
}: {
  stages: RoadmapStage[];
  stepProgress: RoadmapStepProgress;
  onToggle: (stageN: number) => void;
}) {
  return (
    <ol>
      {stages.map((st, idx) => {
        const isDone = !!stepProgress[String(st.n)];
        const isLast = idx === stages.length - 1;
        return (
          <li key={st.n} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                onClick={() => {
                  void tapHaptic();
                  onToggle(st.n);
                }}
                aria-label={isDone ? "برگرداندن به انجام‌نشده" : "این مرحله انجام شد"}
                className="flex shrink-0 items-center justify-center rounded-full font-vazir text-[13px] font-semibold transition-colors"
                style={{
                  width: 30,
                  height: 30,
                  background: isDone ? "var(--accent)" : "var(--surface-2)",
                  border: isDone ? "none" : "1px solid var(--surface-line)",
                  color: isDone ? "white" : "var(--muted)",
                }}
              >
                {isDone ? <Check size={15} /> : faDigits(st.n)}
              </button>
              {!isLast && <div style={{ width: 2, flex: 1, minHeight: 24, background: "var(--surface-line)" }} />}
            </div>

            <div className="min-w-0 flex-1 pb-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-vazir text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
                  {st.title}
                </h3>
                {st.duration && (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-vazir text-[11px]"
                    style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                  >
                    <Clock size={10} />
                    {st.duration}
                  </span>
                )}
              </div>

              {st.goal && (
                <div className="mt-1 flex items-start gap-1 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                  <Target size={12} className="mt-0.5 shrink-0" />
                  <span>{st.goal}</span>
                </div>
              )}

              {!!st.learn.length && (
                <div className="mt-2">
                  <div className="font-vazir text-[11.5px] font-semibold" style={{ color: "var(--muted)" }}>
                    چی یاد بگیر
                  </div>
                  <ul className="mt-1 list-inside list-disc font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                    {st.learn.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!!st.do.length && (
                <div className="mt-2">
                  <div className="font-vazir text-[11.5px] font-semibold" style={{ color: "var(--muted)" }}>
                    چیکار کن
                  </div>
                  <ol className="mt-1 list-inside list-decimal font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                    {st.do.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ol>
                </div>
              )}

              {!!st.tools.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {st.tools.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2 py-0.5 font-vazir text-[11px]"
                      style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
