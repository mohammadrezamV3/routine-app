"use client";

import {
  AlertTriangle, BookOpen, Check, ChevronDown, ExternalLink, Flag, Hammer, ListChecks,
  Loader2, Package, RefreshCw, Sparkles, Target, Wrench,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { taskKey, type PlanStage } from "@/lib/roadmapPlan";
import { RoadmapStepToProgram } from "@/components/RoadmapStepToProgram";

// منبعی که مدل لینکِ قابلِ اعتماد برایش نداده (سمتِ سرور فیلتر شده) به یک
// جست‌وجوی واقعی وصل می‌شود، نه یک URLِ ساختگی.
export function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

const RESOURCE_TYPES: Record<string, string> = {
  article: "مقاله", documentation: "مستند", video: "ویدیو", course: "دوره",
  lab: "تمرین", book: "کتاب", tool: "ابزار",
};

/**
 * یک مرحله در تایم‌لاینِ مسیر — آکاردئونی.
 *
 * سربرگ همیشه دیده می‌شود (شماره/تیک، عنوان، مدت، پیشرفتِ کارها)؛ بدنه فقط
 * وقتی باز است. عمداً نه یک صفحه‌ی جدا: کاربر باید جای خودش در کلِ مسیر
 * را ببیند، و ۱۰+ مرحله‌ی کاملاً باز یک صفحه‌ی بی‌انتها می‌ساخت.
 */
export function RoadmapStageCard({
  stage,
  topic,
  open,
  onToggleOpen,
  progress,
  onToggleStage,
  onToggleTask,
  onRegenerate,
  regenerating,
}: {
  stage: PlanStage;
  topic: string;
  open: boolean;
  onToggleOpen: () => void;
  progress: Record<string, boolean>;
  onToggleStage: () => void;
  onToggleTask: (i: number) => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const isDone = !!progress[String(stage.n)];
  const tasksDone = stage.tasks.filter((_, i) => progress[taskKey(stage.n, i)]).length;

  return (
    <li id={`stage-${stage.n}`} className={`rp-stage${isDone ? " done" : ""}${open ? " open" : ""}`}>
      <button
        type="button"
        className="rp-stage-num"
        onClick={onToggleStage}
        aria-label={isDone ? "برگرداندن به انجام‌نشده" : "این مرحله تمام شد"}
      >
        {isDone ? <Check size={15} /> : faNum(stage.n)}
      </button>

      <div className="trade-surface rp-stage-card">
        <button type="button" className="rp-stage-head" onClick={onToggleOpen} aria-expanded={open}>
          <div className="rp-stage-head-main">
            <h3>{stage.title}</h3>
            <div className="rp-stage-sub">
              {stage.duration && <span>{stage.duration}</span>}
              {stage.detailed && !!stage.tasks.length && (
                <span>{faNum(tasksDone)} از {faNum(stage.tasks.length)} کار</span>
              )}
              {!stage.detailed && <span className="rp-pending">جزئیات ساخته نشده</span>}
            </div>
          </div>
          <ChevronDown size={18} className="rp-stage-chevron" />
        </button>

        {open && (
          <div className="rp-stage-body">
            {stage.goal && (
              <div className="rp-goal"><Target size={14} /><span>{stage.goal}</span></div>
            )}
            {stage.why && <p className="rp-why">{stage.why}</p>}

            {!stage.detailed ? (
              <div className="rp-pending-box">
                {stage.focus && <p>{stage.focus}</p>}
                <button type="button" className="trade-primary-btn" onClick={onRegenerate} disabled={regenerating}>
                  {regenerating ? <Loader2 size={14} className="trade-spin" /> : <Sparkles size={14} />}
                  {regenerating ? "در حال ساخت…" : "ساختِ جزئیاتِ این مرحله"}
                </button>
              </div>
            ) : (
              <>
                {!!stage.prerequisites.length && (
                  <Section icon={<Flag size={14} />} title="قبل از شروع باید بلد باشی">
                    <div className="rp-tags">
                      {stage.prerequisites.map((p, i) => <span key={i} className="rp-tag">{p}</span>)}
                    </div>
                  </Section>
                )}

                {!!stage.topics.length && (
                  <Section icon={<BookOpen size={14} />} title="چی یاد بگیری — به همین ترتیب">
                    <ol className="rp-topics">
                      {stage.topics.map((t, i) => (
                        <li key={i}>
                          <div className="rp-topic-title">{t.title}</div>
                          {t.detail && <p className="rp-topic-detail">{t.detail}</p>}
                          {!!t.points.length && (
                            <ul className="rp-points">
                              {t.points.map((p, j) => <li key={j}>{p}</li>)}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}

                {!!stage.tasks.length && (
                  <Section icon={<Hammer size={14} />} title="کارهای عملی">
                    <ul className="rp-tasks">
                      {stage.tasks.map((t, i) => {
                        const checked = !!progress[taskKey(stage.n, i)];
                        return (
                          <li key={i} className={checked ? "checked" : ""}>
                            <button
                              type="button"
                              className="rp-check"
                              onClick={() => onToggleTask(i)}
                              aria-label={checked ? "برداشتنِ تیک" : "انجام شد"}
                              aria-pressed={checked}
                            >
                              {checked && <Check size={12} />}
                            </button>
                            <div className="rp-task-body">
                              <div className="rp-task-title">{t.title}</div>
                              {t.detail && <p>{t.detail}</p>}
                              {t.output && <div className="rp-task-output"><b>تحویل:</b> {t.output}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Section>
                )}

                {stage.project && (
                  <div className="rp-project">
                    <div className="rp-project-label"><Package size={14} /> پروژه‌ی جمع‌بندی</div>
                    <div className="rp-project-title">{stage.project.title}</div>
                    {stage.project.brief && <p>{stage.project.brief}</p>}
                    {!!stage.project.deliverables.length && (
                      <ul className="rp-points">
                        {stage.project.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {!!stage.tools.length && (
                  <Section icon={<Wrench size={14} />} title="ابزارها">
                    <ul className="rp-tools">
                      {stage.tools.map((t, i) => (
                        <li key={i}>
                          <a href={searchUrl(t.name, topic)} target="_blank" rel="noopener noreferrer" className="rp-tool-name">
                            {t.name}
                          </a>
                          {t.use && <span>{t.use}</span>}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {!!stage.resources.length && (
                  <Section icon={<BookOpen size={14} />} title="منابع">
                    <ul className="rp-resources">
                      {stage.resources.map((r, i) => (
                        <li key={i}>
                          <span className="rp-res-type">{RESOURCE_TYPES[r.type] || r.type}</span>
                          <div className="rp-res-body">
                            {/* لینکِ مستقیم فقط برای دامنه‌های شناخته‌شده (sanitizeUrl)؛ بقیه جست‌وجو. */}
                            <a href={r.url || searchUrl(r.title, topic)} target="_blank" rel="noopener noreferrer">
                              {r.title}<ExternalLink size={11} />
                            </a>
                            {r.source && <span className="rp-res-source">{r.source}</span>}
                            {r.why && <p>{r.why}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {!!stage.pitfalls.length && (
                  <Section icon={<AlertTriangle size={14} />} title="اشتباه‌های رایج" tone="warn">
                    <ul className="rp-points warn">
                      {stage.pitfalls.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </Section>
                )}

                {!!stage.done.length && (
                  <Section icon={<ListChecks size={14} />} title="کی این مرحله تمومه؟">
                    <ul className="rp-done">
                      {stage.done.map((d, i) => <li key={i}><Check size={13} /><span>{d}</span></li>)}
                    </ul>
                  </Section>
                )}
              </>
            )}

            <div className="rp-stage-actions">
              <button type="button" className={`rp-ghost-btn${isDone ? " on" : ""}`} onClick={onToggleStage}>
                <Check size={14} /> {isDone ? "تمام شده" : "این مرحله تمام شد"}
              </button>
              {stage.detailed && (
                <button
                  type="button"
                  className="rp-ghost-btn"
                  onClick={onRegenerate}
                  disabled={regenerating}
                  title="جزئیاتِ این مرحله را دوباره بساز"
                >
                  {regenerating ? <Loader2 size={14} className="trade-spin" /> : <RefreshCw size={14} />}
                  {regenerating ? "در حال ساخت…" : "ساختِ دوباره"}
                </button>
              )}
            </div>
            <RoadmapStepToProgram title={stage.title} topic={topic} />
          </div>
        )}
      </div>
    </li>
  );
}

function Section({
  icon, title, tone, children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <div className={`rp-sec${tone ? ` ${tone}` : ""}`}>
      <div className="rp-sec-title">{icon}{title}</div>
      {children}
    </div>
  );
}
