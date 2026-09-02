"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { LockBodyScroll } from "@/components/LockBodyScroll";
import { Calendar, Filter, History } from "lucide-react";
import {
  WEEK_ORDER,
  tasksForDate,
  timeStartMinutes,
  timeEndMinutes,
  splitTimeRange,
  toEnDigits,
  DayStats,
} from "@/lib/schedule";
import { dayFillFraction, positionTimedTasks } from "@/lib/weeklyTimeline";
import {
  getCustomOccurrences,
  getRemovedOccurrences,
  getDaily,
  getDailyRange,
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
import { MoveOccurrenceModal } from "@/components/MoveOccurrenceModal";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";
import { HistoryCalendar } from "@/components/HistoryCalendar";
import { DashHeader } from "@/components/DashHeader";
import { DashDateSelector } from "@/components/DashDateSelector";
import { DashFilterButton } from "@/components/DashFilterButton";
import { DashFilterModal } from "@/components/DashFilterModal";
import { DashTaskList } from "@/components/DashTaskList";
import { DashTaskItem } from "@/components/DashTaskRow";
import { DashReminderCard } from "@/components/DashReminderCard";
import { useDashboardPrefs } from "@/lib/dashboardPrefs";
import { DashSidebar } from "@/components/DashSidebar";
import { AuthGate } from "@/components/AuthGate";

const now = new Date();
const todayKey = isoLocal(now);

// یه برنامه‌ای که زمانش گذشته (روزِ قبل، یا امروز ولی ساعتِ پایانش رد شده)
// دیگه نباید قابلِ «انتقال به یک روز دیگر» یا «حذف» باشه — چون در واقع
// اتفاق افتاده، جابه‌جایی/حذفش یعنی وانمود کردن به این‌که هنوز نیفتاده.
// ویرایش (مثلاً تصحیحِ ساعت/تگ) همچنان مجازه، فقط انتقال و حذف بلاک می‌شن.
function isTaskPast(iso: string, time: string): boolean {
  if (iso < todayKey) return true;
  if (iso > todayKey) return false;
  const endMin = timeEndMinutes(time);
  const startMin = timeStartMinutes(time);
  const checkMin = endMin ?? startMin;
  if (checkMin === null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= checkMin;
}

// برخلافِ isTaskPast (که برای غیرفعال‌کردنِ انتقال/حذف، ساعتِ دقیقِ امروز رو
// هم حساب می‌کنه)، ضربدرِ قرمزِ «انجام‌نشده» فقط باید برای روزهای واقعاً
// گذشته (نه امروز، حتی اگه ساعتِ برنامه رد شده باشه) نشون داده بشه — کاربر
// تا آخرِ همون روز فرصت داره تیکش بزنه، نباید زودتر از موعد «ازدست‌رفته» جلوه کنه.
function isDayPast(iso: string): boolean {
  return iso < todayKey;
}

// برنامه‌ی امروزی که ساعتِ شروعش هنوز نرسیده — نباید بشه زودتر از موعد
// تیکش زد (وانمود به انجام‌شدنِ کاری که هنوز شروع نشده).
function isTaskNotStarted(iso: string, time: string): boolean {
  if (iso !== todayKey) return false;
  const startMin = timeStartMinutes(time);
  if (startMin === null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin < startMin;
}

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance; tag?: string };

export default function WeeklyPage() {
  const { status } = useSession();
  const dashboardPrefs = useDashboardPrefs();
  const [openIdx, setOpenIdx] = useState<number | null>(
    WEEK_ORDER.findIndex((o) => o.jsDay === now.getDay())
  );
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string; importance?: Importance; tag?: string }[]>([]);
  const [cardName, setCardName] = useState<string | null>(null);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ name: string; occ: Occ } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ name: string; occ: Occ } | null>(null);
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
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  // وضعیتِ تیک‌خوردنِ واقعیِ روزهای همین هفته — برای دایره‌های تایم‌لاینِ
  // «برنامه هفتگی» (که خودِ isPast زمان‌محوره، نه انجام‌شده‌بودنِ واقعی).
  const [weekDaily, setWeekDaily] = useState<Record<string, DailyRecord>>({});

  const wake = wakeSleep?.wake || DEFAULT_WAKE;
  const sleep = wakeSleep?.sleep || DEFAULT_SLEEP;
  const awakeStartMin = timeToMinutes(wake);
  // ساعتِ خواب همیشه بعدِ نیمه‌شب نیست — کاربرهایی که مثلاً ۲۳:۳۰ می‌خوابن هم
  // هستن. قبلاً همیشه ۲۴ساعت به ساعتِ خواب اضافه می‌شد (فرضِ «خواب همیشه بعدِ
  // نیمه‌شبه»)، که برای این کاربرها بازه‌ی «بیداری» رو به‌جای ~۱۶ ساعتِ واقعی،
  // غلط ~۴۰ ساعت حساب می‌کرد — همین باعث می‌شد برنامه‌های نزدیکِ ساعتِ خوابِ
  // واقعی، خیلی دورتر از انتهای خط زمان (نزدیکِ وسط) جا بگیرن. الان فقط وقتی
  // ساعتِ خواب از نظرِ عددی زودتر یا مساویِ ساعتِ بیداریه (یعنی واقعاً بعدِ
  // نیمه‌شبِ روزِ بعده) ۲۴ ساعت اضافه می‌شه.
  const rawSleepMin = timeToMinutes(sleep);
  const awakeEndMin = rawSleepMin > awakeStartMin ? rawSleepMin : rawSleepMin + 24 * 60;

  async function refresh() {
    const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
    setRemovedOcc(new Set(removed));
    setCustomOcc(custom);
    getTodayStats().then(setTodayStats);
  }

  useEffect(() => {
    // getTodayStats این‌جا صدا زده نمی‌شه — خودِ refresh() بالاتر صداش می‌زنه.
    // فراخوانیِ دوم فقط همون سه درخواستِ شبکه (removed/custom/daily) رو دوباره
    // می‌زد و هیچ داده‌ی تازه‌تری نمی‌آورد.
    refresh();
    getWakeSleepTimes().then((v) => {
      if (v) setWakeSleep(v);
      else setNeedsOnboarding(true);
    });
    const start = new Date(now); start.setDate(now.getDate() - 7);
    const end = new Date(now); end.setDate(now.getDate() + 7);
    getDailyRange(isoLocal(start), isoLocal(end)).then(setWeekDaily);
  }, []);

  useEffect(() => {
    getDaily(selectedIso).then(setSelectedDaily);
  }, [selectedIso]);

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  const isSelectedToday = selectedIso === isoLocal(now);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedIso]);

  // به‌جای یک هفته‌ی کامل شنبه-جمعه، یه پنجره‌ی روزهایی نشون می‌ده که
  // همیشه روی «امروز» (یا مرکزِ پنجره‌ی جابه‌جاشده با فلش‌ها) وسط‌چینه —
  // تعدادش هم ثابت نیست، خودِ DashDateSelector بسته‌به عرضِ واقعیِ نوار
  // اندازه‌گیری می‌کنه و با onVisibleCountChange گزارش می‌ده.
  const [dayWindow, setDayWindow] = useState(5);
  const dashDays = useMemo(() => {
    const center = new Date(now);
    center.setDate(now.getDate() + weekOffset * dayWindow);
    return Array.from({ length: dayWindow }, (_, i) => {
      const d = new Date(center);
      d.setDate(center.getDate() - Math.floor(dayWindow / 2) + i);
      const iso = isoLocal(d);
      const order = WEEK_ORDER.find((w) => w.jsDay === d.getDay())!;
      const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return { iso, weekday: order.name, dateLabel: `${faNum(j[2])} ${J_MONTHS[j[1] - 1]}` };
    });
  }, [weekOffset, dayWindow]);

  const allProgramNames = useMemo(() => {
    const set = new Set(customOcc.map((c) => c.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fa"));
  }, [customOcc]);

  // اسمِ برنامه → تگ‌هایی که بهش اضافه شده، تا توی پاپ‌آپِ فیلتر بشه با تگ
  // هم جستجو کرد (نه فقط با اسمِ برنامه).
  const programTags = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const c of customOcc) {
      if (!c.tag) continue;
      (map[c.name] ??= new Set()).add(c.tag);
    }
    const out: Record<string, string[]> = {};
    for (const name of Object.keys(map)) out[name] = Array.from(map[name]);
    return out;
  }, [customOcc]);

  // اسمِ برنامه → سطوحِ اهمیتی که براش ثبت شده — تا توی پاپ‌آپِ فیلتر، لیستِ
  // برنامه‌ها بشه با «میزان اهمیت» انتخاب‌شده هم فیلتر کرد (نه فقط جست‌وجوی متنی).
  const programImportance = useMemo(() => {
    const map: Record<string, Set<Importance>> = {};
    for (const c of customOcc) {
      (map[c.name] ??= new Set()).add(c.importance ?? "low");
    }
    const out: Record<string, Importance[]> = {};
    for (const name of Object.keys(map)) out[name] = Array.from(map[name]);
    return out;
  }, [customOcc]);

  const dashTasks: DashTaskItem[] = useMemo(() => {
    return tasksForDate(selectedDate, opts)
      .map((t) => {
        const occ = customOcc.find((c) => c.id === t.id);
        return {
          id: t.id,
          name: t.name,
          time: t.time,
          importance: occ?.importance,
          tag: occ?.tag,
          done: !!selectedDaily?.tasks[t.id],
          isPast: isTaskPast(selectedIso, t.time),
          dayPast: isDayPast(selectedIso),
          notStarted: isTaskNotStarted(selectedIso, t.time),
        };
      })
      .filter((t) => importanceFilter === "all" || (t.importance ?? "low") === importanceFilter)
      .filter((t) => programFilter === null || programFilter.has(t.name));
  }, [selectedDate, selectedIso, opts, customOcc, selectedDaily, importanceFilter, programFilter]);

  // انتخابِ یه روزِ دلخواه (مثلاً از تقویمِ تاریخچه) — برخلافِ کلیک روی
  // خودِ نوارِ روزها (که همیشه روزی از همون پنجره‌ی قابل‌مشاهده‌ست)، این روز
  // می‌تونه کاملاً بیرونِ پنجره‌ی فعلی باشه؛ پس weekOffset رو هم طوری
  // حساب می‌کنیم که پنجره‌ی نوار دورِ همین روز وسط‌چین بشه.
  function pickDate(iso: string) {
    setSelectedIso(iso);
    const [y, m, d] = iso.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    const diffDays = Math.round((picked.getTime() - now.getTime()) / 86400000);
    setWeekOffset(Math.round(diffDays / dayWindow));
  }

  async function toggleDashTask(id: string) {
    if (!isSelectedToday) return;
    const task = dashTasks.find((t) => t.id === id);
    if (task?.notStarted) return;
    const current = selectedDaily ?? { tasks: {}, wake: null };
    const next: DailyRecord = { ...current, tasks: { ...current.tasks, [id]: !current.tasks[id] } };
    setSelectedDaily(next);
    setWeekDaily((prev) => ({ ...prev, [selectedIso]: next }));
    await setDaily(selectedIso, next);
    getTodayStats().then(setTodayStats);
    setStatsRefreshKey((k) => k + 1);
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
    setEditTarget({ name: task.name, occ: { dayName, jsDay, time: task.time, id: task.id, custom: true, importance: task.importance, tag: task.tag } });
  }

  function moveTaskFromDash(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (!task || task.isPast) return;
    const jsDay = selectedDate.getDay();
    const dayName = WEEK_ORDER.find((o) => o.jsDay === jsDay)?.name || "";
    setMoveTarget({ name: task.name, occ: { dayName, jsDay, time: task.time, id: task.id, custom: true, importance: task.importance, tag: task.tag } });
  }

  async function deleteTaskCompletely(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (task?.isPast) return;
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
              onVisibleCountChange={setDayWindow}
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

          {/* دسکتاپ: سه ستون کنارِ هم — راست (پهن‌تر) برنامه‌های امروز از بالا
              تا پایین، وسط یادآوری‌ها، چپ دوستان+آمار زیرِ هم. موبایل/تبلت
              همچنان یک ستونِ عمودی (flex-col) می‌مونه. */}
          <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_0.8fr_1fr] lg:items-stretch lg:gap-6">
            {status === "unauthenticated" ? (
              <AuthGate message="برای مدیریت برنامه‌های امروز وارد شوید" />
            ) : (
              <DashTaskList
                tasks={dashTasks}
                editable={isSelectedToday}
                onToggle={toggleDashTask}
                onAddProgram={() => setAddProgramOpen(true)}
                onOpenProgram={setCardName}
                onEditTask={editTaskFromDash}
                onDeleteTask={deleteTaskCompletely}
                onMoveTask={moveTaskFromDash}
                delay={0.05}
              />
            )}

            {dashboardPrefs.showReminders && <DashReminderCard delay={0.1} />}

            <DashSidebar statsRefreshKey={statsRefreshKey} />
          </div>
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
              const dDoneTasks = weekDaily[isoLocal(d)]?.tasks ?? {};
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
                  {isOpen && (
                      <div className="week-day-body">
                        {items.length ? (
                          <div className="week-timeline">
                            <div className="week-timeline-track">
                              <div className="wt-fill-track">
                                <div className="wt-fill-green" style={{ ["--fill" as any]: fillPct + "%" }} />
                              </div>

                              <div className="wt-item wt-endpoint" style={{ ["--pos" as any]: "20px" }}>
                                <div className="wt-marker-col"><div className="wt-time-above">{toEnDigits(wake)}</div></div>
                                <div className="wt-content"><div className="wt-name">بیداری</div></div>
                              </div>

                              {positioned.map((p) => {
                                const r = splitTimeRange(p.time);
                                const done = !!dDoneTasks[p.id];
                                return (
                                  <div
                                    key={p.id}
                                    className="wt-item wt-level-0"
                                    style={{ ["--pos" as any]: `calc(20px + (100% - 40px) * ${p.pct})` }}
                                    onClick={(e) => { e.stopPropagation(); setCardName(p.name); }}
                                  >
                                    <div className="wt-marker-col">
                                      <div className="wt-time-above">{toEnDigits(r.start || "")}</div>
                                      <div className={`wt-dot${done ? " wt-dot-done" : ""}`}>
                                        {done && (
                                          <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                    </div>
                                    <div className="wt-content">
                                      <div className="wt-range">{toEnDigits(r.full)}</div>
                                      <div className="wt-name">{p.name}</div>
                                    </div>
                                  </div>
                                );
                              })}

                              <div className="wt-item wt-endpoint" style={{ ["--pos" as any]: "calc(100% - 20px)" }}>
                                <div className="wt-marker-col"><div className="wt-time-above">{toEnDigits(sleep)}</div></div>
                                <div className="wt-content"><div className="wt-name">خواب</div></div>
                              </div>
                            </div>

                            {!!untimedItems.length && (
                              <div className="wt-untimed-row">
                                {untimedItems.map((t) => (
                                  <div key={t.id} className="wt-untimed-item" onClick={(e) => { e.stopPropagation(); setCardName(t.name); }}>
                                    <div className="wt-range">{toEnDigits(t.time)}</div>
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
                    )}
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

        {moveTarget && (
          <MoveOccurrenceModal
            name={moveTarget.name}
            occ={moveTarget.occ}
            scheduleOpts={opts}
            onClose={() => setMoveTarget(null)}
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
            programTags={programTags}
            programImportance={programImportance}
            selectedPrograms={programFilter}
            onToggleProgram={toggleProgramFilter}
            onSelectAll={() => setProgramFilter(null)}
            onClose={() => setFilterModalOpen(false)}
          />
        )}

        {historyPickerOpen && (
          <>
            <LockBodyScroll />
            <div className="modal-overlay open" onClick={() => setHistoryPickerOpen(false)} />
            <div className="modal-panel dash-scope open">
              <div className="modal-head">
                <div className="modal-title">انتخاب تاریخ</div>
                <button className="nav-close" onClick={() => setHistoryPickerOpen(false)} aria-label="بستن">×</button>
              </div>
              <div className="modal-body">
                <HistoryCalendar
                  wake={wake}
                  sleep={sleep}
                  onPick={(iso) => { pickDate(iso); setHistoryPickerOpen(false); }}
                />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
