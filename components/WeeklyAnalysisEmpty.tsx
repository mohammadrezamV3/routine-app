"use client";

import "./weekly-analysis.css";
import "./wa-cards.css";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { ANALYSIS_DOMAIN_LABELS, ANALYSIS_DOMAINS, type AnalysisDomain, type DomainResult } from "@/lib/weeklyAnalysis/types";
import { DOMAIN_HREFS, DOMAIN_ICONS, V_WK_CARD } from "./WeeklyAnalysisKit";

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
    <motion.section className="wk-card wc-empty" variants={V_WK_CARD}>
      <svg className="wc-empty-art" viewBox="0 0 150 130" fill="none" aria-hidden="true">
        <circle className="rg" cx="75" cy="68" r="54" stroke="currentColor" strokeOpacity=".16" strokeWidth="5" />
        <circle className="rg" cx="75" cy="68" r="54" stroke="currentColor" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" strokeDasharray="90 250" transform="rotate(-90 75 68)" />
        <circle className="rg" cx="75" cy="68" r="38" stroke="currentColor" strokeOpacity=".16" strokeWidth="5" />
        <circle className="rg" cx="75" cy="68" r="38" stroke="currentColor" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" strokeDasharray="50 190" transform="rotate(90 75 68)" />
        <circle className="rg" cx="75" cy="68" r="22" stroke="currentColor" strokeOpacity=".16" strokeWidth="5" />
        <circle className="core" cx="75" cy="68" r="6" fill="currentColor" fillOpacity=".8" />
        <path className="sp" d="M122 16 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="currentColor" />
        <path className="sp b" d="M22 28 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="currentColor" />
        <path className="sp c" d="M128 100 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="currentColor" />
      </svg>
      <h2 className="wc-empty-title">{isCurrentWeek ? "این هفته هنوز خالیه" : "توی این هفته چیزی ثبت نشده بود"}</h2>
      <p className="wk-muted">
        {isCurrentWeek ? "از همین امروز چیزی ثبت کن تا تحلیل این هفته شکل بگیره." : "برای دیدن تحلیل، یکی از هفته‌های پرفعالیت‌تر رو از نوار بالا انتخاب کن."}
      </p>
      {isCurrentWeek && (
        <div className="wc-empty-links">
          {links.map((d) => {
            const Icon = DOMAIN_ICONS[d];
            const same = list.filter((x) => DOMAIN_HREFS[x] === DOMAIN_HREFS[d]).map((x) => ANALYSIS_DOMAIN_LABELS[x]);
            return (
              <Link key={d} href={DOMAIN_HREFS[d]} className="wc-empty-link" prefetch={false}>
                <Icon size={15} />
                <span>{same.join(" / ")}</span>
                <ChevronLeft size={14} className="wc-empty-chev" />
              </Link>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
