"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, BookOpen, Brain, Camera, Check, ChevronLeft, Code2, Compass, Dumbbell, Languages, LineChart, Map as MapIcon,
  Music, Palette, Rocket, Shield, Trash2,
} from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { GradientRing } from "@/components/GradientRing";
import { RoadmapBuildStatus, type BuildInfo } from "@/components/RoadmapBuildStatus";
import { RoadmapJourney } from "@/components/RoadmapJourney";
import { faNum } from "@/lib/jalali";
import { levelLabel } from "@/lib/roadmapPlan";
import { tr, pick } from "@/lib/i18n";

// اجزای صفحه‌ی فهرست رودمپ‌ها: کارت «ادامه بده»، فهرست ردیفی، سازنده‌ی
// سریع (فیلد + پیشنهادها) و خلاصه‌ی آمار. همه بدون بک‌گراند اضافه؛ سطح
// باکس‌ها همان .trade-surface مشترک اپ است.

export type RoadmapCardData = {
  id: string;
  topic: string;
  title: string;
  summary: string | null;
  goal: string | null;
  totalDuration: string | null;
  level: string | null;
  stageCount: number;
  doneCount: number;
  pct: number;
  build: BuildInfo;
};

type IconCmp = LucideIcon;

// آیکون کاشی از روی موضوع: اول واژه‌ی کلیدی، وگرنه هش ثابت نام تا هر مسیر
// همیشه همان آیکون را داشته باشد.
const KEYWORD_ICONS: [RegExp, IconCmp][] = [
  [/برنامه|کد|وب|پایتون|ری‌اکت|react|code|program|web|python|java|dev|software/i, Code2],
  [/امنیت|هک|شبکه|secur|hack|network|cyber/i, Shield],
  [/داده|هوش|ماشین|data|ai\b|machine|ml\b|learning/i, Brain],
  [/طراحی|ui|ux|گرافیک|design|figma|art/i, Palette],
  [/زبان|انگلیسی|آلمانی|language|english|german|french|spanish/i, Languages],
  [/ویدیو|فیلم|عکس|ادیت|video|photo|film|edit/i, Camera],
  [/موسیقی|گیتار|پیانو|music|guitar|piano/i, Music],
  [/ترید|بازار|مالی|سرمایه|trad|market|financ|invest|stock/i, LineChart],
  [/ورزش|بدنسازی|تمرین|fitness|workout|gym|sport/i, Dumbbell],
  [/کسب|استارتاپ|بیزنس|business|startup|market/i, Rocket],
];
const FALLBACK_ICONS: IconCmp[] = [Compass, BookOpen, Rocket, MapIcon];

export function topicIcon(topic: string): IconCmp {
  for (const [re, Icon] of KEYWORD_ICONS) if (re.test(topic)) return Icon;
  let h = 0;
  for (let i = 0; i < topic.length; i++) h = (h * 31 + topic.charCodeAt(i)) >>> 0;
  return FALLBACK_ICONS[h % FALLBACK_ICONS.length];
}

/** در حال ساخت یا ناموفق → کارتش در شبکه می‌ماند و جزو «ادامه بده» نیست. */
export function isContinuable(r: RoadmapCardData): boolean {
  return r.stageCount > 0 && r.doneCount < r.stageCount && (!r.build || r.build.status === "ready");
}

// موضوع‌های پیشنهادی سازنده‌ی سریع — یک کلیک موضوع را در فیلد می‌گذارد.
export const ROADMAP_SUGGESTIONS: { fa: string; en: string }[] = [
  { fa: "برنامه‌نویسی وب", en: "Web development" },
  { fa: "امنیت شبکه", en: "Network security" },
  { fa: "تحلیل داده با پایتون", en: "Data analysis with Python" },
  { fa: "طراحی UI/UX", en: "UI/UX design" },
  { fa: "زبان انگلیسی", en: "English language" },
  { fa: "ادیت ویدیو", en: "Video editing" },
];

/** عنوان و مدت مرحله‌ها برای نقشه‌ی سفر؛ لیست فقط شمارش دارد، پس یک بار از همان روت جزئیات خوانده می‌شود. */
function useStageInfo(id: string, total: number): { title: string; duration: string }[] {
  const [info, setInfo] = useState<{ title: string; duration: string }[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/roadmaps/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.plan?.stages) return;
        setInfo((d.plan.stages as { title?: string; duration?: string }[]).map((s) => ({ title: s?.title || "", duration: s?.duration || "" })));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);
  return Array.from({ length: total }, (_, i) => ({
    title: info?.[i]?.title || tr(`مرحله ${faNum(i + 1)}`, `Stage ${faNum(i + 1)}`),
    duration: info?.[i]?.duration || "",
  }));
}

