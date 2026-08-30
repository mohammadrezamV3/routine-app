"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Domain, DOMAIN_LABELS_FA } from "@/lib/weeklyReport/metrics";

export type DomainScoreRowData = {
  domain: Domain;
  active: boolean;
  hasData: boolean;
  score: number | null;
  previousWeek: number | null;
};

function TrendBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous == null) return null;
  const delta = current - previous;
  if (delta === 0) return <span className="wr-trend flat">– ۰٪</span>;
  return <span className={`wr-trend ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta)}٪</span>;
}

// ردیفِ امتیازِ یک دامنه — کلیک‌پذیر به صفحه‌ی جزئیاتش. اگه ماژول برای
// کاربر فعال نیست، اصلاً نمایش داده نمی‌شه (نه صفر، نه خاکستری).
export function DomainScoreRow({ data, href }: { data: DomainScoreRowData; href: string }) {
  if (!data.active) return null;
  return (
    <Link href={href} className="wr-domain-row">
      <span className="wr-domain-label">{DOMAIN_LABELS_FA[data.domain]}</span>
      <span className="wr-domain-end">
        {data.hasData && data.score != null ? (
          <>
            <span className="wr-domain-score">{data.score}</span>
            <TrendBadge current={data.score} previous={data.previousWeek} />
          </>
        ) : (
          <span className="wr-domain-nodata">داده‌ای ثبت نشده</span>
        )}
        <ChevronLeft size={15} className="wr-domain-chevron" />
      </span>
    </Link>
  );
}
