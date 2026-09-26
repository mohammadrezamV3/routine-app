import type { ReactNode } from "react";
import {
  AlertTriangle, BookOpen, Check, ChevronDown, Clock, Flag, Hammer, ListChecks, Loader2, Package,
  RefreshCw, Sparkles, Target, Wrench,
} from "lucide-react";
import { tapHaptic } from "@/lib/haptics";
import type { RoadmapStage, RoadmapStepProgress } from "@/lib/api-contract";
import { taskKey } from "../repo";

function faDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

const RESOURCE_TYPES: Record<string, string> = {
  article: "مقاله", documentation: "مستند", video: "ویدیو", course: "دوره",
  lab: "تمرین", book: "کتاب", tool: "ابزار",
};

/**
 * تایم‌لاینِ عمودیِ مرحله‌ها — هم‌ارزِ RoadmapStageCardِ وب: هر مرحله یک
 * دایره‌ی شماره/تیک دارد و یک کارتِ آکاردئونی (سرفصل‌ها، کارهای عملی با
 * تیکِ جدا، پروژه، ابزار، منابع، اشتباه‌های رایج، معیارِ اتمام). مرحله‌ای
 * که جزئیاتش در ساختِ اول نرسید (`detailed:false`) دکمه‌ی «ساختِ جزئیات»
 * دارد. تیک‌زدن کاملاً آفلاین و فوری است؛ ساختِ دوباره اینترنت می‌خواهد.
 */
