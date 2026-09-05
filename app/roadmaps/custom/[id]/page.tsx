"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, BookOpen, Check, ChevronRight, Clock, ExternalLink, Flag,
  Lightbulb, ListChecks, Sparkles, Target, Trash2,
} from "lucide-react";
import { faNum } from "@/lib/jalali";
import { RoadmapStepToProgram } from "@/components/RoadmapStepToProgram";
import { RoadmapDisclaimer } from "@/components/RoadmapDisclaimer";
import { LoadingBlock } from "@/components/Spinner";
import { ROADMAP_DAYS, addMinutes } from "@/lib/roadmapSchedule";

// لینک‌کردن منابع به یک جست‌وجوی واقعی — نه یک URLِ ساختگی که معلوم نیست
// درست باشد، بلکه جست‌وجوی همان عنوان به‌همراهِ موضوعِ رودمپ.
function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

type Session = {
  title: string;
  goal?: string;
  steps: string[];
  howTo?: string;
  refs?: string[];
  checkpoint?: string;
};

type Station = {
  t: string;
  items: string[];
  goal?: string;
  weeks?: number;
  practice?: string;
  checkpoint?: string;
  sessions?: Session[];
};

type Schedule = { jsDays: number[]; minutesPerDay: number; startTime: string };

type Roadmap = {
  id: string;
  title: string;
  topic: string;
  note: string;
  level?: string | null;
  totalWeeks?: number | null;
  stations: Station[];
  tips: string[];
  proTips: string[];
  books: string[];
  mistakes?: string[] | null;
  progress?: Record<string, boolean> | null;
  schedule?: Schedule | null;
};

export default function CustomRoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Roadmap | null | undefined>(undefined);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then((r) => r.json())
      .then((res) => {
        const rm: Roadmap | null = res.roadmap || null;
        setData(rm);
        setDone((rm?.progress as Record<string, boolean>) || {});
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

  function toggle(idx: number) {
    toggleKey(String(idx));
  }

  function toggleKey(key: string) {
    const next = { ...done, [key]: !done[key] };
    setDone(next);
    persist(next);
  }

  async function removeRoadmap() {
    await fetch(`/api/roadmaps/${params.id}`, { method: "DELETE" });
    router.push("/roadmaps");
  }

  if (data === undefined) return <section className="trade-desktop"><LoadingBlock text="در حال آوردن مسیر…" /></section>;
  if (data === null) return <section className="trade-desktop"><div className="item-line empty">این مسیر پیدا نشد.</div></section>;

  const total = data.stations.length;
  const doneCount = data.stations.filter((_, i) => done[String(i)]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const sessionCount = data.stations.reduce((n, st) => n + (st.sessions?.length ?? 0), 0);

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

      {/* سربرگ: عنوان، هدفِ نهایی، و نوارِ پیشرفت */}
      <div className="rm-hero">
        <div className="rm-hero-top">
          <h1>{data.title}</h1>
          <button type="button" className="trade-icon-btn danger" aria-label="حذف مسیر"
                  onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></button>
        </div>
        {data.note && <p className="rm-hero-note">{data.note}</p>}

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

      {/* مرحله‌ها */}
      <ol className="rm-steps">
        {data.stations.map((st, i) => {
          const isDone = !!done[String(i)];
          return (
            <li key={i} className={`rm-step${isDone ? " done" : ""}`}>
              <button type="button" className="rm-step-num" onClick={() => toggle(i)}
                      aria-label={isDone ? "برگرداندن به انجام‌نشده" : "تمام شد"}>
                {isDone ? <Check size={15} /> : faNum(i + 1)}
              </button>

              <div className="rm-step-body">
                <div className="rm-step-head">
                  <h2>{st.t}</h2>
                  {st.weeks ? <span className="rm-step-weeks">{faNum(st.weeks)} هفته</span> : null}
                </div>

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
                  <div className="rm-box rm-practice">
                    <b>تمرین</b>
                    <span>{st.practice}</span>
                  </div>
                )}
                {st.checkpoint && (
                  <div className="rm-box rm-checkpoint">
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