/**
 * گام‌شمار ساده‌ی نمایشی (فقط حالت خالی): نقطه‌های متصل بدون عنوان.
 * نقشه‌ی سفر واقعی مرحله‌ها RoadmapJourney است.
 */
export function RoadmapStepper({ total, done }: { total: number; done: number }) {
  const items = Array.from({ length: total }, (_, i) => i);
  return (
    <ol className="rmx-stepper" aria-hidden="true" style={{ ["--rmx-n" as string]: total }}>
      {items.map((i) => {
        const state = i < done ? "done" : i === done ? "now" : "next";
        return (
          <li key={i} className={`rmx-step is-${state}`}>
            <span className="rmx-step-dot">{state === "done" && <Check size={9} strokeWidth={3.4} />}</span>
            {i < total - 1 && <span className="rmx-step-line" />}
          </li>
        );
      })}
    </ol>
  );
}

function DeleteButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon btn-bare btn-sm rmx-del"
      aria-label={tr(`حذف مسیر «${title}»`, `Delete path "${title}"`)}
      onClick={onClick}
    >
      <Trash2 size={16} />
    </button>
  );
}

/** کارت فشرده‌ی «ادامه بده»: حلقه | عنوان و قدم بعدی | دکمه، و زیرش گام‌شمار عنوان‌دار. */
export function RoadmapContinueCard({ r }: { r: RoadmapCardData }) {
  const stageNo = Math.min(r.doneCount + 1, r.stageCount);
  const info = useStageInfo(r.id, r.stageCount);
  const current = r.doneCount < r.stageCount ? r.doneCount + 1 : undefined;
  return (
    <article className="trade-surface rmx-box rmx-cont">
      <div className="rmx-cont-main">
        <GradientRing value={r.pct / 100} size={88} stroke={7} className="rmx-cont-ring">
          <span className="rmx-ring-num"><bdi dir="ltr">{faNum(r.pct)}%</bdi></span>
        </GradientRing>
        <div className="rmx-cont-text">
          <span className="rmx-kicker">{tr("ادامه بده", "Pick up where you left off")}</span>
          <h2 className="rmx-cont-title">{r.title}</h2>
          <div className="rmx-meta">
            {r.totalDuration && <span>{r.totalDuration}</span>}
            <span>{faNum(r.stageCount)} {tr("مرحله", r.stageCount === 1 ? "stage" : "stages")}</span>
            {levelLabel(r.level) && <span>{levelLabel(r.level)}</span>}
          </div>
          <p className="rmx-next-line">
            <b>{tr("قدم بعدی:", "Next step:")}</b>
            <span className="rmx-next-title">{info[stageNo - 1]?.title}</span>
            <em>{tr(`مرحله ${faNum(stageNo)} از ${faNum(r.stageCount)}`, `Stage ${faNum(stageNo)} of ${faNum(r.stageCount)}`)}</em>
          </p>
        </div>
        <Link href={`/roadmaps/custom/${r.id}`} className="btn btn-primary rmx-cont-cta">
          {tr("ادامه", "Continue")} <ArrowLeft size={16} className="dir-flip" />
        </Link>
      </div>
      <RoadmapJourney
        variant="compact"
        current={current}
        label={tr("مرحله‌ها", "Stages")}
        stages={info.map((x, i) => ({ n: i + 1, title: x.title, duration: x.duration, done: i < r.doneCount }))}
      />
    </article>
  );
}

