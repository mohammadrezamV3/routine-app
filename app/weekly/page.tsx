"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Filter, History } from "lucide-react";
import {
  WEEK_ORDER,
  tasksForDate,
  timeStartMinutes,
  timeEndMinutes,
  splitTimeRange,
  startOfWeek,
  DayStats,
} from "@/lib/schedule";
import { awakeFraction, dayFillFraction, positionTimedTasks } from "@/lib/weeklyTimeline";
import {
  getCustomOccurrences,
  getRemovedOccurrences,
  getDaily,
  setDaily,
  setCustomOccurrences,
  DailyRecord,
  Importance,
} from "@/lib/storage";
import { getTodayStats } from "@/lib/routineStats";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, timeToMinutes, WakeSleepTimes } from "@/lib/wakeSleep";
import { isoLocal, toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { ProgramCard } from "@/components/ProgramCard";
import { AddProgramForm } from "@/components/AddProgramForm";
import { EditOccurrenceForm } from "@/components/EditOccurrenceForm";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";
import { HistoryCalendar } from "@/components/HistoryCalendar";
import { DashHeader } from "@/components/DashHeader";
import { DashDateSelector } from "@/components/DashDateSelector";
import { DashFilterButton } from "@/components/DashFilterButton";
import { DashFilterModal } from "@/components/DashFilterModal";
import { DashTaskList } from "@/components/DashTaskList";
import { DashTaskItem } from "@/components/DashTaskRow";
import { DashReminderCard } from "@/components/DashReminderCard";
import { DashSidebar } from "@/components/DashSidebar";

const now = new Date();

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance };

export default function WeeklyPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(
    WEEK_ORDER.findIndex((o) => o.jsDay === now.getDay())
  );
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string; importance?: Importance }[]>([]);
  const [cardName, setCardName] = useState<string | null>(null);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ name: string; occ: Occ } | null>(null);
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // بخش داشبورد (ادغام‌شده با صفحه اصلی) — انتخاب تاریخ/هفته، برنامه‌های
  // همون روز، و فیلترها. جدا از openIdx بالا که برای تایم‌لاینِ «کلی برنامه
  // هفته» (کارت‌های شنبه..جمعه که پایین‌تر نمایش داده می‌شن) استفاده می‌شه.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIso, setSelectedIso] = useState(() => isoLocal(now));
  const [selectedDaily, setSelectedDaily] = useState<DailyRecord | null>(null);
  const [todayStats, setTodayStats] = useState<DayStats>({ completed: 0, total: 0, pct: 0 });
  const [importanceFilter, setImportanceFilter] = useState<"all" | Importance>("all");
  // null = فیلترِ برنامه فعال نیست (همه نشون داده می‌شن)
  const [programFilter, setProgramFilter] = useState<Set<string> | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);

  const wake = wakeSleep?.wake || DEFAULT_WAKE;
  const sleep = wakeSleep?.sleep || DEFAULT_SLEEP;
  const awakeStartMin = timeToMinutes(wake);
  const awakeEndMin = timeToMinutes(sleep) + 24 * 60; // خواب معمولاً بعد از نیمه‌شبه

  async function refresh() {
    const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
    setRemovedOcc(new Set(removed));
    setCustomOcc(custom);
    getTodayStats().then(setTodayStats);
  }

  useEffect(() => {
    refresh();
    getTodayStats().then(setTodayStats);
    getWakeSleepTimes().then((v) => {
      if (v) setWakeSleep(v);
      else setNeedsOnboarding(true);
    });
  }, []);

  useEffect(() => {
    getDaily(selectedIso).then(setSelectedDaily);
  }, [selectedIso]);

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
      const pct = awakeFraction(mins, awakeStartMin, awakeEndMin);
      const target = pct * trackH - tl.clientHeight / 2;
      tl.scrollTop = Math.max(0, target);
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdx, awakeStartMin, awakeEndMin]);

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  const isSelectedToday = selectedIso === isoLocal(now);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedIso]);

  const dashDays = useMemo(() => {
    const start = startOfWeek(now, weekOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoLocal(d);
      const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
      const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return { iso, weekday: order.name, dateLabel: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
    });
  }, [weekOffset]);

  const allProgramNames = useMemo(() => {
    const set = new Set(customOcc.map((c) => c.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fa"));
  }, [customOcc]);

  const dashTasks: DashTaskItem[] = useMemo(() => {
    return tasksForDate(selectedDate, opts)
      .map((t) => {
        const occ = customOcc.find((c) => c.id === t.id);
        return { id: t.id, name: t.name, time: t.time, importance: occ?.importance, done: !!selectedDaily?.tasks[t.id] };
      })
      .filter((t) => importanceFilter === "all" || (t.importance ?? "low") === importanceFilter)
      .filter((t) => programFilter === null || programFilter.has(t.name));
  }, [selectedDate, opts, customOcc, selectedDaily, importanceFilter, programFilter]);

  async function toggleDashTask(id: string) {
    if (!isSelectedToday) return;
    const current = selectedDaily ?? { tasks: {}, wake: null };
    const next: DailyRecord = { ...current, tasks: { ...current.tasks, [id]: !current.tasks[id] } };
    setSelectedDaily(next);
    await setDaily(selectedIso, next);
    getTodayStats().then(setTodayStats);
  }

  function toggleProgramFilter(name: string) {
    setProgramFilter((prev) => {
      const base = prev ?? new Set(allProgramNames);
      const next = new Set(base);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next.size === allProgramNames.length ? null : next;
    });
  }

  // ویرایش/حذف از منوی سه‌نقطه‌ی «برنامه‌های امروز» — روی همون occurrence ی
  // که برای selectedIso نمایش داده شده، نه لزوماً «امروزِ واقعی».
  function editTaskFromDash(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (!task) return;
    const jsDay = selectedDate.getDay();
    const dayName = WEEK_ORDER.find((o) => o.jsDay === jsDay)?.name || "";
    setEditTarget({ name: task.name, occ: { dayName, jsDay, time: task.time, id: task.id, custom: true, importance: task.importance } });
  }

  async function deleteTaskCompletely(id: string) {
    await setCustomOccurrences(customOcc.filter((c) => c.id !== id));
    refresh();
  }

  return (
    <>
      <section className="dash-breakout dash-scope pb-6 text-dash-text">
        <div className="flex flex-col gap-4 sm:gap-6">
          <DashHeader progress={todayStats.pct} />

          <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
            <DashDateSelector
              days={dashDays}
              activeIso={selectedIso}
              onSelect={setSelectedIso}
              onPrevWeek={() => setWeekOffset((v) => v - 1)}
              onNextWeek={() => setWeekOffset((v) => v + 1)}
              className="lg:order-2"
            />

            <div className="flex flex-wrap items-center gap-2 lg:order-1 lg:shrink-0 lg:flex-nowrap">
              <DashFilterButton
                label="تاریخچه"
                icon={<History size={15} />}
                active={!isSelectedToday}
                onClick={() => setHistoryPickerOpen(true)}
              />
              <DashFilterButton
                label="امروز"
                icon={<Calendar size={15} />}
                active={isSelectedToday}
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedIso(isoLocal(now));
                }}
              />
              <DashFilterButton
                label="فیلتر"
                icon={<Filter size={15} />}
                active={importanceFilter !== "all" || programFilter !== null}
                onClick={() => setFilterModalOpen(true)}
              />
            </div>
          </div>

          <DashTaskList
            tasks={dashTasks}
            editable={isSelectedToday}
            onToggle={toggleDashTask}
            onAddProgram={() => setAddProgramOpen(true)}
            onOpenProgram={setCardName}
            onEditTask={editTaskFromDash}
            onDeleteTask={deleteTaskCompletely}
            delay={0.05}
          />

          <DashReminderCard delay={0.1} onOpenProgram={setCardName} />

          <DashSidebar />
        </div>
      </section>

      <section className="dash-breakout">
        <div className="weekly-align-end">
          <div className="weekly-head-row">
            <h1>برنامه هفتگی</h1>
          </div>

          <div className="weekly-glass">
            <div className="weekly-glass-content">
            {WEEK_ORDER.map((o, idx) => {
              const d = new Date(now);
              d.setDate(now.getDate() + (o.jsDay - now.getDay()));
              const items = tasksForDate(d, opts);
              const isToday = o.jsDay === now.getDay();
              const isOpen = openIdx === idx;
              const fillPct = Math.round(dayFillFraction(o.jsDay, WEEK_ORDER, now, awakeStartMin, awakeEndMin) * 1000) / 10;

              const timedItems = items.filter((t) => timeStartMinutes(t.time) !== null);
              const untimedItems = items.filter((t) => timeStartMinutes(t.time) === null);

              const todayPos = WEEK_ORDER.findIndex((oo) => oo.jsDay === now.getDay());
              const nowMinRaw = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
              let effTodayPos = todayPos, effNowMin = nowMinRaw;
              if (nowMinRaw < 6 * 60) {
                effTodayPos = (todayPos - 1 + WEEK_ORDER.length) % WEEK_ORDER.length;
                effNowMin = nowMinRaw + 24 * 60;
              }
              const positioned = positionTimedTasks(timedItems, timeStartMinutes, timeEndMinutes, idx, effTodayPos, effNowMin, awakeStartMin, awakeEndMin);

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
                            <div className="wt-marker-col"><div className="wt-time-above">{wake}</div></div>
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
                                    <svg viewBox="0 0 24 24" fill="none">
                                      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                                    </svg>
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
                            <div className="wt-marker-col"><div className="wt-time-above">{sleep}</div></div>
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
          </div>
        </div>

        {cardName && (
          <ProgramCard
            name={cardName}
            onClose={() => setCardName(null)}
            scheduleOpts={opts}
          />
        )}

        {addProgramOpen && (
          <AddProgramForm
            scheduleOpts={opts}
            onClose={() => setAddProgramOpen(false)}
            onChanged={refresh}
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

        {needsOnboarding && (
          <WakeSleepSetup
            onDone={(v) => { setWakeSleep(v); setNeedsOnboarding(false); }}
          />
        )}

        {filterModalOpen && (
          <DashFilterModal
            importance={importanceFilter}
            onImportanceChange={setImportanceFilter}
            programNames={allProgramNames}
            selectedPrograms={programFilter}
            onToggleProgram={toggleProgramFilter}
            onSelectAll={() => setProgramFilter(null)}
            onClose={() => setFilterModalOpen(false)}
          />
        )}

        {historyPickerOpen && (
          <>
            <div className="modal-overlay open" onClick={() => setHistoryPickerOpen(false)} />
            <div className="modal-panel open">
              <div className="modal-head">
                <div className="modal-title">انتخاب تاریخ</div>
                <button className="nav-close" onClick={() => setHistoryPickerOpen(false)} aria-label="بستن">×</button>
              </div>
              <div className="modal-body">
                <HistoryCalendar
                  wake={wake}
                  sleep={sleep}
                  onPick={(iso) => { setSelectedIso(iso); setHistoryPickerOpen(false); }}
                />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
