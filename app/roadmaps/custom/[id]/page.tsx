"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, Award, BookOpen, Check, ChevronRight, Clock, ExternalLink, Flag,
  Hammer, Lightbulb, ListChecks, MessageCircleQuestion, Route, Sparkles, Target, Trash2,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { RoadmapStepToProgram } from "@/components/RoadmapStepToProgram";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import { ROADMAP_DAYS, addMinutes } from "@/lib/roadmapSchedule";
import { RoadmapGraphView } from "@/components/RoadmapGraphView";
import type { NodeProgress, ProgressSummary, RoadmapGraph } from "@/lib/roadmapGraph";

// لینک‌کردن منابع به یک جست‌وجوی واقعی — نه یک URLِ ساختگی که معلوم نیست
// درست باشد، بلکه جست‌وجوی همان عنوان به‌همراهِ موضوعِ رودمپ.
function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

type Session = { title: string; goal?: string; steps: string[]; howTo?: string; refs?: string[]; checkpoint?: string };
type Station = {
  t: string; items: string[]; track?: string; goal?: string; weeks?: number;
  practice?: string; checkpoint?: string; sessions?: Session[];
};
type Track = { t: string; why: string; weeks?: number; topics: string[] };
type Cert = { name: string; when: string; why: string; required?: boolean };
type Project = { t: string; what: string; proves: string };
type Answer = { q: string; a: string };
type Schedule = { jsDays: number[]; minutesPerDay: number; startTime: string };

type Roadmap = {
  id: string;
  title: string;
  topic: string;
  note: string;
  outcome?: string | null;
  level?: string | null;
  totalWeeks?: number | null;
  tracks?: Track[] | null;
  stations: Station[];
  certifications?: Cert[] | null;
  projects?: Project[] | null;
  tips: string[];
  proTips: string[];
  books: string[];
  mistakes?: string[] | null;
  answers?: Answer[] | null;
  progress?: Record<string, boolean> | null;
  schedule?: Schedule | null;
};

