"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, BookOpen, Brain, Camera, Code2, Compass, Dumbbell, Languages, LineChart, Map as MapIcon,
  Music, Palette, Plus, Rocket, Shield, Trash2,
} from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { GradientRing } from "@/components/GradientRing";
import { RoadmapBuildStatus, type BuildInfo } from "@/components/RoadmapBuildStatus";
import { faNum } from "@/lib/jalali";
import { levelLabel } from "@/lib/roadmapPlan";
import { tr } from "@/lib/i18n";

// کارت‌های صفحه‌ی فهرست رودمپ‌ها: کارت «ادامه بده»، کارت فشرده‌ی شبکه،
// گام‌شمار افقی و دکمه‌ی ساخت. همه بدون بک‌گراند اضافه؛ سطح کارت همان
// .trade-surface مشترک اپ است.

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

/**
 * گام‌شمار افقی مرحله‌ها: انجام‌شده = نقطه‌ی پر اکسنتی + خط اتصال، مرحله‌ی
 * جاری = حلقه، آینده = نقطه‌ی توخالی کم‌رنگ. فقط نمایشی است (aria-hidden)؛
 * خلاصه‌ی متنی کنارش هست.
 */
export function RoadmapStepper({ total, done }: { total: number; done: number }) {
  const items = Array.from({ length: total }, (_, i) => i);
  return (
    <ol className="rmx-stepper" aria-hidden="true" style={{ ["--rmx-n" as string]: total }}>
      {items.map((i) => {
        const state = i < done ? "done" : i === done ? "now" : "next";
        return (
          <li key={i} className={`rmx-step is-${state}`}>
            <span className="rmx-step-dot" />
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

/** کارت بزرگ «ادامه بده» برای آخرین مسیر در جریان. */
export function RoadmapFeaturedCard({ r, onDelete }: { r: RoadmapCardData; onDelete: (r: RoadmapCardData) => void }) {
  const stageNo = Math.min(r.doneCount + 1, r.stageCount);
  return (
    <article className="trade-surface rmx-feature">
      <div className="rmx-feature-top">
        <span className="rmx-kicker">{tr("ادامه بده", "Pick up where you left off")}</span>
        <DeleteButton onClick={() => onDelete(r)} title={r.title} />
      </div>

      <div className="rmx-feature-main">
        <div className="rmx-feature-text">
          <span className="rmx-topic">{r.topic}</span>
          <h2 className="rmx-feature-title">{r.title}</h2>
          <div className="rmx-meta">
            {r.totalDuration && <span>{r.totalDuration}</span>}
            <span>{faNum(r.stageCount)} {tr("مرحله", r.stageCount === 1 ? "stage" : "stages")}</span>
            {levelLabel(r.level) && <span>{levelLabel(r.level)}</span>}
          </div>
        </div>
        <GradientRing value={r.pct / 100} size={92} stroke={7} className="rmx-feature-ring">
          <span className="rmx-ring-num">{faNum(r.pct)}<small>{tr("٪", "%")}</small></span>
        </GradientRing>
      </div>

      <RoadmapStepper total={r.stageCount} done={r.doneCount} />

      <div className="rmx-feature-foot">
        <p className="rmx-next-line">
          <b>{tr("قدم بعدی", "Next step")}</b>
          <span>{tr(`مرحله ${faNum(stageNo)} از ${faNum(r.stageCount)}`, `Stage ${faNum(stageNo)} of ${faNum(r.stageCount)}`)}</span>
        </p>
        <Link href={`/roadmaps/custom/${r.id}`} className="btn btn-primary">
          {tr("ادامه", "Continue")} <ArrowLeft size={16} className="dir-flip" />
        </Link>
      </div>
    </article>
  );
}

/** کارت فشرده‌ی شبکه‌ی «رودمپ‌های من». */
export function RoadmapGridCard({ r, onDelete }: { r: RoadmapCardData; onDelete: (r: RoadmapCardData) => void }) {
  const Icon = topicIcon(`${r.topic} ${r.title}`);
  const building = r.build && r.build.status !== "ready";
  const complete = r.stageCount > 0 && r.doneCount >= r.stageCount;
  return (
    <div className="trade-surface rmx-card">
      <Link href={`/roadmaps/custom/${r.id}`} className="rmx-card-link" aria-label={r.title} />
      <div className="rmx-card-top">
        <span className="rmx-tile"><Icon size={20} strokeWidth={1.8} /></span>
        <DeleteButton onClick={() => onDelete(r)} title={r.title} />
      </div>
      <h3 className="rmx-card-title">{r.title}</h3>
      <div className="rmx-meta">
        {r.stageCount > 0 && <span>{faNum(r.stageCount)} {tr("مرحله", r.stageCount === 1 ? "stage" : "stages")}</span>}
        {r.totalDuration && <span>{r.totalDuration}</span>}
      </div>
      {building ? (
        <RoadmapBuildStatus build={r.build} compact />
      ) : (
        <div className="rmx-card-foot">
          <div className="rmx-bar" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${r.pct}%` }} />
          </div>
          <span className={`rmx-pct${complete ? " is-done" : ""}`}>{faNum(r.pct)}{tr("٪", "%")}</span>
        </div>
      )}
    </div>
  );
}

/** دکمه‌ی خط‌چین «ساخت رودمپ تازه» — بی‌بک‌گراند. */
export function RoadmapCreateCta({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="rmx-cta" onClick={onClick}>
      <span className="rmx-cta-plus"><Plus size={20} /></span>
      <span className="rmx-cta-text">
        <b>{tr("ساخت رودمپ تازه", "Build a new roadmap")}</b>
        <small>{tr("بگو چی می‌خوای یاد بگیری، مسیرش رو می‌سازم", "Tell us what to learn and we will map the way")}</small>
      </span>
    </button>
  );
}
