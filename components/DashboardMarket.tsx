"use client";

// «بازار و اخبارِ اقتصادی» — جلسه‌های فارکس به‌صورتِ زنده (همون منطقِ DST-درستِ
// lib/forexSessions.ts که صفحه‌ی ساعت استفاده می‌کنه) + شمارشِ معکوسِ نزدیک‌ترین
// خبرِ مهم و فهرستِ رویدادهای پیشِ‌رو از جدولِ تقویمِ خودمون (نه سرویسِ بیرونی).
// فقط شمارنده ثانیه‌ای رندر می‌شه؛ بقیه‌ی کارت دقیقه‌ای.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { faNum } from "@/lib/jalali";
import { isForexOpen, sessionArcs, upcomingSession, SESSION_LABELS, SESSION_OVERLAPS } from "@/lib/forexSessions";
import { durationParts } from "@/lib/dashboardCompute";
import type { DashEvent } from "@/lib/dashboardTypes";
import { BentoCard, CardHead, D_EASE, Skel } from "./DashboardKit";
import { FlagCircle } from "./FlagCircle";

const SESSION_FLAG = { SYDNEY: "AU", TOKYO: "JP", LONDON: "GB", NEWYORK: "US" } as const;
const IMPACT_LABEL = { HIGH: "مهم", MEDIUM: "متوسط", LOW: "کم" } as const;

function useTick(ms: number) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function fmtDur(ms: number) {
  const { d, h, m } = durationParts(ms);
  if (d) return `${faNum(d)} روز و ${faNum(h)} ساعت`;
  if (h) return `${faNum(h)} ساعت و ${faNum(m)} دقیقه`;
  return m ? `${faNum(m)} دقیقه` : "کمتر از یک دقیقه";
}
function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DashboardMarket({ events, loading }: { events: DashEvent[] | null; loading: boolean }) {
  const now = useTick(30_000);
  const arcs = useMemo(() => (now ? sessionArcs(now) : []), [now]);
  const marketOpen = now ? isForexOpen(now) : true;
  const next = useMemo(() => (now && !arcs.some((a) => a.open) ? upcomingSession(now) : null), [now, arcs]);
  const overlap = useMemo(() => SESSION_OVERLAPS.find((o) => arcs.find((a) => a.key === o.a)?.open && arcs.find((a) => a.key === o.b)?.open), [arcs]);

  const upcoming = (events ?? []).filter((e) => now && new Date(e.occursAt).getTime() > now.getTime() - 90 * 60_000);
  const nextEvent = upcoming.find((e) => now && new Date(e.occursAt).getTime() > now.getTime() && e.impact === "HIGH") ?? upcoming.find((e) => now && new Date(e.occursAt).getTime() > now.getTime());

  return (
    <BentoCard area="market" className="db-market" label="بازار و اخبارِ اقتصادی">
      <CardHead icon="globeClock" title="بازار و اخبارِ اقتصادی" href="/trade/clock" hrefLabel="ساعتِ فارکس" />
      <>
          <div className="db-sessions">
            {!now ? (
              <Skel w="100%" h={120} r={12} />
            ) : (
              <>
                <div className={`db-mkt-status${marketOpen ? " is-open" : ""}`}>
                  <span className="db-live-dot" />
                  {!marketOpen ? "بازار فارکس تعطیله (آخرِ هفته)" : overlap ? `هم‌پوشانیِ ${overlap.label} — پرنوسان‌ترین ساعت‌ها` : arcs.some((a) => a.open) ? `${arcs.filter((a) => a.open).map((a) => SESSION_LABELS[a.key]).join(" و ")} باز است` : "بینِ جلسه‌ها"}
                  {next && <span className="db-mkt-next">{SESSION_LABELS[next.key]} تا {fmtDur(next.at.getTime() - now.getTime())}</span>}
                </div>
                {arcs.map((a, i) => {
                  const total = a.closeAt.getTime() - a.openAt.getTime();
                  const elapsed = Math.max(0, Math.min(1, (now.getTime() - a.openAt.getTime()) / total));
                  return (
                    <div key={a.key} className={`db-sess${a.open ? " is-open" : ""}`}>
                      <FlagCircle code={SESSION_FLAG[a.key]} size={22} />
                      <span className="db-sess-name">{SESSION_LABELS[a.key]}</span>
                      <span className="db-sess-bar">
                        <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: a.open ? elapsed : 0 }} transition={{ duration: 1, ease: D_EASE, delay: 0.2 + i * 0.06 }} />
                      </span>
                      <span className="db-sess-time" dir="ltr">{a.openLabel}–{a.closeLabel}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div className="db-events">
            <span className="db-sub-head">
              رویدادهای مهمِ پیشِ‌رو
              <Link href="/trade/calendar" prefetch className="db-card-more db-card-more-sm">تقویم</Link>
            </span>
            {loading ? (
              <Skel w="100%" h={80} r={12} />
            ) : nextEvent ? (
              <>
                <EventCountdown ev={nextEvent} />
                <ul className="db-ev-list">
                  {upcoming.filter((e) => e.id !== nextEvent.id).slice(0, 4).map((e) => {
                    const at = new Date(e.occursAt);
                    const released = now && at.getTime() <= now.getTime();
                    return (
                      <li key={e.id} className={`db-ev imp-${e.impact}`}>
                        <span className="db-ev-imp" title={IMPACT_LABEL[e.impact]} />
                        <span className="db-ev-cur">{e.currency}</span>
                        <span className="db-ev-title">{e.title}</span>
                        <span className="db-ev-time" dir="ltr">{released ? (e.actual ?? "—") : hhmm(at)}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="db-muted-line">در ۷ روزِ آینده خبرِ مهمی ثبت نشده</p>
            )}
          </div>
      </>
    </BentoCard>
  );
}

function EventCountdown({ ev }: { ev: DashEvent }) {
  const now = useTick(1000);
  const at = new Date(ev.occursAt).getTime();
  const left = now ? at - now.getTime() : 0;
  const { d, h, m } = durationParts(left);
  const s = Math.max(0, Math.floor(left / 1000) % 60);
  const soon = left < 15 * 60_000;
  const cells = d ? [[d, "روز"], [h, "ساعت"], [m, "دقیقه"]] : [[h, "ساعت"], [m, "دقیقه"], [s, "ثانیه"]];
  return (
    <Link href="/trade/calendar" prefetch className={`db-countdown imp-${ev.impact}${soon ? " is-soon" : ""}`}>
      <div className="db-cd-info">
        <span className="db-cd-kicker"><span className="db-ev-imp" /> {ev.currency} · {IMPACT_LABEL[ev.impact]}</span>
        <strong className="db-cd-title">{ev.title}</strong>
        {(ev.forecast || ev.previous) && (
          <span className="db-cd-meta">
            {ev.forecast && <>پیش‌بینی <b dir="ltr">{ev.forecast}</b></>}
            {ev.previous && <> · قبلی <b dir="ltr">{ev.previous}</b></>}
          </span>
        )}
      </div>
      <div className="db-cd-clock" dir="ltr" aria-label="زمان تا انتشار">
        {now ? cells.map(([v, l], i) => (
          <span key={i} className="db-cd-cell">
            <b>{String(v).padStart(2, "0")}</b>
            <em>{l}</em>
          </span>
        )) : <Skel w={120} h={30} />}
      </div>
    </Link>
  );
}
