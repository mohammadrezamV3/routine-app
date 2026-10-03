"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Inbox } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, ANALYSIS_DOMAINS, type AnalysisDomain, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { DOMAIN_HREFS, DOMAIN_ICONS, V_WK_CARD, domainColor } from "./WeeklyAnalysisKit";

// هفته‌ای که هیچ دامنه‌ای توش داده نداره — به‌جای یه صفحه‌ی پر از خط‌تیره،
// مستقیم به بخش‌هایی که کاربر بهشون دسترسی داره لینک می‌ده.
export function WeeklyAnalysisEmpty({ domains, isCurrentWeek }: { domains: DomainResult[]; isCurrentWeek: boolean }) {
  const list: AnalysisDomain[] = domains.length > 0 ? domains.map((d) => d.domain) : ANALYSIS_DOMAINS;
  // چند دامنه یک مقصد مشترک دارن (روتین/خواب/کارها → برنامه‌ی هفتگی)؛ لینک تکراری نمی‌خوایم
  const seen = new Set<string>();
  const links = list.filter((d) => {
    const href = DOMAIN_HREFS[d];
    if (seen.has(href)) return false;
    seen.add(href);
    return true;
  });

  return (
    <motion.section className="wk-card wk-empty" variants={V_WK_CARD}>
      <span className="wk-empty-ic"><Inbox size={26} /></span>
      <h2 className="wk-empty-title">{isCurrentWeek ? "این هفته هنوز خالیه" : "توی این هفته چیزی ثبت نشده بود"}</h2>
      <p className="wk-muted">
        {isCurrentWeek ? "از همین امروز چیزی ثبت کن تا تحلیل این هفته شکل بگیره." : "برای دیدن تحلیل، یکی از هفته‌های پرفعالیت‌تر رو از نوار بالا انتخاب کن."}
      </p>
      {isCurrentWeek && (
        <div className="wk-empty-links">
          {links.map((d) => {
            const Icon = DOMAIN_ICONS[d];
            const same = list.filter((x) => DOMAIN_HREFS[x] === DOMAIN_HREFS[d]).map((x) => ANALYSIS_DOMAIN_LABELS[x]);
            return (
              <Link key={d} href={DOMAIN_HREFS[d]} className="wk-empty-link" prefetch={false}>
                <Icon size={15} style={{ color: domainColor(d) }} />
                <span>{same.join(" / ")}</span>
                <ChevronLeft size={14} className="wk-empty-chev" />
              </Link>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
