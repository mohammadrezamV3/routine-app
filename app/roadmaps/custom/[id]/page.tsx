"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check, ChevronRight, Clock, ExternalLink, Flag, Target, Trash2, Wrench,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { RoadmapStepToProgram } from "@/components/RoadmapStepToProgram";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import type { PlanStage, RoadmapPlan } from "@/lib/roadmapPlan";

// منابعی که مدل لینکِ قابلِ اعتماد برایشان نداده (سمتِ سرور فیلتر شده‌اند)
// به یک جست‌وجوی واقعی وصل می‌شوند، نه یک URLِ ساختگی.
function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

type Detail = {
  roadmap: { id: string; topic: string; goal: string | null; createdAt: string };
  plan: RoadmapPlan;
  stepProgress: Record<string, boolean>;
  progress: { total: number; done: number; pct: number };
};

type Tab = "guide" | "stages";

export default function RoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("guide");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Detail | null) => setData(d ?? null))
      .catch(() => setData(null));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  /**
   * تیکِ مرحله فوراً روی صفحه می‌نشیند و بعد ذخیره می‌شود — نه برعکس.
   * بدونِ این، بینِ کلیک و جوابِ سرور یک مکثِ محسوس بود که حس می‌داد تیک
   * نخورده. اگر ذخیره شکست بخورد، جوابِ سرور همان حالتِ واقعی را برمی‌گرداند.
   */
  async function toggle(stage: PlanStage) {
    if (!data) return;
    const key = String(stage.n);
    const next = !data.stepProgress[key];

    const optimistic = { ...data.stepProgress };
    if (next) optimistic[key] = true;
    else delete optimistic[key];
    const doneCount = data.plan.stages.filter((s) => optimistic[String(s.n)]).length;
    setData({
      ...data,
      stepProgress: optimistic,
      progress: {
        total: data.plan.stages.length,
        done: doneCount,
        pct: data.plan.stages.length ? Math.round((doneCount / data.plan.stages.length) * 100) : 0,
      },
    });

    const res = await fetch(`/api/roadmaps/${params.id}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n: stage.n, done: next }),
    }).catch(() => null);
    if (!res?.ok) { load(); return; }
    const body = await res.json().catch(() => null);
    if (body) setData((prev) => (prev ? { ...prev, stepProgress: body.stepProgress, progress: body.progress } : prev));
  }

  async function removeRoadmap() {
    await fetch(`/api/roadmaps/${params.id}`, { method: "DELETE" });
    router.push("/roadmaps");
  }

  const guideBlocks = useMemo(() => parseGuide(data?.plan.guide || ""), [data?.plan.guide]);

  if (data === undefined) return <section className="roadmaps-desktop rm-page"><LoadingBlock /></section>;
  if (data === null) {
    return (
      <section className="roadmaps-desktop rm-page">
        <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} /> رودمپ‌ها</Link>
        <div className="trade-empty-state"><p>این مسیر پیدا نشد</p></div>
      </section>
    );
  }

  const { plan, progress } = data;

  return (
    <section className="roadmaps-desktop rm-page">
      <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} /> رودمپ‌ها</Link>

      <div className="rm-hero">
        <div className="rm-hero-top">
          <h1>{plan.title}</h1>
          <button type="button" className="trade-icon-btn danger" aria-label="حذف مسیر" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} />
          </button>
        </div>
        {plan.summary && <p className="rm-hero-note">{plan.summary}</p>}

        {data.roadmap.goal && (
          <div className="rm-outcome">
            <Target size={14} />
            <span><b>هدفت:</b> {data.roadmap.goal}</span>
          </div>
        )}

        <div className="rm-meta">
          <span className="rm-chip"><Flag size={12} /> {data.roadmap.topic}</span>
          {plan.totalDuration && <span className="rm-chip"><Clock size={12} /> {plan.totalDuration}</span>}
          <span className="rm-chip">{faNum(plan.stages.length)} مرحله</span>
        </div>

        <div className="rm-progress">
          <div className="rm-progress-bar"><span style={{ width: `${progress.pct}%` }} /></div>
          <div className="rm-progress-text">
            {faNum(progress.done)} از {faNum(progress.total)} مرحله — {faNum(progress.pct)}٪
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="rm-confirm">
          <span>این مسیر و پیشرفتش حذف شود؟</span>
          <div className="rm-confirm-actions">
            <button type="button" className="account-outline-btn" onClick={() => setConfirmDelete(false)}>لغو</button>
            <button type="button" className="trade-danger-btn" onClick={removeRoadmap}>حذف</button>
          </div>
        </div>
      )}

      {/* متن و مرحله‌ها دو چیزِ متفاوتند و هر دو کامل: متن «چرا و چی»ست،
          مرحله‌ها «چه‌کار کنم». روی هم گذاشتنشان یک صفحه‌ی بی‌انتها می‌ساخت،
          پس با تب از هم جدا شده‌اند — نه اینکه یکی حذف شود. */}
      <div className="rm-tabs">
        <SegmentedTabs
          active={tab}
          onChange={setTab}
          options={[
            { value: "guide" as const, label: "راهنمای مسیر" },
            { value: "stages" as const, label: `مرحله‌ها (${faNum(plan.stages.length)})` },
          ]}
        />
      </div>

      {tab === "guide" ? (
        <>
          {!!plan.tools.length && (
            <div className="rm-section">
              <div className="rm-section-title"><Wrench size={15} /> ابزارهای این مسیر</div>
              <div className="rm-track-topics">
                {plan.tools.map((t, i) => (
                  <a
                    key={i}
                    href={searchUrl(t, data.roadmap.topic)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rm-topic-chip"
                  >
                    {t}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="rm-guide">
            {guideBlocks.map((b, i) =>
              b.kind === "h" ? (
                <h2 key={i} className="rm-guide-h">{b.text}</h2>
              ) : b.kind === "li" ? (
                <div key={i} className="rm-guide-li">{b.text}</div>
              ) : (
                <p key={i} className="rm-guide-p">{b.text}</p>
              )
            )}
            {!guideBlocks.length && <p className="rm-guide-p">متنِ این مسیر ذخیره نشده — دوباره بسازش.</p>}
          </div>
        </>
      ) : (
        <ol className="rm-steps">
          {plan.stages.map((st) => {
            const isDone = !!data.stepProgress[String(st.n)];
            return (
              <li key={st.n} className={`rm-step${isDone ? " done" : ""}`}>
                <button
                  type="button"
                  className="rm-step-num"
                  onClick={() => toggle(st)}
                  aria-label={isDone ? "برگرداندن به انجام‌نشده" : "این مرحله انجام شد"}
                >
                  {isDone ? <Check size={15} /> : faNum(st.n)}
                </button>

                <div className="rm-step-body">
                  <div className="rm-step-head">
                    <h2>{st.title}</h2>
                    {st.duration && <span className="rm-step-weeks">{st.duration}</span>}
                  </div>

                  {st.goal && (
                    <div className="rm-goal">
                      <Target size={13} />
                      <span>{st.goal}</span>
                    </div>
                  )}

                  {!!st.learn.length && (
                    <>
                      <div className="rm-session-label">چی یاد بگیر</div>
                      <ul className="rm-items">
                        {st.learn.map((x, i) => <li key={i}>{x}</li>)}
                      </ul>
                    </>
                  )}

                  {!!st.do.length && (
                    <>
                      <div className="rm-session-label">چیکار کن</div>
                      <ol className="rm-items">
                        {st.do.map((x, i) => <li key={i}>{x}</li>)}
                      </ol>
                    </>
                  )}

                  {!!st.tools.length && (
                    <>
                      <div className="rm-session-label">ابزارها</div>
                      <div className="rm-track-topics">
                        {st.tools.map((t, i) => (
                          <a key={i} href={searchUrl(t, data.roadmap.topic)} target="_blank" rel="noopener noreferrer" className="rm-topic-chip">
                            {t}
                          </a>
                        ))}
                      </div>
                    </>
                  )}

                  {!!st.resources.length && (
                    <>
                      <div className="rm-session-label">منابع</div>
                      <ul className="rm-items">
                        {st.resources.map((r, i) => (
                          <li key={i}>
                            {/* لینکِ واقعیِ منبع فقط وقتی دامنه‌اش شناخته‌شده بوده
                                (sanitizeUrl سمتِ سرور)؛ بقیه به جست‌وجوی همان نام. */}
                            <a href={r.url || searchUrl(r.title, data.roadmap.topic)} target="_blank" rel="noopener noreferrer">
                              {r.title}<ExternalLink size={11} />
                            </a>
                            {r.source && <span className="rm-res-source"> — {r.source}</span>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {st.done && (
                    <div className="rm-note-box rm-checkpoint">
                      <b>کی این مرحله تمام است؟</b> <span>{st.done}</span>
                    </div>
                  )}

                  <RoadmapStepToProgram title={st.title} topic={data.roadmap.topic} />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <RoadmapDisclaimer />
    </section>
  );
}

type GuideBlock = { kind: "h" | "p" | "li"; text: string };

/**
 * متنِ راهنما را به بلوک‌های قابلِ رندر می‌شکند.
 *
 * عمداً یک پارسرِ مارک‌داونِ کامل نیست و کتابخانه‌ای هم اضافه نمی‌کند: مدل
 * فقط سه چیز تولید می‌کند — تیتر (##)، بند، و آیتمِ فهرست. رندرِ همین سه‌تا
 * به‌صورت متنِ ساده یعنی هیچ HTMLی از خروجیِ مدل اجرا نمی‌شود (نه
 * dangerouslySetInnerHTML، نه سینتکسِ لینکِ دلخواه).
 */
function parseGuide(guide: string): GuideBlock[] {
  const out: GuideBlock[] = [];
  for (const rawLine of guide.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      out.push({ kind: "h", text: line.replace(/^#+\s*/, "") });
    } else if (/^[-*•]\s+/.test(line)) {
      out.push({ kind: "li", text: line.replace(/^[-*•]\s+/, "") });
    } else {
      out.push({ kind: "p", text: line });
    }
  }
  return out;
}