function RoadmapRow({ r, onDelete }: { r: RoadmapCardData; onDelete: (r: RoadmapCardData) => void }) {
  const Icon = topicIcon(`${r.topic} ${r.title}`);
  const building = r.build && r.build.status !== "ready";
  const complete = r.stageCount > 0 && r.doneCount >= r.stageCount;
  return (
    <li className="rmx-row">
      <span className="rmx-tile"><Icon size={19} strokeWidth={1.8} /></span>
      <div className="rmx-row-text">
        <Link href={`/roadmaps/custom/${r.id}`} className="rmx-row-link">{r.title}</Link>
        <div className="rmx-meta">
          {r.stageCount > 0 && <span>{faNum(r.stageCount)} {tr("مرحله", r.stageCount === 1 ? "stage" : "stages")}</span>}
          {r.totalDuration && <span>{r.totalDuration}</span>}
        </div>
      </div>
      <div className="rmx-row-prog">
        {building ? (
          <RoadmapBuildStatus build={r.build} inline />
        ) : (
          <>
            <div className="rmx-bar" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${r.pct}%` }} />
            </div>
            <span className={`rmx-pct${complete ? " is-done" : ""}`}><bdi dir="ltr">{faNum(r.pct)}%</bdi></span>
          </>
        )}
      </div>
      <DeleteButton onClick={() => onDelete(r)} title={r.title} />
      <ChevronLeft size={16} className="rmx-row-chev dir-flip" aria-hidden="true" />
    </li>
  );
}

/** «رودمپ‌های من»: همه‌ی ردیف‌ها در یک باکس، جداشده با خط مو. */
export function RoadmapList({ roadmaps, onDelete }: { roadmaps: RoadmapCardData[]; onDelete: (r: RoadmapCardData) => void }) {
  return (
    <div className="trade-surface rmx-box rmx-list">
      <header className="rmx-box-head">
        <h2>{tr("رودمپ‌های من", "My roadmaps")}</h2>
        <span className="rmx-count">{faNum(roadmaps.length)}</span>
      </header>
      <ul className="rmx-rows">
        {roadmaps.map((r) => <RoadmapRow key={r.id} r={r} onDelete={onDelete} />)}
      </ul>
    </div>
  );
}

/** سازنده‌ی سریع: فیلد موضوع + چیپ‌های پیشنهاد + دکمه‌ای که ویزارد را با همان موضوع باز می‌کند. */
export function RoadmapComposer({ onStart, bare = false }: { onStart: (topic: string) => void; bare?: boolean }) {
  const [topic, setTopic] = useState("");
  const form = (
    <form
      className="rmx-compose"
      onSubmit={(e) => { e.preventDefault(); onStart(topic.trim()); }}
    >
      <input
        type="text"
        className="wsearch-newform-name rmx-field"
        aria-label={tr("چی می‌خوای یاد بگیری؟", "What do you want to learn?")}
        placeholder={tr("چی می‌خوای یاد بگیری؟", "What do you want to learn?")}
        value={topic}
        maxLength={120}
        onChange={(e) => setTopic(e.target.value)}
      />
      <div className="rmx-chips">
        {ROADMAP_SUGGESTIONS.map((s) => (
          <button key={s.fa} type="button" className="rmx-chip" onClick={() => setTopic(pick(s))}>
            {pick(s)}
          </button>
        ))}
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        {tr("ساخت مسیر", "Create path")} <ArrowLeft size={16} className="dir-flip" />
      </button>
    </form>
  );
  if (bare) return form;
  return (
    <div className="trade-surface rmx-box rmx-composer">
      <h2 className="rmx-box-title">{tr("ساخت رودمپ تازه", "Build a new roadmap")}</h2>
      {form}
    </div>
  );
}

/** سه عدد خلاصه: دسکتاپ سه خط زیر هم، موبایل یک ردیف سه‌ستونه. */
export function RoadmapSummary({ roadmaps }: { roadmaps: RoadmapCardData[] }) {
  const withStages = roadmaps.filter((r) => r.stageCount > 0);
  const active = withStages.filter((r) => r.doneCount < r.stageCount).length;
  const done = withStages.reduce((n, r) => n + r.doneCount, 0);
  const total = withStages.reduce((n, r) => n + r.stageCount, 0);
  const avg = withStages.length ? Math.round(withStages.reduce((n, r) => n + r.pct, 0) / withStages.length) : 0;
  return (
    <div className="trade-surface rmx-box rmx-sum" role="group" aria-label={tr("خلاصه", "Summary")}>
      <div className="rmx-sum-item"><b>{faNum(active)}</b><span>{tr("مسیر فعال", "Active paths")}</span></div>
      <div className="rmx-sum-item"><b><bdi dir="ltr">{faNum(done)}/{faNum(total)}</bdi></b><span>{tr("مرحله‌ی انجام‌شده", "Stages done")}</span></div>
      <div className="rmx-sum-item"><b><bdi dir="ltr">{faNum(avg)}%</bdi></b><span>{tr("میانگین پیشرفت", "Avg. progress")}</span></div>
    </div>
  );
}
