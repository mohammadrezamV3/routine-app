"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { tr } from "@/lib/i18n";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import { localizedRecord } from "@/lib/localizedRecord";
import type { MeritBreakdown, MeritComponentKey, IneligibleReason } from "@/lib/mentorRanking";

// بخش «رتبه‌بندی» در جزئیات منتور پنل ادمین — توضیح عددی امتیاز شایستگی
// (lib/mentorRanking.ts). هر ستون یک دامنه (کلی + هر حوزه‌ی منتور). مستقل از بقیه‌ی
// صفحه: داده خودش رو از /api/admin/mentors/:id/ranking می‌گیره.

type Row = {
  scope: string;
  score: number;
  ratingScore: number;
  eligible: boolean;
  position: number | null;
  of: number;
  computedAt: string;
  breakdown: MeritBreakdown;
};

const COMPONENT_LABELS: Record<MeritComponentKey, string> = localizedRecord<MeritComponentKey>({
  adherence: ["پایبندی شاگردها به برنامه", "Students' adherence to programs"],
  completion: ["تکمیل برنامه", "Program completion"],
  reviews: ["نظرهای تاییدشده", "Verified reviews"],
  retention: ["ماندگاری 4 هفته‌ای", "4-week retention"],
  response: ["سرعت پاسخ", "Response speed"],
  renewal: ["ادامه با برنامه‌ی بعدی", "Continuing with the next program"],
});
const COMPONENT_ORDER: MeritComponentKey[] = ["adherence", "completion", "reviews", "retention", "response", "renewal"];

const MULTIPLIER_LABELS: Record<keyof MeritBreakdown["multipliers"], string> = localizedRecord<keyof MeritBreakdown["multipliers"]>({
  evidence: ["ضریب شواهد (شاگرد با نتیجه)", "Evidence factor (students with results)"],
  trust: ["ضریب احراز هویت و مدرک", "Identity and document factor"],
  integrity: ["ضریب گزارش‌ها و تعلیق", "Reports and suspension factor"],
  activity: ["ضریب حضور اخیر", "Recent activity factor"],
});

const REASON_LABELS: Record<IneligibleReason, string> = localizedRecord<IneligibleReason>({
  few_students: ["کمتر از 3 شاگرد با نتیجه‌ی قابل اندازه‌گیری", "Fewer than 3 students with measurable results"],
  little_evidence: ["کمتر از 20 ثبت اجرای برنامه و کمتر از 3 نظر تاییدشده", "Fewer than 20 logged program runs and fewer than 3 verified reviews"],
  identity_unverified: ["هویت تایید نشده", "Identity not verified"],
  integrity: ["گزارش تاییدشده یا تعلیق اخیر", "Verified report or recent suspension"],
});

const I = { size: 15, strokeWidth: 1.75 } as const;
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const scopeLabel = (s: string) => (s === "ALL" ? tr("کلی", "Overall") : isMentorCategory(s) ? MENTOR_CATEGORY_META[s].label : s);
const SUB: React.CSSProperties = { display: "block", fontSize: 11.5 };

