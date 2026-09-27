"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import type { MeritBreakdown, MeritComponentKey, IneligibleReason } from "@/lib/mentorRanking";

// بخشِ «رتبه‌بندی» در جزئیاتِ منتورِ پنلِ ادمین — توضیحِ عددیِ امتیازِ شایستگی
// (lib/mentorRanking.ts). هر ستون یک دامنه (کلی + هر حوزه‌ی منتور). مستقل از بقیه‌ی
// صفحه: دادهٔ خودش رو از /api/admin/mentors/:id/ranking می‌گیره.

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

const COMPONENT_LABELS: Record<MeritComponentKey, string> = {
  adherence: "پایبندی شاگردها به برنامه",
  completion: "تکمیل برنامه",
  reviews: "نظرهای تأییدشده",
  retention: "ماندگاری ۴ هفته‌ای",
  response: "سرعت پاسخ",
  renewal: "ادامه با برنامه‌ی بعدی",
};
const COMPONENT_ORDER: MeritComponentKey[] = ["adherence", "completion", "reviews", "retention", "response", "renewal"];

const MULTIPLIER_LABELS: Record<keyof MeritBreakdown["multipliers"], string> = {
  evidence: "ضریب شواهد (شاگرد با نتیجه)",
  trust: "ضریب احراز هویت و مدرک",
  integrity: "ضریب گزارش‌ها و تعلیق",
  activity: "ضریب حضور اخیر",
};

const REASON_LABELS: Record<IneligibleReason, string> = {
  few_students: "کمتر از ۳ شاگرد با نتیجه‌ی قابل اندازه‌گیری",
  little_evidence: "کمتر از ۲۰ ثبت اجرای برنامه و کمتر از ۳ نظر تأییدشده",
  identity_unverified: "هویت تأیید نشده",
  integrity: "گزارش تأییدشده یا تعلیق اخیر",
};

const I = { size: 15, strokeWidth: 1.75 } as const;
const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const scopeLabel = (s: string) => (s === "ALL" ? "کلی" : isMentorCategory(s) ? MENTOR_CATEGORY_META[s].label : s);
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
          <Trophy {...I} className="admin-title-icon" style={{ display: "inline-block" }} aria-hidden />رتبه‌بندی شایستگی
        </span>
        <button type="button" className="admin-btn" onClick={load} disabled={busy}>
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden /> محاسبه‌ی دوباره
        </button>
      </div>
      <div className="admin-section-hint" style={{ margin: "0 0 10px" }}>
        امتیاز = ۱۰۰ × کیفیت × ضریب‌ها. کیفیت میانگین وزن‌دار شش مؤلفه است و هر مؤلفه با نمونه‌ی کم به سمت مقدار پیش‌فرض کشیده می‌شود.
        فقط داده‌ی شاگردهای معتبر شمرده می‌شود؛ حساب‌های مسدود، حذف‌شده و آزمایشی کنار گذاشته می‌شوند.
      </div>

      {error && !rows ? (
        <div className="admin-empty">
          <span>رتبه‌بندی دریافت نشد</span>
          <button type="button" className="admin-btn" onClick={load}><RefreshCw size={14} strokeWidth={1.75} aria-hidden /> تلاش دوباره</button>
        </div>
      ) : !rows ? (
        <div className="admin-empty is-loading" role="status" aria-label="در حال دریافت" />
      ) : rows.length === 0 ? (
        <div className="admin-empty">برای این پروفایل رتبه‌ای ساخته نشد</div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>مؤلفه</th>
                  <th>وزن</th>
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
                            {c.raw === null ? "بدون داده؛ مقدار پیش‌فرض" : `خام ${pct(c.raw)}؛ نمونه ${formatNumber(c.sample)}`}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 700 }}>کیفیت</td>
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
                  <td style={{ fontWeight: 700 }}>امتیاز نهایی</td>
                  <td />
                  {rows.map((r) => (
                    <td key={r.scope}>
                      <span className="admin-ltr" style={{ fontWeight: 700 }}>{r.score.toFixed(1)}</span>
                      <span className="admin-muted" style={SUB}>
                        {r.position ? `جایگاه ${formatNumber(r.position)} از ${formatNumber(r.of)}` : "در فهرست نمایش داده نمی‌شود"}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>منتورهای محبوب</td>
                  <td />
                  {rows.map((r) => (
                    <td key={r.scope} style={{ whiteSpace: "normal" }}>
                      {r.eligible ? (
                        <span className="admin-badge green">واجد شرایط</span>
                      ) : (
                        <>
                          <span className="admin-badge gray">واجد شرایط نیست</span>
                          <span className="admin-muted" style={SUB}>{r.breakdown.ineligibleReasons.map((x) => REASON_LABELS[x] ?? x).join("؛ ")}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="admin-info-grid" style={{ marginTop: 12 }}>
            <Info k="شاگرد با نتیجه / کل شاگردهای معتبر" v={`${formatNumber(rows[0].breakdown.sample.students)} / ${formatNumber(rows[0].breakdown.sample.startedStudents ?? rows[0].breakdown.sample.students)}`} />
            <Info k="ثبت اجرای برنامه (۹۰ روز)" v={formatNumber(rows[0].breakdown.sample.adherenceEntries)} />
            <Info k="برنامه‌ی تمام‌شده / قضاوت‌شده" v={`${formatNumber(rows[0].breakdown.sample.programsCompleted)} / ${formatNumber(rows[0].breakdown.sample.programsJudged)}`} />
            <Info
              k="نظر تأییدشده / کنارگذاشته"
              v={`${formatNumber(rows[0].breakdown.sample.verifiedReviews)} / ${formatNumber(rows[0].breakdown.sample.excludedReviews)}${rows[0].breakdown.sample.weightedRating !== null ? `؛ میانگین وزن‌دار ${rows[0].breakdown.sample.weightedRating.toFixed(2)}` : ""}`}
            />
            <Info k="میانه‌ی زمان پاسخ" v={rows[0].breakdown.sample.medianResponseHours === null ? "—" : `${rows[0].breakdown.sample.medianResponseHours} ساعت`} />
            <Info k="آخرین محاسبه" v={formatDateTime(rows[0].computedAt)} />
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
      <span style={{ textAlign: "left" }}>{v}</span>
    </div>
  );
}
