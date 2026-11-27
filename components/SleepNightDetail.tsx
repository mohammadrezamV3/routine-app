"use client";

import "./sleep-detail.css";
import { Pencil } from "lucide-react";
import { SleepScoreInfoButton } from "./SleepScoreInfo";
import { faNum, jMonthName, toJalali, weekdayName } from "@/lib/jalali";
import { tr } from "@/lib/i18n";
import {
  clockOf, durationLabel, scoreBand, scoreBandLabel, sleepMinutes, sleepScore, tagLabel, SLEEP_TAGS,
  type SleepRecord,
} from "@/lib/sleep";
import { goalDiffKind, signedDuration } from "@/lib/sleepWeekStats";

// نمای کامل یک شب: همه‌ی چیزی که فرم ثبت ذخیره می‌کنه (ساعت خواب/بیداری، مدت،
// تا خواب رفتن، بیدارشدن، چرت، کیفیت، عوامل، یادداشت) + امتیاز و فاصله با هدف.
// مشترک بین هفت شب اخیر و پنجره‌ی آمار؛ هیچ منطق جدایی نداره.

const QUALITY_EN = ["", "Very bad", "Bad", "Okay", "Good", "Great"];
const QUALITY_FA = ["", "خیلی بد", "بد", "معمولی", "خوب", "عالی"];

export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const [, jm, jd] = toJalali(y, m, d);
  return `${weekdayName(new Date(y, m - 1, d).getDay())} ${faNum(jd)} ${jMonthName(jm - 1)}`;
}

export function SleepNightDetail({
  rec, goalMin, targetBed, onEdit, title, badge,
}: {
  rec: SleepRecord;
  goalMin: number;
  /** ساعت خواب هدف (HH:mm) برای امتیاز */
  targetBed: string | null;
  onEdit?: () => void;
  title?: string;
  badge?: string | null;
}) {
  const dur = sleepMinutes(rec);
  const bm = targetBed ? /^(\d{1,2}):(\d{2})$/.exec(targetBed) : null;
  const sc = sleepScore(rec, { goalMin, targetBedMin: bm ? Number(bm[1]) * 60 + Number(bm[2]) : null });
  const band = scoreBand(sc.score);
  const diff = dur - goalMin;
  const q = rec.quality ?? null;
  const dash = "-";
  const mins = (n: number | null | undefined) => (typeof n === "number" ? tr(`${faNum(n)} دقیقه`, `${n} min`) : dash);
  const tags = (rec.tags ?? []).filter((k) => SLEEP_TAGS.some((t) => t.key === k));

  return (
    <div className="snd">
      <div className="snd-head">
        <div className="snd-title">
          <b>{title ?? longDate(rec.date)}{badge ? <em>{badge}</em> : null}</b>
        </div>
        {onEdit && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Pencil aria-hidden="true" width={15} height={15} />{tr("ویرایش", "Edit")}
          </button>
        )}
      </div>

      <div className="snd-grid">
        <div><span>{tr("ساعت خواب", "Bedtime")}</span><b dir="ltr">{faNum(clockOf(rec.sleptAt))}</b></div>
        <div><span>{tr("ساعت بیداری", "Wake-up")}</span><b dir="ltr">{faNum(clockOf(rec.wokeAt))}</b></div>
        <div><span>{tr("مدت خواب", "Duration")}</span><b>{durationLabel(dur)}</b></div>
        <div>
          <span>{tr("نسبت به هدف", "Vs goal")}</span>
          <b dir="ltr" className={`snd-diff is-${goalDiffKind(diff)}`}>{faNum(signedDuration(diff))}</b>
        </div>
        <div><span>{tr("تا خواب رفتن", "Time to fall asleep")}</span><b>{mins(rec.latencyMin)}</b></div>
        <div><span>{tr("بیدارشدن وسط شب", "Night awakenings")}</span><b>{typeof rec.awakenings === "number" ? faNum(rec.awakenings) : dash}</b></div>
        <div><span>{tr("چرت روز", "Daytime nap")}</span><b>{mins(rec.napMin)}</b></div>
        <div><span>{tr("کیفیت", "Quality")}</span><b>{q ? `${faNum(q)} / 5 · ${tr(QUALITY_FA[q], QUALITY_EN[q])}` : dash}</b></div>
        <div className="snd-score">
          <span>{tr("امتیاز", "Score")}</span>
          <b className={`slp-c-${band}`}>{faNum(sc.score)} <small>{scoreBandLabel(band)}</small><SleepScoreInfoButton parts={sc.parts} /></b>
        </div>
      </div>

      <div className="snd-block">
        <span>{tr("عوامل اثرگذار", "What affected the night")}</span>
        {tags.length ? (
          <div className="snd-tags">
            {tags.map((k) => {
              const eff = SLEEP_TAGS.find((t) => t.key === k)?.effect;
              return <i key={k} className={`snd-tag is-${eff}`}>{tagLabel(k)}</i>;
            })}
          </div>
        ) : <b>{dash}</b>}
      </div>
      <div className="snd-block">
        <span>{tr("یادداشت", "Note")}</span>
        {rec.note ? <p>{rec.note}</p> : <b>{dash}</b>}
      </div>
    </div>
  );
}