export default function StageTimeline({
  stages,
  stepProgress,
  onToggle,
  onToggleTask,
  onRegenerate,
  regeneratingN,
  canRegenerate,
  openStages,
  onToggleOpen,
}: {
  stages: RoadmapStage[];
  stepProgress: RoadmapStepProgress;
  onToggle: (stageN: number) => void;
  onToggleTask: (stageN: number, taskIndex: number) => void;
  onRegenerate: (stageN: number) => void;
  /** شماره‌ی مرحله‌ای که الان در حالِ ساخت است */
  regeneratingN: number | null;
  /** آنلاین و بیکار — وگرنه دکمه‌های ساخت غیرفعال‌اند */
  canRegenerate: boolean;
  openStages: Set<number>;
  onToggleOpen: (stageN: number) => void;
}) {
  return (
    <ol>
      {stages.map((st, idx) => {
        const isDone = !!stepProgress[String(st.n)];
        const isLast = idx === stages.length - 1;
        const open = openStages.has(st.n);
        const tasksDone = st.tasks.filter((_, i) => stepProgress[taskKey(st.n, i)]).length;
        const regenerating = regeneratingN === st.n;
        return (
          <li key={st.n} id={`stage-${st.n}`} className="flex gap-3">
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
              <button
                type="button"
                onClick={() => onToggleOpen(st.n)}
                aria-expanded={open}
                className="flex w-full items-start justify-between gap-2 text-start"
              >
                <div className="min-w-0">
                  <h3 className="font-vazir text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
                    {st.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                    {st.duration && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {st.duration}
                      </span>
                    )}
                    {st.detailed && !!st.tasks.length && (
                      <span>
                        {faDigits(tasksDone)} از {faDigits(st.tasks.length)} کار
                      </span>
                    )}
                    {!st.detailed && <span style={{ color: "var(--pnl-loss)" }}>جزئیات ساخته نشده</span>}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className="mt-0.5 shrink-0 transition-transform"
                  style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : undefined }}
                />
              </button>

              {open && (
                <div className="mt-2">
                  {st.goal && (
                    <div className="flex items-start gap-1 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                      <Target size={12} className="mt-0.5 shrink-0" />
                      <span>{st.goal}</span>
                    </div>
                  )}
                  {st.why && (
                    <p className="mt-1.5 font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                      {st.why}
                    </p>
                  )}

                  {!st.detailed ? (
                    <div className="mt-2">
                      {st.focus && (
                        <p className="font-vazir text-[13px] leading-6" style={{ color: "var(--text)" }}>
                          {st.focus}
                        </p>
                      )}
                      <OutlineButton
                        onClick={() => onRegenerate(st.n)}
                        disabled={!canRegenerate || regeneratingN !== null}
                        icon={regenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        label={regenerating ? "در حال ساخت…" : "ساختِ جزئیاتِ این مرحله"}
                      />
                    </div>
                  ) : (
                    <>
                      {!!st.prerequisites.length && (
                        <Section icon={<Flag size={13} />} title="قبل از شروع باید بلد باشی">
                          <Tags items={st.prerequisites} />
                        </Section>
                      )}

                      {!!st.topics.length && (
                        <Section icon={<BookOpen size={13} />} title="چی یاد بگیری — به همین ترتیب">
                          <ol className="list-inside list-decimal">
                            {st.topics.map((t, i) => (
                              <li key={i} className="mt-1.5 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                                <span className="font-semibold">{t.title}</span>
                                {t.detail && (
                                  <p className="mt-0.5 font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                                    {t.detail}
                                  </p>
                                )}
                                {!!t.points.length && <Bullets items={t.points} />}
                              </li>
                            ))}
                          </ol>
                        </Section>
                      )}

                      {!!st.tasks.length && (
                        <Section icon={<Hammer size={13} />} title="کارهای عملی">
                          <ul>
                            {st.tasks.map((t, i) => {
                              const checked = !!stepProgress[taskKey(st.n, i)];
                              return (
                                <li key={i} className="mt-2 flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void tapHaptic();
                                      onToggleTask(st.n, i);
                                    }}
                                    aria-label={checked ? "برداشتنِ تیک" : "انجام شد"}
                                    aria-pressed={checked}
                                    className="mt-0.5 flex shrink-0 items-center justify-center rounded-md"
                                    style={{
                                      width: 20,
                                      height: 20,
                                      background: checked ? "var(--accent)" : "transparent",
                                      border: checked ? "none" : "1.5px solid var(--surface-line)",
                                      color: "white",
                                    }}
                                  >
                                    {checked && <Check size={12} />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <div
                                      className="font-vazir text-[13px] font-semibold"
                                      style={{ color: "var(--text)", textDecoration: checked ? "line-through" : undefined }}
                                    >
                                      {t.title}
                                    </div>
                                    {t.detail && (
                                      <p className="mt-0.5 font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                                        {t.detail}
                                      </p>
                                    )}
                                    {t.output && (
                                      <div className="mt-0.5 font-vazir text-[12px]" style={{ color: "var(--text)" }}>
                                        <b>تحویل:</b> {t.output}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </Section>
                      )}

                      {st.project && (
                        <Section icon={<Package size={13} />} title="پروژه‌ی جمع‌بندی">
                          <div className="font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                            {st.project.title}
                          </div>
                          {st.project.brief && (
                            <p className="mt-0.5 font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                              {st.project.brief}
                            </p>
                          )}
                          {!!st.project.deliverables.length && <Bullets items={st.project.deliverables} />}
                        </Section>
                      )}

                      {!!st.tools.length && (
                        <Section icon={<Wrench size={13} />} title="ابزارها">
                          <ul>
                            {st.tools.map((t, i) => (
                              <li key={i} className="mt-1 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                                <b style={{ color: "var(--text)" }}>{t.name}</b>
                                {t.use && <> — {t.use}</>}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {!!st.resources.length && (
                        <Section icon={<BookOpen size={13} />} title="منابع">
                          <ul>
                            {st.resources.map((r, i) => (
                              <li key={i} className="mt-1.5 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                                <span className="me-1.5 text-[11px]">[{RESOURCE_TYPES[r.type] || r.type}]</span>
                                <b style={{ color: "var(--text)" }}>{r.title}</b>
                                {r.source && <span> · {r.source}</span>}
                                {r.why && <p className="mt-0.5 leading-6">{r.why}</p>}
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      {!!st.pitfalls.length && (
                        <Section icon={<AlertTriangle size={13} />} title="اشتباه‌های رایج" warn>
                          <Bullets items={st.pitfalls} />
                        </Section>
                      )}

                      {!!st.done.length && (
                        <Section icon={<ListChecks size={13} />} title="کی این مرحله تمومه؟">
                          <ul>
                            {st.done.map((d, i) => (
                              <li key={i} className="mt-1 flex items-start gap-1.5 font-vazir text-[12.5px]" style={{ color: "var(--text)" }}>
                                <Check size={13} className="mt-0.5 shrink-0" color="var(--accent)" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        </Section>
                      )}

                      <OutlineButton
                        onClick={() => onRegenerate(st.n)}
                        disabled={!canRegenerate || regeneratingN !== null}
                        icon={regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        label={regenerating ? "در حال ساخت…" : "ساختِ دوباره‌ی جزئیات"}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** دکمه‌ی بی‌بک‌گراند (فقط حاشیه) — عمداً ghost، مثلِ rp-ghost-btnِ وب */
function OutlineButton({ onClick, disabled, icon, label }: { onClick: () => void; disabled: boolean; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-vazir text-[12.5px] transition-opacity"
      style={{ background: "transparent", borderColor: "var(--surface-line)", color: "var(--text)", opacity: disabled ? 0.5 : 1 }}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({ icon, title, warn, children }: { icon: ReactNode; title: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className="mt-3">
      <div
        className="flex items-center gap-1.5 font-vazir text-[11.5px] font-semibold"
        style={{ color: warn ? "var(--pnl-loss)" : "var(--muted)" }}
      >
        {icon}
        {title}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-0.5 list-inside list-disc font-vazir text-[12.5px]" style={{ color: "var(--text)" }}>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

export function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((p, i) => (
        <span
          key={i}
          className="rounded-full px-2 py-0.5 font-vazir text-[11px]"
          style={{ background: "var(--surface-2)", color: "var(--muted)" }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}
