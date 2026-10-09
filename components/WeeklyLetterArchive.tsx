"use client";

// آرشیو آنالیز هفتگی (/analysis/weekly/letters): هفته‌ی جاری «در جریان» بالا،
// بعد شماره‌های ثبت‌شده به‌صورت کارت، گروه‌بندی بر اساس ماه جلالی، نقطه‌ی
// خوانده‌نشده و حالت خالی. لینک هر کارت خود خواننده‌ست (?week=).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { ArrowLeft, BarChart3, Inbox, Newspaper } from "lucide-react";
import type { LetterSummary } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import { LazyRing, Reveal, WeeklyLetterGate, WlError, wlFetch } from "./WeeklyLetterShared";
import { ARCH_ICONS } from "./WeeklyLetterCover";
import { BAND_COLOR, groupByJalaliMonth, scoreBand } from "./WeeklyLetterUtils";

function IssueCard({ l, featured, i }: { l: LetterSummary; featured: boolean; i: number }) {
  const Arch = l.archetype ? ARCH_ICONS[l.archetype.key] : null;
  const score = l.score;
  const color = BAND_COLOR[scoreBand(score)];
  return (
    <Reveal className={featured ? "wl-issue-wrap is-featured" : "wl-issue-wrap"} delay={Math.min(i, 3) * 0.06}>
      <Link href={`/analysis/weekly?week=${l.weekStart}`} className={`wl-card wl-issue${featured ? " is-featured" : ""}${l.read ? "" : " is-unread"}`} style={{ ["--c" as string]: color } as React.CSSProperties} prefetch>
        <LazyRing value={score === null ? 0 : score / 100} size={featured ? 92 : 68} stroke={featured ? 9 : 7} delay={0.1}>
          <span className="wl-issue-score">{score === null ? "—" : Math.round(score)}</span>
        </LazyRing>
        <div className="wl-issue-body">
          <div className="wl-issue-top">
            <b className="wl-issue-no">{tr("شماره", "Issue")} {l.issueNo}</b>
            {!l.read && <span className="wl-new"><i className="wl-dot" aria-hidden="true" />{tr("جدید", "New")}</span>}
            {l.grade && <span className="wl-issue-grade" aria-label={tr(`درجه ${l.grade}`, `Grade ${l.grade}`)}>{l.grade}</span>}
          </div>
          <span className="wl-issue-week">{l.weekLabel}</span>
          {l.headline && <p className="wl-issue-head">{l.headline}</p>}
          <div className="wl-issue-foot">
            {l.archetype && Arch ? (
              <span className={`wl-arch-chip is-${l.archetype.tone}`}><Arch size={13} />{l.archetype.title}</span>
            ) : <span />}
            <span className="wl-issue-go">{tr("بخوان", "Read")}<ArrowLeft size={14} className="dir-flip" /></span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

function ArchiveSkeleton() {
  return (
    <div className="wl-skel-list" aria-busy="true">
      {[0, 1, 2].map((k) => <div key={k} className="wl-skel wl-skel-issue" />)}
    </div>
  );
}

function ArchiveInner() {
  const [letters, setLetters] = useState<LetterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    wlFetch<{ letters?: LetterSummary[] }>("/api/analysis/letters")
      .then((r) => setLetters(Array.isArray(r.letters) ? [...r.letters].sort((a, b) => b.weekStart.localeCompare(a.weekStart)) : []))
      .catch((e) => setError(e instanceof WlError ? e.message : tr("مشکلی پیش اومد", "Something went wrong")));
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => groupByJalaliMonth(letters ?? []), [letters]);
  const unread = (letters ?? []).filter((l) => !l.read).length;
  let idx = -1;

  return (
    <section className="wl-root wl-page wl-archive">
      <div className="wl-arch-head">
        <span className="page-title-icon"><Newspaper /></span>
        <h1>{tr("آرشیو آنالیز هفتگی", "Weekly review archive")}</h1>
        {unread > 0 && <span className="wl-count">{unread} {tr("جدید", "new")}</span>}
        <Link href="/analysis/weekly" className="wl-back wl-back-end"><BarChart3 size={16} />{tr("هفته‌ی جاری", "Current week")}</Link>
      </div>

      <Link href="/analysis/weekly" className="wl-card wl-rd-now" prefetch={false}>
        <i className="wl-live-dot" aria-hidden="true" />
        <span><b>{tr("این هفته", "This week")}</b><small>{tr("در جریان، همین حالا به‌روز می‌شه", "In progress, updated live")}</small></span>
        <ArrowLeft size={16} className="dir-flip" />
      </Link>

      {error && !letters ? (
        <div className="wl-card wl-state">
          <p>{error}</p>
          <button type="button" className="account-outline-btn wl-cta-btn" onClick={load}>{tr("تلاش دوباره", "Try again")}</button>
        </div>
      ) : !letters ? (
        <ArchiveSkeleton />
      ) : letters.length === 0 ? (
        <Reveal className="wl-card wl-state wl-empty">
          <span className="wl-state-ico"><Inbox size={26} /></span>
          <h2>{tr("هنوز شماره‌ای در آرشیو نیست", "No issues in the archive yet")}</h2>
          <p>{tr("هر شنبه صبح آنالیز هفته‌ی قبلت این‌جا ثبت می‌شه.", "Every Saturday morning your previous week's review is saved here.")}</p>
          <Link href="/analysis/weekly" className="account-outline-btn wl-cta-btn">{tr("آنالیز این هفته", "This week's review")}</Link>
        </Reveal>
      ) : (
        groups.map((g) => (
          <div key={g.key} className="wl-month">
            <Reveal className="wl-month-head">
              <h2>{g.label}</h2>
              <span className="wl-month-n">{g.items.length} {tr("شماره", g.items.length === 1 ? "issue" : "issues")}</span>
              <span className="wl-ch-line" aria-hidden="true" />
            </Reveal>
            <div className="wl-issue-grid">
              {g.items.map((l) => {
                idx += 1;
                return <IssueCard key={l.weekStart} l={l} featured={idx === 0} i={idx} />;
              })}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function WeeklyLetterArchive() {
  return (
    <MotionConfig reducedMotion="user">
      <WeeklyLetterGate skeleton={<section className="wl-root wl-page"><ArchiveSkeleton /></section>}>
        <ArchiveInner />
      </WeeklyLetterGate>
    </MotionConfig>
  );
}