export default function CustomRoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Roadmap | null | undefined>(undefined);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  // رودمپِ گراف‌محور (نسخه‌ی جدید). رودمپ‌های قدیمی این را ندارند و با همان
  // رندرِ ایستگاهیِ پایین نشان داده می‌شوند.
  const [gr, setGr] = useState<{
    graph: RoadmapGraph; nodeProgress: NodeProgress; progress: ProgressSummary | null;
    version: number; versions: { version: number; savedAt: string; reason: string }[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => r.json())
      .then((res) => {
        const rm: Roadmap | null = res.roadmap || null;
        setData(rm);
        setDone((rm?.progress as Record<string, boolean>) || {});
        if (res.graph) {
          setGr({
            graph: res.graph,
            nodeProgress: res.nodeProgress || {},
            progress: res.progress || null,
            version: res.version ?? 1,
            versions: Array.isArray(res.versions) ? res.versions : [],
          });
        }
      })
      .catch(() => setData(null));
  }, [params.id]);

  // پیشرفت روی خودِ رودمپ ذخیره می‌شود، نه در UserSetting — کلیدِ پویای
  // قبلی در allowlist نبود و برای کاربرِ واردشده ۴۰۰ می‌گرفت.
  const persist = useCallback(async (next: Record<string, boolean>) => {
    await fetch(`/api/roadmaps/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: next }),
    }).catch(() => {});
  }, [params.id]);

  function toggleKey(key: string) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    persist(next);
  }

  async function removeRoadmap() {
    await fetch(`/api/roadmaps/${params.id}`, { method: "DELETE" });
    router.push("/roadmaps");
  }

  if (data === undefined) return <section className="trade-desktop"><LoadingBlock /></section>;
  if (data === null) return <section className="trade-desktop"><div className="item-line empty">این مسیر پیدا نشد.</div></section>;

  // نسخه‌ی گراف‌محور: کلِ صفحه را خودش می‌سازد (نقشه، کشوی نود، ویرایشِ AI).
  if (gr) {
    return (
      <section className="trade-desktop rm-page">
        <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} /> مسیرها</Link>
        {confirmDelete && (
          <div className="rm-confirm">
            <span>این مسیر و پیشرفتش حذف شود؟</span>
            <div className="rm-confirm-actions">
              <button type="button" className="account-outline-btn" onClick={() => setConfirmDelete(false)}>لغو</button>
              <button type="button" className="trade-danger-btn" onClick={removeRoadmap}>حذف</button>
            </div>
          </div>
        )}
        <RoadmapGraphView
          id={data.id}
          topic={data.topic}
          graph={gr.graph}
          initialProgress={gr.nodeProgress}
          initialSummary={gr.progress}
          initialVersion={gr.version}
          initialVersions={gr.versions}
          onDelete={() => setConfirmDelete(true)}
        />
        <RoadmapDisclaimer />
      </section>
    );
  }

  const total = data.stations.length;
  const doneCount = data.stations.filter((_, i) => done[String(i)]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const sessionCount = data.stations.reduce((n, st) => n + (st.sessions?.length ?? 0), 0);
  const tracks = data.tracks ?? [];
  const certs = data.certifications ?? [];
  const projects = data.projects ?? [];
  const answers = data.answers ?? [];

  const sc = data.schedule;
  const scheduleText = sc && sc.jsDays?.length
    ? `${sc.jsDays.map((d) => ROADMAP_DAYS.find((x) => x.jsDay === d)?.label).filter(Boolean).join("، ")} — ${sc.startTime} تا ${addMinutes(sc.startTime, sc.minutesPerDay)}`
    : null;

  // شماره‌ی جلسه‌ها سراسری است (جلسه‌ی ۷ از ۲۴)، نه از هر مرحله از نو —
  // کاربر «امروز جلسه‌ی چندم است» را می‌پرسد، نه «جلسه‌ی چندمِ مرحله‌ی سه».
  let sessionCursor = 0;

  return (
    <section className="trade-desktop rm-page">
      <Link href="/roadmaps" className="trade-back-link"><ChevronRight size={15} /> مسیرها</Link>

      {/* سربرگ: عنوان، خروجیِ نهایی، و نوارِ پیشرفت */}
      <div className="rm-hero">
        <div className="rm-hero-top">
          <h1>{data.title}</h1>
          <button type="button" className="trade-icon-btn danger" aria-label="حذف مسیر"
                  onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></button>
        </div>
        {data.note && <p className="rm-hero-note">{data.note}</p>}

        {data.outcome && (
          <div className="rm-outcome">
            <Target size={14} />
            <span><b>آخرِ این مسیر:</b> {data.outcome}</span>
          </div>
        )}

        <div className="rm-meta">
          {data.level && <span className="rm-chip"><Flag size={12} /> {data.level}</span>}
          {data.totalWeeks ? <span className="rm-chip">{faNum(data.totalWeeks)} هفته</span> : null}
          <span className="rm-chip">{faNum(total)} مرحله</span>
          {sessionCount > 0 && <span className="rm-chip"><ListChecks size={12} /> {faNum(sessionCount)} جلسه</span>}
        </div>

        {scheduleText && (
          <div className="rm-schedule"><Clock size={13} /> <span>{scheduleText}</span></div>
        )}

        <div className="rm-progress">
          <div className="rm-progress-bar"><span style={{ width: `${pct}%` }} /></div>
          <div className="rm-progress-text">
            {faNum(doneCount)} از {faNum(total)} مرحله — {faNum(pct)}٪
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

      {/* «چی باید بخونی» — جوابِ اصلیِ سوالِ کاربر. عمداً بالاتر از مرحله‌هاست:
          اول باید بفهمد نقشه‌ی کلی چیست، بعد برود سراغِ جلسه‌ی اول. */}
      {!!tracks.length && (
        <div className="rm-tracks">
          <div className="rm-section-title"><Route size={15} /> برای این کار، چی‌ها باید بلد بشی</div>
          <div className="rm-track-list">
            {tracks.map((tr, i) => (
              <div key={i} className="rm-track">
                <div className="rm-track-num">{faNum(i + 1)}</div>
                <div className="rm-track-body">
                  <div className="rm-track-head">
                    <b>{tr.t}</b>
                    {tr.weeks ? <span className="rm-track-weeks">{faNum(tr.weeks)} هفته</span> : null}
                  </div>
                  {tr.why && <div className="rm-track-why">{tr.why}</div>}
                  {!!tr.topics?.length && (
                    <div className="rm-track-topics">
                      {tr.topics.map((tp, j) => (
                        <a key={j} href={searchUrl(tp, data.topic)} target="_blank" rel="noopener noreferrer" className="rm-topic-chip">
                          {tp}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* مرحله‌ها */}
      <ol className="rm-steps">
        {data.stations.map((st, i) => {
          const isDone = !!done[String(i)];
          return (
            <li key={i} className={`rm-step${isDone ? " done" : ""}`}>
              <button type="button" className="rm-step-num" onClick={() => toggleKey(String(i))}
                      aria-label={isDone ? "برگرداندن به انجام‌نشده" : "تمام شد"}>
                {isDone ? <Check size={15} /> : faNum(i + 1)}
              </button>

              <div className="rm-step-body">
                <div className="rm-step-head">
                  <h2>{st.t}</h2>
                  {st.weeks ? <span className="rm-step-weeks">{faNum(st.weeks)} هفته</span> : null}
                </div>

                {st.track && <div className="rm-step-track">{st.track}</div>}

                {st.goal && (
                  <div className="rm-goal"><Target size={13} /> <span>{st.goal}</span></div>
                )}

                <ul className="rm-items">
                  {st.items.map((it, j) => (
                    <li key={j}>
                      <a href={searchUrl(it, data.topic)} target="_blank" rel="noopener noreferrer">
                        {it}<ExternalLink size={11} />
                      </a>
                    </li>
                  ))}
                </ul>

                {st.practice && (
                  <div className="rm-note-box rm-practice">
                    <b>تمرین</b>
                    <span>{st.practice}</span>
                  </div>
                )}
                {st.checkpoint && (
                  <div className="rm-note-box rm-checkpoint">
                    <b>کی تمام است؟</b>
                    <span>{st.checkpoint}</span>
                  </div>
                )}

                {!!st.sessions?.length && (
                  <div className="rm-sessions">
                    {st.sessions.map((ses, j) => {
                      sessionCursor += 1;
                      const n = sessionCursor;
                      const key = `s${i}-${j}`;
                      const sesDone = !!done[key];
                      return (
                        <div key={j} className={`rm-session${sesDone ? " done" : ""}`}>
                          <div className="rm-session-head">
                            <button
                              type="button"
                              className="rm-session-num"
                              onClick={() => toggleKey(key)}
                              aria-label={sesDone ? "برگرداندن به انجام‌نشده" : "این جلسه انجام شد"}
                            >
                              {sesDone ? <Check size={13} /> : faNum(n)}
                            </button>
                            <div className="rm-session-title">
                              <b>جلسه‌ی {faNum(n)}</b> — {ses.title}
                            </div>
                          </div>

                          {ses.goal && <div className="rm-session-goal">{ses.goal}</div>}

                          <div className="rm-session-label">توی این جلسه چیکار کن</div>
                          <ol className="rm-session-steps">
                            {ses.steps.map((stp, k) => <li key={k}>{stp}</li>)}
                          </ol>

                          {ses.howTo && (
                            <>
                              <div className="rm-session-label">چطور یاد بگیر</div>
                              <div className="rm-session-text">{ses.howTo}</div>
                            </>
                          )}

                          {!!ses.refs?.length && (
                            <>
                              <div className="rm-session-label">منابع این جلسه</div>
                              <ul className="rm-session-refs">
                                {ses.refs.map((r, k) => (
                                  <li key={k}>
                                    <a href={searchUrl(r, data.topic)} target="_blank" rel="noopener noreferrer">
                                      {r}<ExternalLink size={11} />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {ses.checkpoint && (
                            <div className="rm-session-check">
                              <b>کی این جلسه تمام است؟</b> {ses.checkpoint}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <RoadmapStepToProgram title={st.t} topic={data.topic} />
              </div>
            </li>
          );
        })}
      </ol>

      {/* مدرک‌ها — سرِ جای درستِ مسیر، نه یک فهرستِ بی‌ترتیب */}
      {!!certs.length && (
        <div className="rm-section">
          <div className="rm-section-title"><Award size={15} /> مدرک‌ها</div>
          <div className="rm-cert-list">
            {certs.map((c, i) => (
              <div key={i} className="rm-cert">
                <div className="rm-cert-head">
                  <a href={searchUrl(c.name, data.topic)} target="_blank" rel="noopener noreferrer" className="rm-cert-name">
                    {c.name}<ExternalLink size={11} />
                  </a>
                  <span className={`rm-cert-tag${c.required ? " req" : ""}`}>{c.required ? "لازم" : "خوبه داشته باشی"}</span>
                </div>
                {c.when && <div className="rm-cert-when">{c.when}</div>}
                {c.why && <div className="rm-cert-why">{c.why}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* پروژه‌ها — «بلدم» با این ثابت می‌شود، نه با گواهی */}
      {!!projects.length && (
        <div className="rm-section">
          <div className="rm-section-title"><Hammer size={15} /> این‌ها را بساز</div>
          <div className="rm-project-list">
            {projects.map((p, i) => (
              <div key={i} className="rm-project">
                <b>{p.t}</b>
                {p.what && <span>{p.what}</span>}
                {p.proves && <em>ثابت می‌کند: {p.proves}</em>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* بخش‌های پایانی */}
      {!!data.mistakes?.length && (
        <RoadmapList icon={<AlertTriangle size={15} />} title="اشتباه‌های رایج" items={data.mistakes} tone="warn" />
      )}
      {!!data.tips?.length && (
        <RoadmapList icon={<Lightbulb size={15} />} title="نکته‌های کاربردی" items={data.tips} />
      )}
      {!!data.proTips?.length && (
        <RoadmapList icon={<Sparkles size={15} />} title="برای حرفه‌ای شدن" items={data.proTips} />
      )}
      {!!data.books?.length && (
        <RoadmapList icon={<BookOpen size={15} />} title="منابع" items={data.books} topic={data.topic} />
      )}

      {/* بر چه اساسی ساخته شد — جوابِ سوال‌هایی که موقعِ ساخت داده شد. جمع
          است چون نودِ درصدِ وقت‌ها کاربر لازمش ندارد، ولی وقتی مسیر عجیب به
          نظر برسد اولین چیزی است که می‌خواهد ببیند. */}
      {!!answers.length && (
        <div className="rm-section">
          <button type="button" className="rm-answers-toggle" onClick={() => setShowAnswers((v) => !v)}>
            <MessageCircleQuestion size={15} />
            این مسیر بر چه اساسی ساخته شد؟
            <span className="rm-answers-caret">{showAnswers ? "−" : "+"}</span>
          </button>
          {showAnswers && (
            <div className="rm-answer-list">
              {answers.map((a, i) => (
                <div key={i} className="rm-answer">
                  <span>{a.q}</span>
                  <b>{a.a}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <RoadmapDisclaimer />
    </section>
  );
}

function RoadmapList({
  icon, title, items, topic, tone,
}: { icon: React.ReactNode; title: string; items: string[]; topic?: string; tone?: "warn" }) {
  return (
    <div className={`rm-section${tone === "warn" ? " warn" : ""}`}>
      <div className="rm-section-title">{icon} {title}</div>
      <ul className="rm-section-list">
        {items.map((x, i) => (
          <li key={i}>
            {topic ? (
              <a href={searchUrl(x, topic)} target="_blank" rel="noopener noreferrer">
                {x}<ExternalLink size={11} />
              </a>
            ) : x}
          </li>
        ))}
      </ul>
    </div>
  );
}
