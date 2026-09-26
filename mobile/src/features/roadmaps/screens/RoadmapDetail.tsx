import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Award, Clock, Flag, Gauge, Layers, Loader2, Sparkles, Target, Timer, UserRound, Wrench } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { ROADMAP_HOURS_OPTIONS, ROADMAP_LEVEL_OPTIONS } from "@/lib/api-contract";
import { useRoadmapApi } from "../api";
import { getRoadmap, regenerateRoadmapPart, toggleStep, toggleTask } from "../repo";
import { parseGuide } from "../guide";
import { describeRoadmapError } from "../errors";
import StageTimeline, { Tags } from "../components/StageTimeline";

function faDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

type Tab = "stages" | "guide" | "overview";

export default function RoadmapDetail() {
  const params = useParams<{ id: string }>();
  const api = useRoadmapApi();
  const online = useNetworkStatus();
  const [tab, setTab] = useState<Tab>("stages");
  const [openStages, setOpenStages] = useState<Set<number> | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "guide" | "stage-3"
  const [error, setError] = useState<string | null>(null);

  const roadmap = useLiveQuery(() => (params.id ? getRoadmap(params.id) : undefined), [params.id]);

  const guideBlocks = useMemo(() => parseGuide(roadmap?.plan.guide ?? ""), [roadmap?.plan.guide]);

  // اولین مرحله‌ی تمام‌نشده خودش باز می‌شود — همان جایی که کاربر باید ادامه دهد (مثلِ وب).
  useEffect(() => {
    if (!roadmap || openStages) return;
    const next = roadmap.plan.stages.find((s) => !roadmap.stepProgress[String(s.n)]);
    setOpenStages(new Set(next ? [next.n] : []));
  }, [roadmap, openStages]);

  function handleToggle(stageN: number) {
    if (!params.id) return;
    void toggleStep(params.id, stageN);
  }

  function handleToggleTask(stageN: number, taskIndex: number) {
    if (!params.id) return;
    void toggleTask(params.id, stageN, taskIndex);
  }

  function toggleOpen(stageN: number) {
    setOpenStages((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(stageN)) next.delete(stageN);
      else next.add(stageN);
      return next;
    });
  }

  async function regenerate(target: "guide" | "stage", n?: number) {
    if (!params.id || !roadmap || busy) return;
    const stage = n !== undefined ? roadmap.plan.stages.find((s) => s.n === n) : undefined;
    // ساختِ دوباره‌ی مرحله‌ای که جزئیات دارد، تیکِ کارهایش را هم می‌برد.
    if (stage?.detailed && !window.confirm("جزئیاتِ این مرحله دوباره ساخته شود؟ تیکِ کارهایش پاک می‌شود.")) return;
    setBusy(target === "guide" ? "guide" : `stage-${n}`);
    setError(null);
    try {
      await regenerateRoadmapPart(api, params.id, target === "guide" ? { target } : { target, n: n! });
    } catch (err) {
      setError(describeRoadmapError(err));
    } finally {
      setBusy(null);
    }
  }

  if (roadmap === undefined) {
    return (
      <div>
        <AppHeader title="در حال بارگذاری…" showBack />
      </div>
    );
  }

  if (roadmap === null) {
    return (
      <div>
        <AppHeader title="رودمپ" showBack />
        <main className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <p className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
            این مسیر پیدا نشد
          </p>
        </main>
      </div>
    );
  }

  const { plan } = roadmap;
  const pending = plan.stages.filter((s) => !s.detailed).length;
  const level = ROADMAP_LEVEL_OPTIONS.find((o) => o.value === plan.meta.level)?.label;
  const hours = ROADMAP_HOURS_OPTIONS.find((o) => o.value === plan.meta.weeklyHours)?.label;
  const regeneratingN = busy?.startsWith("stage-") ? Number(busy.slice(6)) : null;

  function openStage(n: number) {
    setTab("stages");
    setOpenStages((prev) => new Set(prev ?? []).add(n));
    requestAnimationFrame(() => document.getElementById(`stage-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div>
      <AppHeader title={plan.title} showBack />

      <main className="px-4 pt-3 pb-6">
        {plan.summary && (
          <p className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
            {plan.summary}
          </p>
        )}

        {roadmap.goal && (
          <div className="mt-2 flex items-start gap-1.5 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            <Target size={13} className="mt-0.5 shrink-0" color="var(--accent)" />
            <span>
              <b>هدفت:</b> {roadmap.goal}
            </span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip icon={<Flag size={11} />}>{roadmap.topic}</Chip>
          {plan.totalDuration && <Chip icon={<Clock size={11} />}>{plan.totalDuration}</Chip>}
          <Chip icon={<Layers size={11} />}>{faDigits(plan.stages.length)} مرحله</Chip>
          {level && <Chip icon={<Gauge size={11} />}>{level}</Chip>}
          {hours && <Chip icon={<Timer size={11} />}>{hours} در هفته</Chip>}
        </div>

        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${roadmap.pct}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="mt-1.5 font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            {faDigits(roadmap.done)} از {faDigits(roadmap.total)} مرحله — {faDigits(roadmap.pct)}٪
          </div>
        </div>

        {!!pending && (
          <p className="mt-3 font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }} role="note">
            جزئیاتِ {faDigits(pending)} مرحله در ساختِ اول نرسید — مرحله رو باز کن و «ساختِ جزئیات» رو بزن.
          </p>
        )}
        {!online && (
          <p className="mt-2 font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            تیک‌زدن آفلاین هم کار می‌کنه؛ ساختِ جزئیات نیاز به اینترنت داره.
          </p>
        )}
        {error && (
          <p className="mt-2 font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }}>
            {error}
          </p>
        )}

        <div className="mt-4">
          <SegmentedTabs
            active={tab}
            onChange={setTab}
            options={[
              { value: "stages", label: `مرحله‌ها (${faDigits(plan.stages.length)})` },
              { value: "guide", label: "راهنما" },
              { value: "overview", label: "نمای کلی" },
            ]}
          />
        </div>

        {tab === "stages" && (
          <div className="mt-4">
            <StageTimeline
              stages={plan.stages}
              stepProgress={roadmap.stepProgress}
              onToggle={handleToggle}
              onToggleTask={handleToggleTask}
              onRegenerate={(n) => void regenerate("stage", n)}
              regeneratingN={regeneratingN}
              canRegenerate={online && !busy}
              openStages={openStages ?? new Set()}
              onToggleOpen={toggleOpen}
            />
          </div>
        )}

        {tab === "guide" && (
          <div className="mt-4">
            {guideBlocks.map((b, i) =>
              b.kind === "h" ? (
                <h2 key={i} className="mt-4 font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                  {b.text}
                </h2>
              ) : b.kind === "li" ? (
                <div key={i} className="mt-1 font-vazir text-[13.5px]" style={{ color: "var(--text)" }}>
                  {"• "}
                  {b.text}
                </div>
              ) : (
                <p key={i} className="mt-2 font-vazir text-[13.5px] leading-7" style={{ color: "var(--text)" }}>
                  {b.text}
                </p>
              ),
            )}
            {!guideBlocks.length && (
              <div>
                <p className="mt-2 font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
                  متنِ راهنمای این مسیر هنوز ساخته نشده.
                </p>
                <button
                  type="button"
                  onClick={() => void regenerate("guide")}
                  disabled={!online || !!busy}
                  className="mt-3 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-vazir text-[12.5px] transition-opacity"
                  style={{
                    background: "transparent",
                    borderColor: "var(--surface-line)",
                    color: "var(--text)",
                    opacity: !online || busy ? 0.5 : 1,
                  }}
                >
                  {busy === "guide" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {busy === "guide" ? "در حال ساخت…" : "ساختِ راهنما"}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "overview" && (
          <div className="mt-4">
            {plan.meta.audience && (
              <Block icon={<UserRound size={14} />} title="این مسیر برای کیه">
                <p className="font-vazir text-[13px] leading-6" style={{ color: "var(--text)" }}>
                  {plan.meta.audience}
                </p>
              </Block>
            )}
            {!!plan.meta.outcomes.length && (
              <Block icon={<Target size={14} />} title="آخرِ مسیر چه کارهایی ازت برمیاد">
                <ul className="list-inside list-disc font-vazir text-[13px]" style={{ color: "var(--text)" }}>
                  {plan.meta.outcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </Block>
            )}
            {!!plan.meta.prerequisites.length && (
              <Block icon={<Flag size={14} />} title="قبل از شروع">
                <Tags items={plan.meta.prerequisites} />
              </Block>
            )}
            {!!plan.tools.length && (
              <Block icon={<Wrench size={14} />} title="ابزارهای کلِ مسیر">
                <ul>
                  {plan.tools.map((t, i) => (
                    <li key={i} className="mt-1 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                      <b style={{ color: "var(--text)" }}>{t.name}</b>
                      {t.use && <> — {t.use}</>}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            {!!plan.meta.certifications.length && (
              <Block icon={<Award size={14} />} title="مدرک‌ها">
                <ul>
                  {plan.meta.certifications.map((c, i) => (
                    <li key={i} className="mt-1 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                      <b style={{ color: "var(--text)" }}>{c.name}</b>
                      {c.note && <> — {c.note}</>}
                    </li>
                  ))}
                </ul>
              </Block>
            )}
            <Block icon={<Layers size={14} />} title="همه‌ی مرحله‌ها">
              <ol>
                {plan.stages.map((s) => (
                  <li key={s.n}>
                    <button
                      type="button"
                      onClick={() => openStage(s.n)}
                      className="flex w-full items-center gap-2 py-1 text-start font-vazir text-[13px]"
                      style={{ color: roadmap.stepProgress[String(s.n)] ? "var(--muted)" : "var(--text)" }}
                    >
                      <span className="shrink-0" style={{ color: "var(--muted)" }}>
                        {faDigits(s.n)}.
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      {s.duration && (
                        <span className="shrink-0 text-[11px]" style={{ color: "var(--muted)" }}>
                          {s.duration}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </Block>
          </div>
        )}

        <p className="mt-2 font-vazir text-[11.5px] text-center" style={{ color: "var(--pnl-loss)" }} role="note">
          هوش مصنوعی ممکنه اشتباه کنه — خودت هم تحقیق کن.
        </p>
      </main>
    </div>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2.5 py-1 font-vazir text-[11.5px]"
      style={{ background: "var(--surface-2)", color: "var(--muted)" }}
    >
      {icon}
      {children}
    </span>
  );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 font-vazir text-[12.5px] font-semibold" style={{ color: "var(--text)" }}>
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}
