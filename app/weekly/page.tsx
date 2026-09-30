"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LockBodyScroll } from "@/components/LockBodyScroll";
import { ModuleGate } from "@/components/ModuleGate";
import { RoutineTrialBanner } from "@/components/RoutineTrialBanner";
import { SleepMiniCard } from "@/components/SleepMiniCard";
import { Calendar, Filter, History } from "lucide-react";
import {
  WEEK_ORDER,
  tasksForDate,
  timeStartMinutes,
  splitTimeRange,
  isDayOver,
  startOfWeek,
  toEnDigits,
  dayBeforeIso,
} from "@/lib/schedule";
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
import { keyMatches, useLiveRefresh } from "@/lib/liveSync";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { isoLocal, toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import { ProgramCard } from "@/components/ProgramCard";
import { AddProgramForm } from "@/components/AddProgramForm";
import { EditOccurrenceForm } from "@/components/EditOccurrenceForm";
import { MoveOccurrenceModal } from "@/components/MoveOccurrenceModal";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";
import { HistoryCalendar } from "@/components/HistoryCalendar";
import { RoutineHero } from "@/components/RoutineHero";
import { DashDateSelector } from "@/components/DashDateSelector";
import { DashFilterButton } from "@/components/DashFilterButton";
import { DashFilterModal } from "@/components/DashFilterModal";
import { DashTaskList } from "@/components/DashTaskList";
import { DashTaskItem } from "@/components/DashTaskRow";
import { DashQuickPanels } from "@/components/DashQuickPanels";
import { DashReminderCard } from "@/components/DashReminderCard";
import { DashMedicationCard } from "@/components/DashMedicationCard";
import { DashSidebar } from "@/components/DashSidebar";
import { useDashboardPrefs } from "@/lib/dashboardPrefs";
import { AuthGate } from "@/components/AuthGate";
import { RoutineAiFab } from "@/components/RoutineAiFab";
import { WeekPlanGrid, WeekPlanGridDay } from "@/components/WeekPlanGrid";
import { useFeature } from "@/lib/useFeatures";
import { activeModulesOf, getAccount } from "@/lib/accountCache";

const now = new Date();
const todayKey = isoLocal(now);

// طبقِ درخواستِ صریح، برنامه‌های «امروز» — حتی اگر ساعتشان گذشته باشد —
// همیشه قابل «انتقال» و «حذف» بمانند؛ فقط روزهای واقعا گذشته (دیروز و
// قبل‌تر) قفل می‌شوند. ویرایش هم همیشه مجاز بوده و هست.
function isTaskPast(iso: string): boolean {
  return iso < todayKey;
}

// روزِ واقعا گذشته — برای قفلِ «شروع»ِ تمرین. ضربدرِ «وقتش گذشته»ی برنامه‌ها
// دیگه از این نمیاد: طبقِ درخواستِ صریح، برنامه‌ی امروزی که ساعتش رد شده و
// تیک نخورده فقط بعد از پایانِ روز ✕ می‌گیره (isDayOver در lib/schedule.ts) —
// ولی همچنان قابل تیک‌زدنه، ✕ فقط وضعیته نه قفل.
function isDayPast(iso: string): boolean {
  return iso < todayKey;
}

// برنامه‌ی امروزی که ساعت شروعش هنوز نرسیده — نباید بشه زودتر از موعد
// تیکش زد (وانمود به انجام‌شدن کاری که هنوز شروع نشده).
function isTaskNotStarted(iso: string, time: string): boolean {
  if (iso !== todayKey) return false;
  const startMin = timeStartMinutes(time);
  if (startMin === null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin < startMin;
}

type Occ = { dayName: string; jsDay: number; time: string; id: string; custom?: boolean; importance?: Importance; tag?: string };

// «روتین من» بعد از ۱۴ روز آزمایشی پلن می‌خواد — ModuleGate فقط UI ـه، نوشتن‌ها
// سمتِ سرور هم با requireModule(ROUTINE) بسته‌ان (tasks/daily، settings).
export default function WeeklyPage() {
  return (
    <ModuleGate module="ROUTINE">
      <WeeklyPageInner />
    </ModuleGate>
  );
}

function WeeklyPageInner() {
  const assistantOn = useFeature("routineAssistant") === true;
  const { status } = useSession();
  const dashboardPrefs = useDashboardPrefs();
  const [removedOcc, setRemovedOcc] = useState<Set<string>>(new Set());
  const [customOcc, setCustomOcc] = useState<{ id: string; name: string; jsDay: number; time: string; startDate?: string; endDate?: string; importance?: Importance; tag?: string; roadmapId?: string; mentorProgramId?: string }[]>([]);
  const router = useRouter();
  const [cardName, setCardName] = useState<string | null>(null);

  /**
   * برنامه‌هایی که از یک رودمپ ساخته شده‌اند به‌جای کارتِ معمولی، مستقیم
   * صفحه‌ی همان مسیر را باز می‌کنند — آن‌جاست که جلسه‌ها، قدم‌ها و منابع
   * هستند. برای بقیه‌ی برنامه‌ها رفتار مثل قبل است.
   */
  function openProgram(name: string) {
    const fromRoadmap = customOcc.find((c) => c.name === name && c.roadmapId);
    if (fromRoadmap?.roadmapId) { router.push(`/roadmaps/custom/${fromRoadmap.roadmapId}`); return; }
    // برنامه‌ای که از برنامه‌ی یک منتور آینه شده → صفحه‌ی اجرای همان برنامه
    const fromMentor = customOcc.find((c) => c.name === name && c.mentorProgramId);
    if (fromMentor?.mentorProgramId) { router.push(`/mentor-programs/${fromMentor.mentorProgramId}`); return; }
    setCardName(name);
  }
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  // «برنامه‌ی جدید» از داشبورد/پالتِ فرمان با ‎/weekly?add=1‎ میاد: فرمِ افزودن
  // مستقیم باز می‌شه و پارامتر از آدرس پاک می‌شه (رفرش دوباره بازش نکنه).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("add") !== "1") return;
    setAddProgramOpen(true);
    sp.delete("add");
    const q = sp.toString();
    window.history.replaceState(window.history.state, "", window.location.pathname + (q ? `?${q}` : ""));
  }, []);
  const [editTarget, setEditTarget] = useState<{ name: string; occ: Occ } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ name: string; occ: Occ } | null>(null);
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // بخش داشبورد (ادغام‌شده با صفحه اصلی) — انتخاب تاریخ/هفته، برنامه‌های
  // همون روز، و فیلترها. «برنامه هفتگی» پایینِ صفحه (WeekPlanGrid) همیشه
  // هفته‌ی جاری (شنبه..جمعه) رو نشون می‌ده، مستقل از این انتخاب.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIso, setSelectedIso] = useState(() => isoLocal(now));
  const [recenterKey, setRecenterKey] = useState(0);
  const [selectedDaily, setSelectedDaily] = useState<DailyRecord | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<"all" | Importance>("all");
  // null = فیلتر برنامه فعال نیست (همه نشون داده می‌شن)
  const [programFilter, setProgramFilter] = useState<Set<string> | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [historyPickerOpen, setHistoryPickerOpen] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  // وضعیت تیک‌خوردن واقعی روزهای همین هفته — برای دایره‌های تایم‌لاین
  // «برنامه هفتگی» (که خود isPast زمان‌محوره، نه انجام‌شده‌بودن واقعی).
  const [weekDaily, setWeekDaily] = useState<Record<string, DailyRecord>>({});
  // روزهایی که کاربر برنامه‌ی تمرینی برایشان دارد (از GET
  // /api/exercise/schedule) — طبقِ درخواستِ صریح، اگر امروز جزوِ این روزها
  // باشد، یک ردیفِ «برنامه تمرینی امروز» بدونِ ساعت به «برنامه‌های امروز»
  // اضافه می‌شود. null یعنی هنوز نمی‌دانیم/پلنی نیست — هیچ ردیفی اضافه نمی‌شود.
  const [gymDays, setGymDays] = useState<string[] | null>(null);
  // پلنِ فعالِ بدنسازی + وضعیتِ *واقعیِ* تمامِ تمرینِ روزِ انتخاب‌شده (از
  // /api/exercise/log — همون منبعی که ExerciseDashboard می‌خونه). زدنِ «شروع»
  // فقط یعنی رفتن سمتِ تمرین، نه تمام‌کردنش؛ «انجام دادی» فقط با completed.
  const [exercisePlanId, setExercisePlanId] = useState<string | null>(null);
  const [exerciseDone, setExerciseDone] = useState<Record<string, boolean>>({});
  // ساعتِ زنده — «وقتش گذشته» باید با گذشتِ زمان خودش ظاهر بشه، نه فقط با
  // ریلود (now بالای فایل فقط لحظه‌ی لودِ ماژوله).
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    // بدونِ ماژولِ بدنسازی این روت ۴۰۳ می‌ده (و خطای کنسول) — اول دسترسی رو از
    // همون کشِ /api/account چک می‌کنیم و اصلا درخواست نمی‌زنیم
    getAccount()
      .then((acc) => {
        const allowed = !!acc?.user && activeModulesOf(acc).has("EXERCISE");
        return allowed ? fetch("/api/exercise/schedule") : null;
      })
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setGymDays(Array.isArray(d?.gymDays) ? d.gymDays : []);
        setExercisePlanId(typeof d?.planId === "string" ? d.planId : null);
      })
      .catch(() => { if (alive) setGymDays([]); });
    return () => { alive = false; };
  }, [status]);

  const [exerciseLogKey, setExerciseLogKey] = useState(0);
  useLiveRefresh("exercise", () => setExerciseLogKey((k) => k + 1));
  useEffect(() => {
    if (!exercisePlanId) return;
    let alive = true;
    const iso = selectedIso;
    fetch(`/api/exercise/log?planId=${encodeURIComponent(exercisePlanId)}&date=${iso}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setExerciseDone((prev) => ({ ...prev, [iso]: !!d.completed })); })
      .catch(() => {});
    return () => { alive = false; };
  }, [exercisePlanId, selectedIso, exerciseLogKey]);

  // دسکتاپ (lg+) همون چیدمانِ قدیمیِ سه‌ستونه رو می‌گیره (یادآوری/دارو
  // ستونِ وسط، دوستان/آمار ستونِ چپ)؛ باکس‌های DashQuickPanels فقط برای
  // موبایل/تبلت. با matchMedia فقط یکی رندر می‌شه تا فچ‌ها دوبار نشن.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const hasMiddleColumn = dashboardPrefs.showReminders || dashboardPrefs.showMedications;

  const hasQuickPanels =
    dashboardPrefs.showReminders ||
    dashboardPrefs.showMedications ||
    dashboardPrefs.showChart ||
    dashboardPrefs.showFriends;

  const wake = wakeSleep?.wake || DEFAULT_WAKE;
  const sleep = wakeSleep?.sleep || DEFAULT_SLEEP;

  async function refresh() {
    const [removed, custom] = await Promise.all([getRemovedOccurrences(), getCustomOccurrences()]);
    setRemovedOcc(new Set(removed));
    setCustomOcc(custom);
  }

  useEffect(() => {
    // getTodayStats این‌جا صدا زده نمی‌شه — خود refresh() بالاتر صداش می‌زنه.
    // فراخوانی دوم فقط همون سه درخواست شبکه (removed/custom/daily) رو دوباره
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

  // لایه‌ی زنده (lib/liveSync.ts): هر تغییری در تیک‌ها یا برنامه‌ها — از همین
  // صفحه، یه مودالِ دیگه، تبِ دیگه، سرور یا برگشت به تب — همون لحظه حلقه‌ی
  // پیشرفت، لیستِ امروز و تایم‌لاین رو از داده‌ی تازه دوباره حساب می‌کنه.
  const selectedIsoRef = useRef(selectedIso);
  selectedIsoRef.current = selectedIso;
  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences", "wakeSleepTimes"], (changed) => {
    const all = changed.includes("*");
    const has = (k: string) => all || changed.some((c) => keyMatches(k, c));
    if (has("customOccurrences") || has("removedOccurrences")) refresh();
    if (has("daily")) {
      const iso = selectedIsoRef.current;
      getDaily(iso).then((d) => { if (selectedIsoRef.current === iso) setSelectedDaily(d); });
      const start = new Date(now); start.setDate(now.getDate() - 7);
      const end = new Date(now); end.setDate(now.getDate() + 7);
      getDailyRange(isoLocal(start), isoLocal(end)).then(setWeekDaily);
    }
    if (has("wakeSleepTimes")) getWakeSleepTimes().then((v) => { if (v) setWakeSleep(v); });
  });

  const opts = useMemo(
    () => ({ removedOccurrences: removedOcc, customOccurrences: customOcc }),
    [removedOcc, customOcc]
  );

  const isSelectedToday = selectedIso === isoLocal(now);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedIso]);

  const allProgramNames = useMemo(() => {
    const set = new Set(customOcc.map((c) => c.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fa"));
  }, [customOcc]);

  // اسم برنامه → تگ‌هایی که بهش اضافه شده، تا توی پاپ‌آپ فیلتر بشه با تگ
  // هم جستجو کرد (نه فقط با اسم برنامه).
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

  // اسم برنامه → سطوح اهمیتی که براش ثبت شده — تا توی پاپ‌آپ فیلتر، لیست
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

  const EXERCISE_TASK_ID = "exercise-plan";

  const dashTasks: DashTaskItem[] = useMemo(() => {
    const list: DashTaskItem[] = tasksForDate(selectedDate, opts)
      .map((t) => {
        const occ = customOcc.find((c) => c.id === t.id);
        const done = !!selectedDaily?.tasks[t.id];
        return {
          id: t.id,
          name: t.name,
          time: t.time,
          importance: occ?.importance,
          tag: occ?.tag,
          done,
          missed: !done && isDayOver(selectedIso, clock),
          isPast: isTaskPast(selectedIso),
          dayPast: isDayPast(selectedIso),
          notStarted: isTaskNotStarted(selectedIso, t.time),
          isFuture: selectedIso > todayKey,
        };
      })
      .filter((t) => importanceFilter === "all" || (t.importance ?? "low") === importanceFilter)
      .filter((t) => programFilter === null || programFilter.has(t.name));

    // برنامه‌ی تمرینی — بدونِ ساعتِ مشخص، طبقِ درخواستِ صریح. اسمِ روزِ
    // انتخاب‌شده باید دقیقاً همان لیبلِ فارسی‌ای باشد که در gymDays ذخیره
    // شده (هم‌منبع با FA_WEEKDAY/WEEK_ORDER، نه یک رشته‌ی جدا).
    const dayName = WEEK_ORDER.find((o) => o.jsDay === selectedDate.getDay())?.name;
    if (dayName && gymDays?.includes(dayName)) {
      list.push({
        id: EXERCISE_TASK_ID,
        name: "برنامه تمرینی امروز",
        time: "",
        importance: undefined,
        tag: undefined,
        done: !!exerciseDone[selectedIso],
        missed: !exerciseDone[selectedIso] && isDayPast(selectedIso),
        isPast: false,
        dayPast: isDayPast(selectedIso),
        notStarted: false,
        isFuture: selectedIso > todayKey,
        exercise: true,
      });
    }

    return list;
  }, [selectedDate, selectedIso, opts, customOcc, selectedDaily, importanceFilter, programFilter, gymDays, exerciseDone, clock]);

  // «برنامه هفتگی» پایینِ صفحه — دقیقا همون گریدِ هفت‌روزه‌ی برنامه‌ی هفتگیِ
  // بخشِ ورزش (WeekPlanGrid)، با برنامه‌های واقعیِ هر روزِ هفته‌ی جاری. وضعیتِ
  // هر برنامه از تیک‌های واقعیِ همون روز (weekDaily) میاد و فقط با آیکونِ
  // جای شماره نشون داده می‌شه — طبقِ درخواستِ صریح، متنِ «انجام دادی»/«وقتش
  // گذشته» زیرِ آیتم‌ها دیگه نمیاد.
  const weekGridDays: WeekPlanGridDay[] = useMemo(() => {
    const start = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dIso = isoLocal(d);
      // طبقِ درخواستِ صریح: جلوی هر برنامه ساعتش (یا «بدون ساعت») و بدونِ
      // تیک/ضربدر — وضعیتِ انجام فقط توی لیستِ برنامه‌های روز نشون داده می‌شه.
      const items = tasksForDate(d, opts).map((t) => ({
        id: t.id,
        label: t.name,
        meta: t.time ? toEnDigits(t.time) : "بدون ساعت",
      }));
      return {
        key: dIso,
        dayName: WEEK_ORDER.find((o) => o.jsDay === d.getDay())!.name,
        isToday: dIso === todayKey,
        subtitle: items.length ? `${faNum(items.length)} برنامه` : undefined,
        items,
      };
    });
  }, [opts, weekDaily, clock]);

  // شروعِ تمرین: هم همین‌جا (روتین من) تیک می‌خورد هم کاربر به صفحه‌ی
  // بدنسازی می‌رود تا واقعاً برنامه را ببیند. تپ‌استرایک/دابل‌کلیکِ خودِ
  // دکمه سمتِ DashTaskRow گارد شده (starting)؛ اینجا هم به‌جای toggle
  // (که ممکن است دوباره خاموشش کند) صریحاً true می‌نویسیم.
  async function startExercise(id: string) {
    // طبقِ درخواستِ صریح: برنامه‌ی تمرینیِ روزهای واقعا گذشته دیگر قابلِ
    // «شروع» نیست (خودِ دکمه هم توی DashTaskRow برای dayPast غیرفعال است؛
    // این‌جا هم گارد می‌شود که مستقیم صدازدنِ تابع هم بی‌اثر بماند).
    if (isDayPast(selectedIso)) return;
    const current = selectedDaily ?? { tasks: {}, wake: null };
    if (current.tasks[id]) { router.push("/exercise?tab=exercise"); return; }
    const next: DailyRecord = { ...current, tasks: { ...current.tasks, [id]: true } };
    setSelectedDaily(next);
    setWeekDaily((prev) => ({ ...prev, [selectedIso]: next }));
    // حلقه‌ی هیرو (RoutineHero) خودش از lib/storage زنده به‌روز می‌شه
    setStatsRefreshKey((k) => k + 1);
    await setDaily(selectedIso, next);
    router.push("/exercise?tab=exercise");
  }

  // انتخاب یه روز دلخواه (مثلا از تقویم تاریخچه) — نوارِ روزها
  // (DashDateSelector/useDayStrip) خودش بازه رو دورِ همین روز باز و وسط‌چینش می‌کنه.
  function pickDate(iso: string) {
    setSelectedIso(iso);
  }

  async function toggleDashTask(id: string) {
    // روزِ گذشته برای جبرانِ عقب‌افتاده قابلِ تیک‌زدنه، و برنامه‌ای که هنوز
    // ساعتش نرسیده هم اگر زودتر انجامش داده — ولی روزِ *آینده* نه: طبقِ
    // درخواستِ صریحِ کاربر، تیک‌زدنِ برنامه‌ی روزی که هنوز نرسیده یعنی
    // وانمود به انجام‌شدنِ کاری که اصلاً شروع نشده، پس این‌جا بلاک می‌شود.
    const task = dashTasks.find((t) => t.id === id);
    // برنامه‌ی روزهای گذشته دیگه قابلِ تغییر نیست (درخواستِ صریح).
    if (task?.isFuture || isDayPast(selectedIso)) return;
    const current = selectedDaily ?? { tasks: {}, wake: null };
    const next: DailyRecord = { ...current, tasks: { ...current.tasks, [id]: !current.tasks[id] } };
    setSelectedDaily(next);
    setWeekDaily((prev) => ({ ...prev, [selectedIso]: next }));
    // حلقه‌ی هیرو (RoutineHero) همون لحظه از نوشتنِ optimistic ِ lib/storage به‌روز می‌شه
    setStatsRefreshKey((k) => k + 1);
    await setDaily(selectedIso, next);
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
  // که برای selectedIso نمایش داده شده، نه لزوما «امروز واقعی».
  //
  // باگِ واقعیِ «انتقال به روز دیگر کار نمی‌کند»: اینجا custom همیشه true
  // فرستاده می‌شد، صرف‌نظر از اینکه برنامه واقعاً یک occurrence سفارشی
  // بود یا یکی از برنامه‌های پیش‌فرضِ داخلی. MoveOccurrenceModal دقیقاً
  // بر همین فیلد تصمیم می‌گیرد که رکوردِ قبلی را از کجا حذف کند (نگاه کن
  // به occ.custom در lib همان کامپوننت): اگر custom اشتباهاً true باشد
  // ولی occurrence اصلاً توی customOccurrences نباشد، حذفِ رکوردِ قبلی
  // هیچ اثری نمی‌کند — نتیجه این بود که برنامه‌ی تازه توی روزِ مقصد
  // اضافه می‌شد ولی نسخه‌ی قبلی هم سرِ جایش می‌ماند (به چشمِ کاربر یعنی
  // «کاری نکرد»، چون نتیجه دقیقاً چیزی نبود که انتظار داشت).
  function editTaskFromDash(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (!task) return;
    const jsDay = selectedDate.getDay();
    const dayName = WEEK_ORDER.find((o) => o.jsDay === jsDay)?.name || "";
    const isCustom = customOcc.some((c) => c.id === id);
    setEditTarget({ name: task.name, occ: { dayName, jsDay, time: task.time, id: task.id, custom: isCustom, importance: task.importance, tag: task.tag } });
  }

  function moveTaskFromDash(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (!task || task.isPast) return;
    const jsDay = selectedDate.getDay();
    const dayName = WEEK_ORDER.find((o) => o.jsDay === jsDay)?.name || "";
    const isCustom = customOcc.some((c) => c.id === id);
    setMoveTarget({ name: task.name, occ: { dayName, jsDay, time: task.time, id: task.id, custom: isCustom, importance: task.importance, tag: task.tag } });
  }

  // حذف فقط همین یک occurrence (یک روزِ هفته‌ی خاص) — چون هر روزِ یک
  // برنامه‌ی تکرارشونده رکورد id جداگانه‌ی خودش را دارد، این پیش‌فرض از
  // قبل هم «فقط این روز» عمل می‌کرد.
  //
  // طبقِ درخواستِ صریح: حذف یعنی «از همین روزی که رویش زده شده به بعد»،
  // نه پاک‌کردنِ کاملِ رکورد — چون رکورد کاملا پاک‌کردن یعنی گذشته‌ی همین
  // occurrence هم دیگر توی «برنامه هفتگی»/تاریخچه دیده نشود (تاریخچه از
  // روی همین آرایه‌ی زنده محاسبه می‌شود، نه یک اسنپ‌شاتِ جدا). به‌جایش
  // endDate روی «یک روز قبل از روزِ انتخاب‌شده» ست می‌شود؛ tasksForDate
  // (lib/schedule.ts) از آن به بعد دیگر این occurrence را برنمی‌گرداند،
  // ولی برای هر روزِ *قبل*‌ از این تاریخ دقیقا مثل قبل باقی می‌ماند.
  async function deleteTaskCompletely(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (task?.isPast) return;
    const cutoff = dayBeforeIso(selectedIso);
    await setCustomOccurrences(
      customOcc.flatMap((c) => {
        if (c.id !== id) return [c];
        // اگه خودِ occurrence از تاریخِ برشِ جدید دیرتر شروع شده (یعنی هیچ‌وقت
        // واقعا در گذشته اتفاق نیفتاده)، دیگه چیزی برای نگه‌داشتن نیست —
        // کاملا حذفش کن تا آرایه بی‌جهت بزرگ نشه.
        if (c.startDate && c.startDate > cutoff) return [];
        return [{ ...c, endDate: cutoff }];
      })
    );
    refresh();
  }

  // حذفِ همه‌ی تکرارها — همه‌ی occurrenceهایی که هم‌نامِ همین برنامه‌اند
  // (روی هر روزی که باشند)، طبقِ درخواستِ صریح («یا فقط یکشنبه یا فقط
  // چهارشنبه یا کلا هر دو»). همون منطقِ «از این روز به بعد» بالا، برای
  // همه‌ی روزهای هفته‌ای که این برنامه رویشان تکرار می‌شود.
  async function deleteAllTaskOccurrences(id: string) {
    const task = dashTasks.find((t) => t.id === id);
    if (!task || task.isPast) return;
    const cutoff = dayBeforeIso(selectedIso);
    await setCustomOccurrences(
      customOcc.flatMap((c) => {
        if (c.name !== task.name) return [c];
        if (c.startDate && c.startDate > cutoff) return [];
        return [{ ...c, endDate: cutoff }];
      })
    );
    refresh();
  }

  return (
    <>
      <section className="dash-breakout dash-scope pb-6 text-dash-text">
        <div className="flex flex-col gap-4 sm:gap-6">
          <RoutineHero />
          <RoutineTrialBanner />
          <SleepMiniCard />

          <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
            <DashDateSelector
              activeIso={selectedIso}
              onSelect={setSelectedIso}
              recenterKey={recenterKey}
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
                onClick={() => { setSelectedIso(isoLocal(now)); setRecenterKey((k) => k + 1); }}
              />
              <DashFilterButton
                label="فیلتر"
                icon={<Filter size={15} />}
                active={importanceFilter !== "all" || programFilter !== null}
                onClick={() => setFilterModalOpen(true)}
              />
            </div>
          </div>

          {/* دسکتاپ: دو ستون کنار هم — راست (پهن‌تر) برنامه‌های امروز از بالا
              تا پایین، چپ ردیفِ آیکونِ یادآوری/یادآوری‌دارو/آمار هفتگی/دوستان
              (DashQuickPanels) با محتوای کارتِ انتخاب‌شده زیرش. موبایل/تبلت
              همچنان یک ستون عمودی (flex-col) می‌مونه. */}
          {/* وقتی هر چهار کارتِ ردیفِ آیکون از تنظیمات خاموش باشن، گرید باید
              تک‌ستونه بشه — وگرنه یک ستون خالی ۱fr کنار صفحه باز می‌موند. */}
          <div
            className={
              isDesktop
                ? hasMiddleColumn
                  ? "flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_0.8fr_1fr] lg:items-stretch lg:gap-6"
                  : "flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_1fr] lg:items-stretch lg:gap-6"
                : hasQuickPanels
                ? "flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[2.5fr_1fr] lg:items-stretch lg:gap-6"
                : "flex flex-col gap-4 sm:gap-6"
            }
          >
            {status === "unauthenticated" ? (
              <AuthGate message="برای مدیریت برنامه‌های امروز وارد شوید" />
            ) : (
              <DashTaskList
                tasks={dashTasks}
                editable
                onToggle={toggleDashTask}
                onAddProgram={() => setAddProgramOpen(true)}
                onOpenProgram={openProgram}
                onEditTask={editTaskFromDash}
                onDeleteTask={deleteTaskCompletely}
                onDeleteAllTask={deleteAllTaskOccurrences}
                onMoveTask={moveTaskFromDash}
                onStartExercise={startExercise}
                delay={0.05}
              />
            )}

            {isDesktop ? (
              <>
                {hasMiddleColumn && (
                  <div className="dash-middle-col flex flex-col gap-4 sm:gap-6">
                    {dashboardPrefs.showReminders && <DashReminderCard delay={0.1} />}
                    {dashboardPrefs.showMedications && <DashMedicationCard delay={0.14} />}
                  </div>
                )}
                <DashSidebar statsRefreshKey={statsRefreshKey} />
              </>
            ) : (
              hasQuickPanels && <DashQuickPanels prefs={dashboardPrefs} statsRefreshKey={statsRefreshKey} />
            )}
          </div>

          <WeekPlanGrid days={weekGridDays} onItemClick={(it) => openProgram(it.label)} />
        </div>
      </section>

      {/* div نه section: قانونِ سراسریِ section{border-top} زیرِ «برنامه هفتگی» خط می‌کشید. */}
      <div className="dash-breakout">
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
            defaultDateIso={selectedIso}
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
            sourceIso={selectedIso}
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
        {/* دایره‌ی «مدیرِ برنامه» — گوشه‌ی چپ‌پایینِ همین صفحه. عمدا آخرین
            فرزندِ section است تا روی بقیه بنشیند بدون این‌که به z-index
            دستی نیاز داشته باشد. */}
        {assistantOn && <RoutineAiFab onChanged={refresh} />}
      </div>
    </>
  );
}
