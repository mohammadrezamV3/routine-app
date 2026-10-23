"use client";

import { TickButton } from "./TickButton";
import {
  AlertTriangle, BookOpen, Check, ChevronLeft, Clock, ChevronRight, ExternalLink, Flag, Hammer, ListChecks,
  Package, RefreshCw, Sparkles, Target, Wrench,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { taskKey, type PlanStage } from "@/lib/roadmapPlan";
import { RoadmapStepToProgram } from "@/components/RoadmapStepToProgram";
import { Spinner } from "./Spinner";
import { tr, pick } from "@/lib/i18n";

// منبعی که مدل لینک قابل اعتماد برایش نداده (سمت سرور فیلتر شده) به یک
// جست‌وجوی واقعی وصل می‌شود، نه یک URL ساختگی.
export function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

const RESOURCE_TYPES: Record<string, { fa: string; en: string }> = {
  article: { fa: "مقاله", en: "Article" }, documentation: { fa: "مستند", en: "Docs" },
  video: { fa: "ویدیو", en: "Video" }, course: { fa: "دوره", en: "Course" },
  lab: { fa: "تمرین", en: "Lab" }, book: { fa: "کتاب", en: "Book" }, tool: { fa: "ابزار", en: "Tool" },
};

/**
 * محتوای کامل مرحله‌ی انتخاب‌شده، داخل یک باکس.
 *
 * فهرست مرحله‌ها در ناوبر کناری (دسکتاپ) یا نوار افقی (موبایل) است و فقط
 * یک مرحله در لحظه نمایش داده می‌شود؛ پایین باکس «مرحله‌ی قبل/بعد».
 */
export function RoadmapStagePanel({
  stage,
  topic,
  phase,
  progress,
  onToggleStage,
  onToggleTask,
  onRegenerate,
  regenerating,
  prev,
  next,
  onGo,
}: {
  stage: PlanStage;
  topic: string;
  /** done = تیک‌خورده، now = مرحله‌ی جاری (اولین تمام‌نشده)، next = بعدی‌ها */
  phase: "done" | "now" | "next";
  progress: Record<string, boolean>;
  onToggleStage: () => void;
  onToggleTask: (i: number) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  prev: PlanStage | null;
  next: PlanStage | null;
  onGo: (n: number) => void;
}) {
  const isDone = !!progress[String(stage.n)];
  const tasksDone = stage.tasks.filter((_, i) => progress[taskKey(stage.n, i)]).length;

  return (
    <article className={`trade-surface rmx-box rmx-sp is-${phase}`}>
      <header className="rmx-sp-head">
        <span className="rmx-sp-badge" aria-hidden="true">
          {isDone ? <Check size={26} strokeWidth={3} /> : faNum(stage.n)}
        </span>
        <div className="rmx-sp-head-main">
          <span className="rmx-stage-eyebrow">
            {tr(`مرحله ${faNum(stage.n)}`, `Stage ${faNum(stage.n)}`)}
            <em className={`rmx-chip-state is-${phase}`}>
              {phase === "done" ? tr("انجام شد", "Done") : phase === "now" ? tr("جاری", "Current") : tr("بعدی", "Upcoming")}
            </em>
          </span>
          <h2>{stage.title}</h2>
          <div className="rmx-stage-sub">
            {stage.duration && <span className="rmx-sub-dur"><Clock size={13} />{stage.duration}</span>}
            {stage.detailed && !!stage.tasks.length && (
              <span className="rmx-sub-prog">
                <span className="rmx-sub-bar" aria-hidden="true"><i style={{ width: `${Math.round((tasksDone / stage.tasks.length) * 100)}%` }} /></span>
                {tr(`${faNum(tasksDone)} از ${faNum(stage.tasks.length)} کار`, `${faNum(tasksDone)} of ${faNum(stage.tasks.length)} tasks`)}
              </span>
            )}
            {!stage.detailed && <span className="rmx-pending">{tr("جزئیات ساخته نشده", "Details not built yet")}</span>}
          </div>
        </div>
        <label className="rmx-sp-done">
          <span className="rmx-sp-done-text">{isDone ? tr("تمام شده", "Completed") : tr("این مرحله تمام شد", "Mark stage done")}</span>
          <TickButton
            size={30}
            checked={isDone}
            onToggle={onToggleStage}
            label={isDone ? tr("برگرداندن به انجام‌نشده", "Mark as not done") : tr("این مرحله تمام شد", "This stage is done")}
          />
        </label>
      </header>

      <div className="rmx-sp-body">
        <div className="rmx-sp-cols">
          <div className="rmx-sp-main">
            {stage.goal && (
              <div className="rmx-goal"><Target size={14} /><span>{stage.goal}</span></div>
            )}
            {stage.why && <p className="rmx-why">{stage.why}</p>}

            {!stage.detailed ? (
              <div className="rmx-pending-box">
                {stage.focus && <p>{stage.focus}</p>}
                <button type="button" className={`btn btn-primary btn-sm${regenerating ? " is-loading" : ""}`} onClick={onRegenerate} disabled={regenerating} aria-busy={regenerating}>
                  <Sparkles size={15} /> {tr("ساخت جزئیات این مرحله", "Build this stage's details")}
                  {regenerating && <Spinner className="btn-spinner" size={16} label={null} />}
                </button>
              </div>
            ) : (
              <>
                {!!stage.prerequisites.length && (
                  <Section icon={<Flag size={14} />} title={tr("قبل از شروع باید بلد باشی", "What you should know first")}>
                    <div className="rmx-tags">
                      {stage.prerequisites.map((p, i) => <span key={i} className="rmx-tag">{p}</span>)}
                    </div>
                  </Section>
                )}

                {!!stage.topics.length && (
                  <Section icon={<BookOpen size={14} />} title={tr("چی یاد بگیری — به همین ترتیب", "What to learn — in this order")}>
                    <ol className="rmx-topics">
                      {stage.topics.map((t, i) => (
                        <li key={i}>
                          <div className="rmx-topic-title">{t.title}</div>
                          {t.detail && <p className="rmx-topic-detail">{t.detail}</p>}
                          {!!t.points.length && (
                            <ul className="rmx-points">
                              {t.points.map((p, j) => <li key={j}>{p}</li>)}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}

                {!!stage.tasks.length && (
                  <Section icon={<Hammer size={14} />} title={tr("کارهای عملی", "Practical tasks")}>
                    <ul className="rmx-tasks">
                      {stage.tasks.map((t, i) => {
                        const checked = !!progress[taskKey(stage.n, i)];
                        return (
                          <li key={i} className={checked ? "checked" : ""}>
                            <TickButton size={22} checked={checked} onToggle={() => onToggleTask(i)} label={checked ? tr("برداشتن تیک", "Untick") : tr("انجام شد", "Done")} />
                            <div className="rmx-task-body">
                              <div className="rmx-task-title">{t.title}</div>
                              {t.detail && <p>{t.detail}</p>}
                              {t.output && <div className="rmx-task-output"><b>{tr("تحویل:", "Deliverable:")}</b> {t.output}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Section>
                )}

                {stage.project && (
                  <div className="rmx-project">
                    <div className="rmx-project-label"><Package size={14} /> {tr("پروژه‌ی جمع‌بندی", "Capstone project")}</div>
                    <div className="rmx-project-title">{stage.project.title}</div>
                    {stage.project.brief && <p>{stage.project.brief}</p>}
                    {!!stage.project.deliverables.length && (
                      <ul className="rmx-points">
                        {stage.project.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {stage.detailed && (
            <div className="rmx-sec-grid rmx-sp-aside">
              {!!stage.tools.length && (
                <Section icon={<Wrench size={14} />} title={tr("ابزارها", "Tools")}>
                  <ul className="rmx-tools">
                    {stage.tools.map((t, i) => (
                      <li key={i}>
                        <a href={searchUrl(t.name, topic)} target="_blank" rel="noopener noreferrer" className="rmx-tool-name">
                          {t.name}
                        </a>
                        {t.use && <span>{t.use}</span>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {!!stage.resources.length && (
                <Section icon={<BookOpen size={14} />} title={tr("منابع", "Resources")}>
                  <ul className="rmx-resources">
                    {stage.resources.map((r, i) => (
                      <li key={i}>
                        <span className="rmx-res-type">{RESOURCE_TYPES[r.type] ? pick(RESOURCE_TYPES[r.type]) : r.type === "منبع" ? tr("منبع", "Resource") : r.type}</span>
                        <div className="rmx-res-body">
                          {/* لینک مستقیم فقط برای دامنه‌های شناخته‌شده (sanitizeUrl)؛ بقیه جست‌وجو. */}
                          <a href={r.url || searchUrl(r.title, topic)} target="_blank" rel="noopener noreferrer">
                            {r.title}<ExternalLink size={11} />
                          </a>
                          {r.source && <span className="rmx-res-source">{r.source}</span>}
                          {r.why && <p>{r.why}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {!!stage.pitfalls.length && (
                <Section icon={<AlertTriangle size={14} />} title={tr("اشتباه‌های رایج", "Common mistakes")} tone="warn">
                  <ul className="rmx-points warn">
                    {stage.pitfalls.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </Section>
              )}

              {!!stage.done.length && (
                <Section icon={<ListChecks size={14} />} title={tr("کی این مرحله تمومه؟", "When is this stage done?")}>
                  <ul className="rmx-done">
                    {stage.done.map((d, i) => <li key={i}><Check size={13} /><span>{d}</span></li>)}
                  </ul>
                </Section>
              )}
            </div>
          )}
        </div>

        <div className="rmx-stage-actions">
          {stage.detailed && (
            <button
              type="button"
              className={`btn btn-ghost btn-sm${regenerating ? " is-loading" : ""}`}
              onClick={onRegenerate}
              disabled={regenerating}
              aria-busy={regenerating}
              title={tr("جزئیات این مرحله را دوباره بساز", "Rebuild this stage's details")}
            >
              <RefreshCw size={15} /> {tr("ساخت دوباره", "Rebuild")}
              {regenerating && <Spinner className="btn-spinner" size={16} label={null} />}
            </button>
          )}
        </div>
        <RoadmapStepToProgram title={stage.title} topic={topic} />
      </div>

      <footer className="rmx-sp-foot">
        {prev ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onGo(prev.n)}>
            <ChevronRight size={16} className="dir-flip" /> {tr("مرحله‌ی قبل", "Previous stage")}
          </button>
        ) : <span />}
        {next ? (
          <button type="button" className="btn btn-tonal btn-sm" onClick={() => onGo(next.n)}>
            {tr("مرحله‌ی بعد", "Next stage")} <ChevronLeft size={16} className="dir-flip" />
          </button>
        ) : <span />}
      </footer>
    </article>
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
    <div className={`rmx-sec${tone ? ` ${tone}` : ""}`}>
      <div className="rmx-sec-title">{icon}{title}</div>
      {children}
    </div>
  );
}
