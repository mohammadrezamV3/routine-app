"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WEEK_ORDER, tasksForDate, timeStartMinutes, timeEndMinutes, splitTimeRange } from "@/lib/schedule";
import { dayFillFraction, positionTimedTasks, awakeFraction } from "@/lib/weeklyTimeline";
import { getCustomOccurrences, getRemovedOccurrences } from "@/lib/storage";
import { ProgramCard } from "@/components/ProgramCard";
import { WeeklySearchPanel } from "@/components/WeeklySearchPanel";
import { EditOccurrenceForm } from "@/components/EditOccurrenceForm";

const now = new Date();

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean };

export default function WeeklyPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(
    WEEK_ORDER.findIndex((o) => o.jsDay === now.getDay())
  );
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string }[]>([]);
  const [cardName, setCardName] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ name: string; occ: Occ } | null>(null);

  async function refresh() {
    const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
    setRemovedOcc(new Set(removed));
    setCustomOcc(custom);
  }

  useEffect(() => { refresh(); }, []);

  const timelineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // اسکرول خودکار تایم‌لاین موبایل (عمودی) به موقعیت زمان فعلی، فقط برای
  // روزی که باز شده و «امروز»ه — پورت از resetWeekTimelineScroll نسخه اصلی.
  useEffect(() => {
    if (openIdx === null) return;
    const isMobile = window.matchMedia("(max-width:700px)").matches;
    if (!isMobile) return;
    const isToday = WEEK_ORDER[openIdx]?.jsDay === now.getDay();
    if (!isToday) return;
    const id = setTimeout(() => {
      const tl = timelineRefs.current[openIdx];
      if (!tl) return;
      const track = tl.querySelector(".week-timeline-track") as HTMLElement | null;
      const trackH = track ? track.offsetHeight : tl.scrollHeight;
      const d = new Date();
      const mins = d.getHours() * 60 + d.getMinutes();
      const pct = awakeFraction(mins);
      const target = pct * trackH - tl.clientHeight / 2;
      tl.scrollTop = Math.max(0, target);
    }, 60);
    return () => clearTimeout(id);
  }, [openIdx]);

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  return (
    <section>
      <div className="weekly-head-row">
        <h1>برنامه هفتگی</h1>
        <button className="fab-add" aria-label="ویرایش برنامه" onClick={() => setSearchOpen(true)}>
          <span className="fab-add-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M14.7 4.3a1.5 1.5 0 0 1 2.1 0l2.9 2.9a1.5 1.5 0 0 1 0 2.1L9.5 19.5 4 21l1.5-5.5L14.7 4.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M13 6l5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </div>

      <div className="weekly-glass">
        {WEEK_ORDER.map((o, idx) => {
          const d = new Date(now);
          d.setDate(now.getDate() + (o.jsDay - now.getDay()));
          const items = tasksForDate(d, opts);
          const isToday = o.jsDay === now.getDay();
          const isOpen = openIdx === idx;
          const fillPct = Math.round(dayFillFraction(o.jsDay, WEEK_ORDER, now) * 1000) / 10;

          const timedItems = items.filter((t) => timeStartMinutes(t.time) !== null);
          const untimedItems = items.filter((t) => timeStartMinutes(t.time) === null);

          const todayPos = WEEK_ORDER.findIndex((oo) => oo.jsDay === now.getDay());
          const nowMinRaw = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
          let effTodayPos = todayPos, effNowMin = nowMinRaw;
          if (nowMinRaw < 6 * 60) {
            effTodayPos = (todayPos - 1 + WEEK_ORDER.length) % WEEK_ORDER.length;
            effNowMin = nowMinRaw + 24 * 60;
          }
          const positioned = positionTimedTasks(timedItems, timeStartMinutes, timeEndMinutes, idx, effTodayPos, effNowMin);

          return (
            <div key={o.jsDay} className={`week-day${isOpen ? " open" : ""}`}>
              <div className="week-day-head" onClick={() => setOpenIdx(isOpen ? null : idx)}>
                <span className={`week-day-name${isToday ? " today" : ""}`}>{o.name}</span>
                <span className="week-day-chevron" />
              </div>
              <div className="week-day-body" style={{ maxHeight: isOpen ? "none" : "0px", overflow: "hidden" }}>
                {items.length ? (
                  <div className="week-timeline" ref={(el) => { timelineRefs.current[idx] = el; }}>
                    <div className="week-timeline-track">
                      <div className="wt-fill-track">
                        <div className="wt-fill-green" style={{ ["--fill" as any]: fillPct + "%" }}>
                          <span className="wt-fill-wave" />
                        </div>
                      </div>

                      <div className="wt-item wt-endpoint" style={{ ["--pos" as any]: "20px" }}>
                        <div className="wt-marker-col"><div className="wt-time-above">۰۹:۳۰</div></div>
                        <div className="wt-content"><div className="wt-name">بیداری</div></div>
                      </div>

                      {positioned.map((p) => {
                        const r = splitTimeRange(p.time);
                        return (
                          <div
                            key={p.id}
                            className="wt-item wt-level-0"
                            style={{ ["--pos" as any]: `calc(20px + (100% - 40px) * ${p.pct})` }}
                            onClick={(e) => { e.stopPropagation(); setCardName(p.name); }}
                          >
                            <div className="wt-marker-col">
                              <div className="wt-time-above">{r.start || ""}</div>
                              <div className={`wt-dot${p.isPast ? " wt-dot-done" : ""}`}>
                                {p.isPast && (
                                  <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="wt-content">
                              <div className="wt-range">{r.full}</div>
                              <div className="wt-name">{p.name}</div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="wt-item wt-endpoint" style={{ ["--pos" as any]: "calc(100% - 20px)" }}>
                        <div className="wt-marker-col"><div className="wt-time-above">۰۱:۳۰</div></div>
                        <div className="wt-content"><div className="wt-name">خواب</div></div>
                      </div>
                    </div>

                    {!!untimedItems.length && (
                      <div className="wt-untimed-row">
                        {untimedItems.map((t) => (
                          <div key={t.id} className="wt-untimed-item" onClick={(e) => { e.stopPropagation(); setCardName(t.name); }}>
                            <div className="wt-range">{t.time}</div>
                            <div className="wt-name">{t.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="week-day-empty">برنامه‌ای برای این روز ثبت نشده</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cardName && (
        <ProgramCard
          name={cardName}
          onClose={() => setCardName(null)}
          scheduleOpts={opts}
          onChanged={refresh}
          onEditOccurrence={(name, occ) => { setCardName(null); setEditTarget({ name, occ }); }}
        />
      )}

      {searchOpen && (
        <WeeklySearchPanel
          scheduleOpts={opts}
          onClose={() => setSearchOpen(false)}
          onChanged={refresh}
          onOpenProgram={(name) => { setSearchOpen(false); setCardName(name); }}
        />
      )}

      {editTarget && (
        <EditOccurrenceForm
          name={editTarget.name}
          occ={editTarget.occ}
          scheduleOpts={opts}
          onClose={() => setEditTarget(null)}
          onChanged={refresh}
        />
      )}
    </section>
  );
}
