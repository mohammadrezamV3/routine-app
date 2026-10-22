"use client";

import { GradientRing } from "@/components/GradientRing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SmartLink as Link } from "@/components/SmartLink";
import {
  Award, ChevronLeft, ChevronRight, Clock, Flag, Gauge, Layers, Sparkles, Target,
  ListChecks, Timer, Trash2, UserRound, Wrench,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { RoadmapStagePanel } from "@/components/RoadmapStagePanel";
import { searchUrl } from "@/components/RoadmapStagePanel";
import { RoadmapStageNav } from "@/components/RoadmapStageNav";
import { RoadmapBuildStatus, BuildInfo } from "@/components/RoadmapBuildStatus";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MentorConfirmDialog } from "@/components/MentorConfirmDialog";
import { useLiveRefresh } from "@/lib/liveSync";
import { tr, iso } from "@/lib/i18n";
import { hoursLabel, levelLabel, type PlanStage, type RoadmapPlan } from "@/lib/roadmapPlan";

type Detail = {
  roadmap: { id: string; topic: string; goal: string | null; createdAt: string };
  plan: RoadmapPlan;
  stepProgress: Record<string, boolean>;
  progress: { total: number; done: number; pct: number };
  build: BuildInfo;
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
  const [selected, setSelected] = useState<number | null>(null); // null = مرحله‌ی جاری
  const [busy, setBusy] = useState<string | null>(null); // "guide" | "stage-3"
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Detail | null) => {
        setData(d ?? null);
      })
      .catch(() => setData(null));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);
  // زنده: پیشرفت/ساخت همین مسیر از تب دیگه یا برگشت به تب. نوشتن‌های همین
  // صفحه نادیده گرفته می‌شن — تیک‌ها خودشون optimisticن و پژواک هر تیک وسط
  // چند تیک پشت‌سرهم فقط پرش می‌ساخت.
  useLiveRefresh("roadmaps", load, { remoteOnly: true });

  /**
   * تیک فورا روی صفحه می‌نشیند و بعد ذخیره می‌شود — نه برعکس؛ اگر ذخیره
   * شکست بخورد، جواب سرور حالت واقعی را برمی‌گرداند.
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
    // ساخت دوباره‌ی مرحله‌ای که جزئیات دارد، تیک کارهایش را هم می‌برد.
    if (stage?.detailed && !window.confirm(tr("جزئیات این مرحله دوباره ساخته شود؟ تیک کارهایش پاک می‌شود.", "Rebuild this stage's details? Its task ticks will be cleared."))) return;

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
      if (!res.ok) { setError(out?.error || tr("ساخته نشد — دوباره امتحان کن", "Could not build — please try again")); return; }
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
      setError(tr("ارتباط با سرور برقرار نشد — دوباره امتحان کن", "Could not reach the server — please try again"));
    } finally {
      setBusy(null);
    }
  }

  // مرحله‌هایی که موقع ساخت اولیه به بودجه‌ی زمانی نرسیدن (حالا که جزئیات
  // هر مرحله خیلی ریزتر و طولانی‌تره، این طبیعیه) یکی‌یکی و خودکار کامل می‌شن —
  // کاربر لازم نیست برای هرکدوم دکمه بزنه. با اولین خطا متوقف می‌شه تا حلقه نشه.
  const [autoFillStopped, setAutoFillStopped] = useState(false);
  // ساخت پس‌زمینه هنوز در جریان است → هر ۵ ثانیه تازه کن تا مرحله‌های آماده‌شده
  // بیایند؛ و تا وقتی سرور خودش دارد می‌سازد، این صفحه هیچ مرحله‌ای را جدا نمی‌سازد.
  const serverBuilding = data?.build?.status === "building";
  useEffect(() => {
    if (!serverBuilding) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [serverBuilding, load]);

  useEffect(() => {
    if (!data || busy || autoFillStopped || data.build?.status === "building") return;
    const pending = data.plan.stages.find((s) => !s.detailed);
    if (pending) { regenerate("stage", pending.n).then(() => {}); return; }
    if (!data.plan.guide) regenerate("guide").then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, busy, autoFillStopped]);
  useEffect(() => { if (error) setAutoFillStopped(true); }, [error]);

  // پرش به بالای ناحیه‌ی مرحله‌ها (نوار/ناوبر + محتوا)
  function scrollToStages() {
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("rmx-stages-top")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

  function openStage(n: number) {
    setTab("stages");
    setSelected(n);
    scrollToStages();
  }

  function openDeleteConfirm() {
    setDeleteError(null);
    setConfirmDelete(true);
  }

  async function removeRoadmap() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/roadmaps/${params.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setDeleting(false);
      setDeleteError(res ? tr("حذف نشد — دوباره امتحان کن", "Could not delete — please try again") : tr("ارتباط با سرور برقرار نشد — اتصال را چک کن", "Could not reach the server — check your connection"));
      return;
    }
    router.push("/roadmaps");
  }

  const guideBlocks = useMemo(() => parseGuide(data?.plan.guide || ""), [data?.plan.guide]);

  if (data === undefined) return <section className="roadmaps-desktop rmx-page"><LoadingBlock /></section>;
  if (data === null) {
    return (
      <section className="roadmaps-desktop rmx-page">
        <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} className="dir-flip" /> {tr("رودمپ‌ها", "Roadmaps")}</Link>
        <div className="trade-empty-state"><p>{tr("این مسیر پیدا نشد", "This path was not found")}</p></div>
      </section>
    );
  }

  const { plan, progress, roadmap } = data;
  const nextStage = plan.stages.find((s) => !data.stepProgress[String(s.n)]);
  const pending = plan.stages.filter((s) => !s.detailed).length;
  const tasksTotal = plan.stages.reduce((n, st) => n + st.tasks.length, 0);
  const tasksDone = Object.keys(data.stepProgress).filter((k) => k.includes(".") && data.stepProgress[k]).length;

  // مرحله‌ی انتخاب‌شده: پیش‌فرض مرحله‌ی جاری؛ اگر همه تمام شده‌اند آخری.
  const selStage =
    plan.stages.find((s) => s.n === selected) ?? nextStage ?? plan.stages[plan.stages.length - 1];
  const selIdx = selStage ? plan.stages.indexOf(selStage) : -1;
  const statItems: { key: string; icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    { key: "stages", icon: <Layers size={14} />, label: tr("مرحله", "Stages"), value: <bdi dir="ltr">{`${faNum(progress.done)} / ${faNum(progress.total)}`}</bdi> },
  ];
  if (tasksTotal > 0) statItems.push({ key: "tasks", icon: <ListChecks size={14} />, label: tr("کار انجام‌شده", "Tasks done"), value: <bdi dir="ltr">{`${faNum(tasksDone)} / ${faNum(tasksTotal)}`}</bdi> });
  if (plan.totalDuration) statItems.push({ key: "time", icon: <Clock size={14} />, label: tr("زمان تخمینی", "Estimated time"), value: plan.totalDuration });
  if (levelLabel(plan.meta.level)) statItems.push({ key: "level", icon: <Gauge size={14} />, label: tr("سطح شروع", "Starting level"), value: levelLabel(plan.meta.level)! });
  if (hoursLabel(plan.meta.weeklyHours)) statItems.push({ key: "hours", icon: <Timer size={14} />, label: tr("در هفته", "Per week"), value: hoursLabel(plan.meta.weeklyHours)! });

  return (
    <section className="roadmaps-desktop rmx-page">
      <div className="rmx-toolbar">
        <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} className="dir-flip" /> {tr("رودمپ‌ها", "Roadmaps")}</Link>
        <button type="button" className="btn btn-ghost btn-icon btn-bare btn-sm" aria-label={tr("حذف مسیر", "Delete path")} onClick={openDeleteConfirm}>
          <Trash2 size={16} />
        </button>
      </div>

      <RoadmapBuildStatus build={data.build} />

      <header className="trade-surface rmx-box rmx-hero">
        <div className="rmx-hero-text">
          <span className="rmx-kicker">{tr("مسیر یادگیری", "Learning path")} <i>·</i> <bdi className="rmx-topic-inline">{roadmap.topic}</bdi></span>
          <h1>{plan.title}</h1>
          {plan.summary && <p className="rmx-hero-summary">{plan.summary}</p>}
          {roadmap.goal && (
            <div className="rmx-hero-goal"><Target size={15} /><span><b>{tr("هدفت:", "Your goal:")}</b> {roadmap.goal}</span></div>
          )}
        </div>
        <GradientRing value={progress.pct / 100} size={96} stroke={8} className="rmx-hero-ring">
          <span className="rmx-ring-num">{faNum(progress.pct)}<small>{tr("٪", "%")}</small></span>
        </GradientRing>
        {nextStage && (
          <button type="button" className="btn btn-primary rmx-hero-cta" onClick={() => openStage(nextStage.n)}>
            {tr("ادامه", "Continue")} · {tr("مرحله", "Stage")} {faNum(nextStage.n)}
            <ChevronLeft size={16} className="dir-flip" />
          </button>
        )}
        <div className="rmx-stats" style={{ ["--rmx-n" as string]: statItems.length }}>
          {statItems.map((it) => <Stat key={it.key} icon={it.icon} label={it.label} value={it.value} />)}
        </div>
      </header>

      {confirmDelete && (
        <MentorConfirmDialog
          message={tr(`مسیر «${plan.title}» و همه‌ی پیشرفتش حذف شود؟ این کار برگشت‌پذیر نیست.`, `Delete the path "${iso(plan.title)}" and all its progress? This cannot be undone.`)}
          confirmLabel={tr("حذف مسیر", "Delete path")}
          busy={deleting}
          error={deleteError}
          onConfirm={removeRoadmap}
          onCancel={() => { if (!deleting) setConfirmDelete(false); }}
        />
      )}

      {!!pending && (
        <div className="rmx-notice">
          {tr(`جزئیات ${faNum(pending)} مرحله در ساخت اول نرسید — مرحله را باز کن و «ساخت جزئیات» را بزن.`, `Details for ${faNum(pending)} ${pending === 1 ? "stage" : "stages"} were not ready in the first build — open the stage and press "Build this stage's details".`)}
        </div>
      )}
      {error && <div className="form-inline-error" role="alert">{error}</div>}

      <div className="rmx-tabs">
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "stages" as const, label: tr("مرحله‌ها", "Stages") },
            { value: "guide" as const, label: tr("راهنما", "Guide") },
            { value: "overview" as const, label: tr("نمای کلی", "Overview") },
          ]}
        />
      </div>

      {tab === "stages" && selStage && (
        <div className="rmx-stages" id="rmx-stages-top">
          <RoadmapStageNav
            stages={plan.stages}
            progress={data.stepProgress}
            selected={selStage.n}
            current={nextStage?.n}
            onSelect={(n) => setSelected(n)}
          />
          <RoadmapStagePanel
            key={selStage.n}
            stage={selStage}
            topic={roadmap.topic}
            phase={data.stepProgress[String(selStage.n)] ? "done" : selStage.n === nextStage?.n ? "now" : "next"}
            progress={data.stepProgress}
            onToggleStage={() => toggleStage(selStage)}
            onToggleTask={(i) => toggleTask(selStage, i)}
            onRegenerate={() => regenerate("stage", selStage.n)}
            regenerating={busy === `stage-${selStage.n}`}
            prev={selIdx > 0 ? plan.stages[selIdx - 1] : null}
            next={selIdx < plan.stages.length - 1 ? plan.stages[selIdx + 1] : null}
            onGo={openStage}
          />
        </div>
      )}

      {tab === "guide" && (
        <article className="trade-surface rmx-guide">
          {guideBlocks.length ? (
            guideBlocks.map((b, i) =>
              b.kind === "h" ? (
                <h2 key={i}>{b.text}</h2>
              ) : b.kind === "li" ? (
                <div key={i} className="rmx-guide-li">{b.text}</div>
              ) : (
                <p key={i}>{b.text}</p>
              )
            )
          ) : (
            <div className="rmx-pending-box">
              <p>{tr("متن راهنمای این مسیر هنوز ساخته نشده.", "The guide for this path has not been built yet.")}</p>
              <button type="button" className={`btn btn-primary btn-sm${busy === "guide" ? " is-loading" : ""}`} onClick={() => regenerate("guide")} disabled={!!busy} aria-busy={busy === "guide"}>
                <Sparkles size={15} /> {tr("ساخت راهنما", "Build guide")}
                {busy === "guide" && <Spinner className="btn-spinner" size={16} label={null} />}
              </button>
            </div>
          )}
        </article>
      )}

      {tab === "overview" && (
        <div className="rmx-overview">
          {plan.meta.audience && (
            <OverviewCard icon={<UserRound size={15} />} title={tr("این مسیر برای کیه", "Who this path is for")}>
              <p className="rmx-ov-text">{plan.meta.audience}</p>
            </OverviewCard>
          )}
          {!!plan.meta.outcomes.length && (
            <OverviewCard icon={<Target size={15} />} title={tr("آخر مسیر چه کارهایی ازت برمیاد", "What you will be able to do by the end")}>
              <ul className="rmx-done">
                {plan.meta.outcomes.map((o, i) => <li key={i}><Target size={13} /><span>{o}</span></li>)}
              </ul>
            </OverviewCard>
          )}
          {!!plan.meta.prerequisites.length && (
            <OverviewCard icon={<Flag size={15} />} title={tr("قبل از شروع", "Before you start")}>
              <div className="rmx-tags">
                {plan.meta.prerequisites.map((p, i) => <span key={i} className="rmx-tag">{p}</span>)}
              </div>
            </OverviewCard>
          )}
          {!!plan.tools.length && (
            <OverviewCard icon={<Wrench size={15} />} title={tr("ابزارهای کل مسیر", "Tools for the whole path")}>
              <ul className="rmx-tools">
                {plan.tools.map((t, i) => (
                  <li key={i}>
                    <a href={searchUrl(t.name, roadmap.topic)} target="_blank" rel="noopener noreferrer" className="rmx-tool-name">
                      {t.name}
                    </a>
                    {t.use && <span>{t.use}</span>}
                  </li>
                ))}
              </ul>
            </OverviewCard>
          )}
          {!!plan.meta.certifications.length && (
            <OverviewCard icon={<Award size={15} />} title={tr("مدرک‌ها", "Certifications")}>
              <ul className="rmx-tools">
                {plan.meta.certifications.map((c, i) => (
                  <li key={i}><b className="rmx-tool-name">{c.name}</b>{c.note && <span>{c.note}</span>}</li>
                ))}
              </ul>
            </OverviewCard>
          )}
          <OverviewCard icon={<Layers size={15} />} title={tr("همه‌ی مرحله‌ها", "All stages")}>
            <ol className="rmx-mini-stages">
              {plan.stages.map((s) => (
                <li key={s.n} className={data.stepProgress[String(s.n)] ? "done" : ""}>
                  <button type="button" onClick={() => openStage(s.n)}>
                    <span className="rmx-mini-n">{faNum(s.n)}</span>
                    <span className="rmx-mini-title">{s.title}</span>
                    {s.duration && <span className="rmx-mini-dur">{s.duration}</span>}
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rmx-stat">
      <span className="rmx-stat-label">{icon}{label}</span>
      <span className="rmx-stat-value">{value}</span>
    </div>
  );
}

function OverviewCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="trade-surface rmx-ov-card">
      <div className="rmx-sec-title">{icon}{title}</div>
      {children}
    </div>
  );
}

type GuideBlock = { kind: "h" | "p" | "li"; text: string };

/**
 * متن راهنما را به بلوک‌های قابل رندر می‌شکند. عمدا پارسر مارک‌داون
 * کامل نیست: مدل فقط تیتر (##)، بند و آیتم فهرست می‌دهد و هر سه به‌صورت
 * متن ساده رندر می‌شوند — هیچ HTMLی از خروجی مدل اجرا نمی‌شود.
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
