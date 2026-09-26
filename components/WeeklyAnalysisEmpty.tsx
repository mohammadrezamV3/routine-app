"use client";

import Link from "next/link";
import { ChevronLeft, Inbox } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, ANALYSIS_DOMAINS, type AnalysisDomain, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { DashCard } from "./DashCard";
import { DOMAIN_HREFS, DOMAIN_ICONS } from "./WeeklyAnalysisShared";

// هفته‌ای که هیچ دامنه‌ای توش داده نداره — به‌جای یه صفحه‌ی پر از خط‌تیره،
// مستقیم به بخش‌هایی که کاربر بهشون دسترسی داره لینک می‌ده.
export function WeeklyAnalysisEmpty({ domains, isCurrentWeek }: { domains: DomainResult[]; isCurrentWeek: boolean }) {
  const list: AnalysisDomain[] = domains.length > 0 ? domains.map((d) => d.domain) : ANALYSIS_DOMAINS;
  // چند دامنه یک مقصد مشترک دارن (روتین/خواب/کارها → برنامه‌ی هفتگی)؛ لینکِ تکراری نمی‌خوایم
  const seen = new Set<string>();
  const links = list.filter((d) => {
    const href = DOMAIN_HREFS[d];
    if (seen.has(href)) return false;
    seen.add(href);
    return true;
  });

  return (
    <DashCard className="wa-empty-card">
      <Inbox size={28} className="wa-empty-icon" />
      <div className="wa-empty-title">هنوز داده‌ای برای این هفته ثبت نشده</div>
      <div className="wa-muted-sm">
        {isCurrentWeek ? "از همین امروز چیزی ثبت کن تا تحلیل این هفته شکل بگیره." : "توی این هفته فعالیتی ثبت نشده بود."}
      </div>
      {isCurrentWeek && (
        <div className="wa-empty-links">
          {links.map((d) => {
            const Icon = DOMAIN_ICONS[d];
            const sameHref = list.filter((x) => DOMAIN_HREFS[x] === DOMAIN_HREFS[d]).map((x) => ANALYSIS_DOMAIN_LABELS[x]);
            return (
              <Link key={d} href={DOMAIN_HREFS[d]} className="wa-empty-link">
                <Icon size={15} />
                <span>{sameHref.join(" / ")}</span>
                <ChevronLeft size={14} className="wa-empty-link-chev" />
              </Link>
            );
          })}
        </div>
      )}
    </DashCard>
  );
}
