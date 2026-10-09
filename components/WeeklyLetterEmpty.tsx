"use client";

// حالت «این هفته هیچ‌چیز ثبت نشده»: به‌جای صفحه‌ی خالی، لینک به بخش‌هایی که
// ثبت از اون‌ها شروع می‌شه. وقتی هفته داده داره null می‌ده.
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, type AnalysisDomain } from "@/lib/weeklyAnalysis/types";
import { tr } from "@/lib/i18n";
import type { LetterCtx } from "./WeeklyLetterCtx";
import { DOMAIN_HREFS, DOMAIN_ICONS, Reveal } from "./WeeklyLetterShared";
import "./weekly-letter.css";

const SHOWN: AnalysisDomain[] = ["routine", "fitness", "sleep", "nutrition", "trading", "learning"];

export function WeeklyLetterEmpty({ ctx }: { ctx: LetterCtx }) {
  const a = ctx.analysis;
  const hasData = a.domains.some((d) => d.hasData) || a.days.some((d) => d.score !== null);
  if (hasData) return null;
  return (
    <Reveal className="wl-card wl-dp-empty">
      <span className="wl-dp-empty-ico"><Newspaper size={26} /></span>
      <h3>{ctx.isCurrent ? tr("این هفته هنوز چیزی ثبت نشده", "Nothing logged yet this week") : tr("این هفته چیزی ثبت نشده بود", "Nothing was logged this week")}</h3>
      <p>{ctx.isCurrent ? tr("با ثبت اولین روتین، خواب یا تمرین، آنالیز همین‌جا ساخته می‌شه.", "Once you log your first routine, sleep or workout, your analysis will be built right here.") : tr("برای هفته‌های بعدی، ثبت روزانه آنالیز رو پر می‌کنه.", "For the coming weeks, daily logging will fill in your analysis.")}</p>
      <div className="wl-dp-empty-links">
        {SHOWN.map((d) => {
          const Icon = DOMAIN_ICONS[d];
          return (
            <Link key={d} href={DOMAIN_HREFS[d]} className="wl-dp-empty-link" prefetch={false}>
              <Icon size={16} />
              <span>{ANALYSIS_DOMAIN_LABELS[d]}</span>
              <ArrowLeft size={13} className="dir-flip" />
            </Link>
          );
        })}
      </div>
    </Reveal>
  );
}