export function MentorRankingBreakdown({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    setError(false);
    fetch(`/api/admin/mentors/${profileId}/ranking`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { rows: Row[] }) => setRows(d.rows))
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  }, [profileId]);
  useEffect(load, [load]);

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span className="admin-chart-title">
          <Trophy {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />{tr("رتبه‌بندی شایستگی", "Merit ranking")}
        </span>
        <button type="button" className="admin-btn" onClick={load} disabled={busy}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden /> {tr("محاسبه‌ی دوباره", "Recalculate")}
        </button>
      </div>
      <div className="admin-section-hint" style={{ margin: "0 0 10px" }}>
        {tr("امتیاز = 100 × کیفیت × ضریب‌ها. کیفیت میانگین وزن‌دار شش مؤلفه است و هر مؤلفه با نمونه‌ی کم به سمت مقدار پیش‌فرض کشیده می‌شود.", "Score = 100 × quality × factors. Quality is the weighted average of six components; a component with a small sample is pulled toward its default value.")}
        {tr("فقط داده‌ی شاگردهای معتبر شمرده می‌شود؛ حساب‌های مسدود، حذف‌شده و آزمایشی کنار گذاشته می‌شوند.", "Only data from valid students counts; blocked, deleted and trial accounts are excluded.")}
      </div>

      {error && !rows ? (
        <div className="admin-empty">
          <span>{tr("رتبه‌بندی دریافت نشد", "Couldn't load the ranking")}</span>
          <button type="button" className="admin-btn" onClick={load}><RefreshCw size={14} strokeWidth={1.75} aria-hidden /> {tr("تلاش دوباره", "Try again")}</button>
        </div>
      ) : !rows ? (
        <div className="admin-empty is-loading" role="status" aria-label={tr("در حال دریافت", "Loading")} />
      ) : rows.length === 0 ? (
        <div className="admin-empty">{tr("برای این پروفایل رتبه‌ای ساخته نشد", "No ranking has been generated for this profile")}</div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{tr("مؤلفه", "Component")}</th>
                  <th>{tr("وزن", "Weight")}</th>
                  {rows.map((r) => <th key={r.scope}>{scopeLabel(r.scope)}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ORDER.map((k) => (
                  <tr key={k}>
                    <td>{COMPONENT_LABELS[k]}</td>
                    <td className="admin-ltr">{pct(rows[0].breakdown.components[k].weight)}</td>
                    {rows.map((r) => {
                      const c = r.breakdown.components[k];
                      return (
                        <td key={r.scope}>
                          <span className="admin-ltr">{pct(c.value)}</span>
                          <span className="admin-muted" style={SUB}>
                            {c.raw === null ? tr("بدون داده؛ مقدار پیش‌فرض", "No data; default value") : tr(`خام ${pct(c.raw)}؛ نمونه ${formatNumber(c.sample)}`, `Raw ${pct(c.raw)}; sample ${formatNumber(c.sample)}`)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 700 }}>{tr("کیفیت", "Quality")}</td>
                  <td />
                  {rows.map((r) => <td key={r.scope} className="admin-ltr" style={{ fontWeight: 700 }}>{pct(r.breakdown.quality)}</td>)}
                </tr>
                {(Object.keys(MULTIPLIER_LABELS) as (keyof MeritBreakdown["multipliers"])[]).map((m) => (
                  <tr key={m}>
                    <td>{MULTIPLIER_LABELS[m]}</td>
                    <td />
                    {rows.map((r) => <td key={r.scope} className="admin-ltr">×{r.breakdown.multipliers[m].toFixed(2)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 700 }}>{tr("امتیاز نهایی", "Final score")}</td>
                  <td />
                  {rows.map((r) => (
                    <td key={r.scope}>
                      <span className="admin-ltr" style={{ fontWeight: 700 }}>{r.score.toFixed(1)}</span>
                      <span className="admin-muted" style={SUB}>
                        {r.position ? tr(`جایگاه ${formatNumber(r.position)} از ${formatNumber(r.of)}`, `Rank ${formatNumber(r.position)} of ${formatNumber(r.of)}`) : tr("در فهرست نمایش داده نمی‌شود", "Not shown in the list")}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>{tr("مربی‌های محبوب", "Popular mentors")}</td>
                  <td />
                  {rows.map((r) => (
                    <td key={r.scope} style={{ whiteSpace: "normal" }}>
                      {r.eligible ? (
                        <span className="admin-badge green">{tr("واجد شرایط", "Eligible")}</span>
                      ) : (
                        <>
                          <span className="admin-badge gray">{tr("واجد شرایط نیست", "Not eligible")}</span>
                          <span className="admin-muted" style={SUB}>{r.breakdown.ineligibleReasons.map((x) => REASON_LABELS[x] ?? x).join(tr("؛ ", "; "))}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="admin-info-grid" style={{ marginTop: 12 }}>
            <Info k={tr("شاگرد با نتیجه / کل شاگردهای معتبر", "Students with results / all valid students")} v={`${formatNumber(rows[0].breakdown.sample.students)} / ${formatNumber(rows[0].breakdown.sample.startedStudents ?? rows[0].breakdown.sample.students)}`} />
            <Info k={tr("ثبت اجرای برنامه (90 روز)", "Logged program runs (90 days)")} v={formatNumber(rows[0].breakdown.sample.adherenceEntries)} />
            <Info k={tr("برنامه‌ی تمام‌شده / قضاوت‌شده", "Programs completed / judged")} v={`${formatNumber(rows[0].breakdown.sample.programsCompleted)} / ${formatNumber(rows[0].breakdown.sample.programsJudged)}`} />
            <Info
              k={tr("نظر تاییدشده / کنارگذاشته", "Verified / excluded reviews")}
              v={`${formatNumber(rows[0].breakdown.sample.verifiedReviews)} / ${formatNumber(rows[0].breakdown.sample.excludedReviews)}${rows[0].breakdown.sample.weightedRating !== null ? tr(`؛ میانگین وزن‌دار ${rows[0].breakdown.sample.weightedRating.toFixed(2)}`, `; weighted average ${rows[0].breakdown.sample.weightedRating.toFixed(2)}`) : ""}`}
            />
            <Info k={tr("میانه‌ی زمان پاسخ", "Median response time")} v={rows[0].breakdown.sample.medianResponseHours === null ? "—" : tr(`${rows[0].breakdown.sample.medianResponseHours} ساعت`, `${rows[0].breakdown.sample.medianResponseHours} h`)} />
            <Info k={tr("آخرین محاسبه", "Last calculated")} v={formatDateTime(rows[0].computedAt)} />
          </div>
        </>
      )}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="admin-info-row">
      <span className="admin-muted">{k}</span>
      <span style={{ textAlign: "end" }}>{v}</span>
    </div>
  );
}
