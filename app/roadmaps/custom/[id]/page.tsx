"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award, ChevronLeft, ChevronRight, Clock, Flag, Gauge, Layers, Loader2, Sparkles, Target,
  Timer, Trash2, UserRound, Wrench,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { RoadmapStageCard, searchUrl } from "@/components/RoadmapStageCard";
import { LoadingBlock } from "@/components/Spinner";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { hoursLabel, levelLabel, type PlanStage, type RoadmapPlan } from "@/lib/roadmapPlan";

type Detail = {
  roadmap: { id: string; topic: string; goal: string | null; createdAt: string };
  plan: RoadmapPlan;
  stepProgress: Record<string, boolean>;
  progress: { total: number; done: number; pct: number };
};

type Tab = "stages" | "guide" | "overview";

function pctOf(stages: PlanStage[], progress: Record<string, boolean>) {
  const done = stages.filter((s) => progress[String(s.n)]).length;
  return { total: stages.length, done, pct: stages.length ? Math.round((done / stages.length) * 100) : 0 };
}

export default function RoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("stages");
  const [openStages, setOpenStages] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<string | null>(null); // "guide" | "stage-3"
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Detail | null) => {
        setData(d ?? null);
        // اولین مرحله‌ی تمام‌نشده خودش باز می‌شود — همان جایی که کاربر باید ادامه دهد.
        if (d) {
          const next = d.plan.stages.find((s) => !d.stepProgress[String(s.n)]);
          setOpenStages((prev) => (prev.size ? prev : new Set(next ? [next.n] : [])));
        }
      })
      .catch(() => setData(null));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  /**
   * تیک فوراً روی صفحه می‌نشیند و بعد ذخیره می‌شود — نه برعکس؛ اگر ذخیره
   * شکست بخورد، جوابِ سرور حالتِ واقعی را برمی‌گرداند.
   */
  async function saveProgress(key: string, body: { n: number; task?: number; done: boolean }) {
    if (!data) return;
    const optimistic = { ...data.stepProgress };
    if (body.done) optimistic[key] = true;
    else delete optimistic[key];
    setData({ ...data, stepProgress: optimistic, progress: pctOf(data.plan.stages, optimistic) });

    const res = await fetch(`/api/roadmaps/${params.id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) { load(); return; }
    const out = await res.json().catch(() => null);
    if (out) setData((prev) => (prev ? { ...prev, stepProgress: out.stepProgress, progress: out.progress } : prev));
  }

  function toggleStage(st: PlanStage) {
    if (!data) return;
    const key = String(st.n);
    saveProgress(key, { n: st.n, done: !data.stepProgress[key] });
  }

  function toggleTask(st: PlanStage, i: number) {
    if (!data) return;
    const key = `${st.n}.${i + 1}`;
    saveProgress(key, { n: st.n, task: i, done: !data.stepProgress[key] });
  }

  async function regenerate(target: "guide" | "stage", n?: number) {
    if (!data || busy) return;
    const stage = n ? data.plan.stages.find((s) => s.n === n) : undefined;
    // ساختِ دوباره‌ی مرحله‌ای که جزئیات دارد، تیکِ کارهایش را هم می‌برد.
    if (stage?.detailed && !window.confirm("جزئیاتِ این مرحله دوباره ساخته شود؟ تیکِ کارهایش پاک می‌شود.")) return;

    const tag = target === "guide" ? "guide" : `stage-${n}`;
    setBusy(tag);
    setError(null);
    try {
      const res = await fetch(`/api/roadmaps/${params.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, n }),
      });
      const out = await res.json().catch(() => null);
      if (!res.ok) { setError(out?.error || "ساخته نشد — دوباره امتحان کن"); return; }
      setData((prev) => {
        if (!prev) return prev;
        if (target === "guide") return { ...prev, plan: { ...prev.plan, guide: out.guide } };
        const stages = prev.plan.stages.map((s) => (s.n === n ? out.stage : s));
        return {
          ...prev,
          plan: { ...prev.plan, stages },
          stepProgress: out.stepProgress,
          progress: pctOf(stages, out.stepProgress),
        };
      });
    } catch {
      setError("ارتباط با سرور برقرار نشد — دوباره امتحان کن");
    } finally {
      setBusy(null);
    }
  }

  function openStage(n: number) {
    setTab("stages");
    setOpenStages((prev) => new Set(prev).add(n));
    requestAnimationFrame(() =>
      document.getElementById(`stage-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  async function removeRoadmap() {
    await fetch(`/api/roadmaps/${params.id}`, { method: "DELETE" });
    router.push("/roadmaps");
  }

  const guideBlocks = useMemo(() => parseGuide(data?.plan.guide || ""), [data?.plan.guide]);

  if (data === undefined) return <section className="roadmaps-desktop rp-page"><LoadingBlock /></section>;
  if (data === null) {
    return (
      <section className="roadmaps-desktop rp-page">
        <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} /> رودمپ‌ها</Link>
        <div className="trade-empty-state"><p>این مسیر پیدا نشد</p></div>
      </section>
    );
  }

  const { plan, progress, roadmap } = data;
  const nextStage = plan.stages.find((s) => !data.stepProgress[String(s.n)]);
  const pending = plan.stages.filter((s) => !s.detailed).length;
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <section className="roadmaps-desktop rp-page">
      <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} /> رودمپ‌ها</Link>

      <header className="trade-surface rp-hero">
        <div className="rp-hero-top">
          <span className="rp-eyebrow">مسیرِ یادگیری · {roadmap.topic}</span>
          <button type="button" className="trade-icon-btn danger" aria-label="حذف مسیر" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
          </button>
        </div>

        <div className="rp-hero-main">
          <div className="rp-hero-text">
            <h1>{plan.title}</h1>
            {plan.summary && <p>{plan.summary}</p>}
          </div>
          <div className="rp-ring" aria-label={`${progress.pct} درصد`}>
            <svg viewBox="0 0 64 64" aria-hidden>
              <circle cx="32" cy="32" r={R} className="rp-ring-track" />
              <circle
                cx="32" cy="32" r={R} className="rp-ring-fill"
                strokeDasharray={C} strokeDashoffset={C - (C * progress.pct) / 100}
              />
            </svg>
            <div className="rp-ring-text">
              <b>{faNum(progress.pct)}٪</b>
              <span>{faNum(progress.done)}/{faNum(progress.total)}</span>
            </div>
          </div>
        </div>

        {roadmap.goal && (
          <div className="rp-hero-goal"><Target size={14} /><span><b>هدفت:</b> {roadmap.goal}</span></div>
        )}

        <div className="rp-stats">
          {plan.totalDuration && <Stat icon={<Clock size={14} />} label="مدتِ کل" value={plan.totalDuration} />}
          <Stat icon={<Layers size={14} />} label="مرحله" value={faNum(plan.stages.length)} />
          {levelLabel(plan.meta.level) && <Stat icon={<Gauge size={14} />} label="سطحِ شروع" value={levelLabel(plan.meta.level)!} />}
          {hoursLabel(plan.meta.weeklyHours) && <Stat icon={<Timer size={14} />} label="در هفته" value={hoursLabel(plan.meta.weeklyHours)!} />}
        </div>

        {nextStage && (
          <button type="button" className="rp-next" onClick={() => openStage(nextStage.n)}>
            <span className="rp-next-label">قدمِ بعدی</span>
            <span className="rp-next-title">مرحله‌ی {faNum(nextStage.n)} — {nextStage.title}</span>
            <ChevronLeft size={16} />
          </button>
        )}
      </header>

      {confirmDelete && (
        <div className="rp-confirm">
          <span>این مسیر و پیشرفتش حذف شود؟</span>
          <div className="rp-confirm-actions">
            <button type="button" className="account-outline-btn" onClick={() => setConfirmDelete(false)}>لغو</button>
            <button type="button" className="trade-danger-btn" onClick={removeRoadmap}>حذف</button>
          </div>
        </div>
      )}

      {!!pending && (
        <div className="rp-notice">
          جزئیاتِ {faNum(pending)} مرحله در ساختِ اول نرسید — مرحله را باز کن و «ساختِ جزئیات» را بزن.
        </div>
      )}
      {error && <div className="trade-form-error">{error}</div>}

      <div className="rp-tabs">
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "stages" as const, label: "مرحله‌ها" },
            { value: "guide" as const, label: "راهنما" },
            { value: "overview" as const, label: "نمای کلی" },
          ]}
        />
      </div>

      {tab === "stages" && (
        <ol className="rp-timeline">
          {plan.stages.map((st) => (
            <RoadmapStageCard
              key={st.n}
              stage={st}
              topic={roadmap.topic}
              open={openStages.has(st.n)}
              onToggleOpen={() =>
                setOpenStages((prev) => {
                  const next = new Set(prev);
                  if (next.has(st.n)) next.delete(st.n);
                  else next.add(st.n);
                  return next;
                })
              }
              progress={data.stepProgress}
              onToggleStage={() => toggleStage(st)}
              onToggleTask={(i) => toggleTask(st, i)}
              onRegenerate={() => regenerate("stage", st.n)}
              regenerating={busy === `stage-${st.n}`}
            />
          ))}
        </ol>
      )}

      {tab === "guide" && (
        <article className="trade-surface rp-guide">
          {guideBlocks.length ? (
            guideBlocks.map((b, i) =>
              b.kind === "h" ? (
                <h2 key={i}>{b.text}</h2>
              ) : b.kind === "li" ? (
                <div key={i} className="rp-guide-li">{b.text}</div>
              ) : (
                <p key={i}>{b.text}</p>
              )
            )
          ) : (
            <div className="rp-pending-box">
              <p>متنِ راهنمای این مسیر هنوز ساخته نشده.</p>
              <button type="button" className="trade-primary-btn" onClick={() => regenerate("guide")} disabled={!!busy}>
                {busy === "guide" ? <Loader2 size={14} className="trade-spin" /> : <Sparkles size={14} />}
                {busy === "guide" ? "در حال ساخت…" : "ساختِ راهنما"}
              </button>
            </div>
          )}
        </article>
      )}

      {tab === "overview" && (
        <div className="rp-overview">
          {plan.meta.audience && (
            <OverviewCard icon={<UserRound size={15} />} title="این مسیر برای کیه">
              <p className="rp-ov-text">{plan.meta.audience}</p>
            </OverviewCard>
          )}
          {!!plan.meta.outcomes.length && (
            <OverviewCard icon={<Target size={15} />} title="آخرِ مسیر چه کارهایی ازت برمیاد">
              <ul className="rp-done">
                {plan.meta.outcomes.map((o, i) => <li key={i}><Target size={13} /><span>{o}</span></li>)}
              </ul>
            </OverviewCard>
          )}
          {!!plan.meta.prerequisites.length && (
            <OverviewCard icon={<Flag size={15} />} title="قبل از شروع">
              <div className="rp-tags">
                {plan.meta.prerequisites.map((p, i) => <span key={i} className="rp-tag">{p}</span>)}
              </div>
            </OverviewCard>
          )}
          {!!plan.tools.length && (
            <OverviewCard icon={<Wrench size={15} />} title="ابزارهای کلِ مسیر">
              <ul className="rp-tools">
                {plan.tools.map((t, i) => (
                  <li key={i}>
                    <a href={searchUrl(t.name, roadmap.topic)} target="_blank" rel="noopener noreferrer" className="rp-tool-name">
                      {t.name}
                    </a>
                    {t.use && <span>{t.use}</span>}
                  </li>
                ))}
              </ul>
            </OverviewCard>
          )}
          {!!plan.meta.certifications.length && (
            <OverviewCard icon={<Award size={15} />} title="مدرک‌ها">
              <ul className="rp-tools">
                {plan.meta.certifications.map((c, i) => (
                  <li key={i}><b className="rp-tool-name">{c.name}</b>{c.note && <span>{c.note}</span>}</li>
                ))}
              </ul>
            </OverviewCard>
          )}
          <OverviewCard icon={<Layers size={15} />} title="همه‌ی مرحله‌ها">
            <ol className="rp-mini-stages">
              {plan.stages.map((s) => (
                <li key={s.n} className={data.stepProgress[String(s.n)] ? "done" : ""}>
                  <button type="button" onClick={() => openStage(s.n)}>
                    <span className="rp-mini-n">{faNum(s.n)}</span>
                    <span className="rp-mini-title">{s.title}</span>
                    {s.duration && <span className="rp-mini-dur">{s.duration}</span>}
                  </button>
                </li>
              ))}
            </ol>
          </OverviewCard>
        </div>
      )}

      <RoadmapDisclaimer />
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rp-stat">
      <span className="rp-stat-label">{icon}{label}</span>
      <span className="rp-stat-value">{value}</span>
    </div>
  );
}

function OverviewCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="trade-surface rp-ov-card">
      <div className="rp-sec-title">{icon}{title}</div>
      {children}
    </div>
  );
}

type GuideBlock = { kind: "h" | "p" | "li"; text: string };

/**
 * متنِ راهنما را به بلوک‌های قابلِ رندر می‌شکند. عمداً پارسرِ مارک‌داونِ
 * کامل نیست: مدل فقط تیتر (##)، بند و آیتمِ فهرست می‌دهد و هر سه به‌صورتِ
 * متنِ ساده رندر می‌شوند — هیچ HTMLی از خروجیِ مدل اجرا نمی‌شود.
 */
function parseGuide(guide: string): GuideBlock[] {
  const out: GuideBlock[] = [];
  for (const rawLine of guide.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) out.push({ kind: "h", text: line.replace(/^#+\s*/, "").replace(/\*\*/g, "") });
    else if (/^([-*•]|\d+[.)])\s+/.test(line)) out.push({ kind: "li", text: line.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "") });
    else out.push({ kind: "p", text: line.replace(/\*\*/g, "") });
  }
  return out;
}
