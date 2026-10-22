"use client";

// داشبورد — نمای کلی همه‌ی بخش‌ها و (وقتی فلگ `dashboard` روشن باشه) صفحه‌ی
// اصلی بعد از ورود. پیش‌فرض برای همه روشنه؛ خاموش برای کاربر → /weekly (Owner همیشه).
//
// معماری:
//   • روتین از lib/storage.ts (useDashboardRoutine) — زنده و هم‌گام با /weekly.
//   • بقیه‌ی ماژول‌ها با یک درخواست از /api/dashboard (useDashboardData) که
//     خودش پشت فلگ و گیت ماژول‌هاست؛ این‌جا FeatureGate فقط UI ـه.
//   • چیدمان بنتو با grid-template-areas در app/dashboard/dashboard.css.

import "@/app/dashboard/dashboard.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { preloadWhenIdle } from "@/lib/preloadIdle";
import { prefetchWhenIdle } from "@/lib/prefetchPolicy";
import { useRouter } from "next/navigation";
import { MotionConfig, m as motion } from "framer-motion";
import { AuthGate } from "./AuthGate";
import { SuperAdminGate } from "./SuperAdminGate";
import { useFeatures } from "@/lib/useFeatures";
import { FEATURE_KEYS, featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardRoutine } from "@/lib/useDashboardRoutine";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { SectionKey } from "@/lib/sections";
import { DashboardHero } from "./DashboardHero";
import { DashboardToday } from "./DashboardToday";
import { DashboardHeatmap } from "./DashboardHeatmap";
import { DashboardRoutineLock } from "./DashboardRoutineLock";
import { DashboardCalorie, DashboardExercise } from "./DashboardFitness";
import { DashboardSleep } from "./DashboardSleep";
import { DashboardWorkoutSpace } from "./DashboardWorkoutSpace";
import { DashboardModuleLock } from "./DashboardModuleLock";
import { useSection } from "./SectionProvider";
import { dashboardBlocks, sectionAreas, type DashArea } from "@/lib/dashboardSection";
import { DashboardTrade } from "./DashboardTrade";
import { DashboardMarket } from "./DashboardMarket";
import { DashboardTradeTools, TRADE_TOOL_FLAGS } from "./DashboardTradeTools";
import { DashboardInbox, DashboardMentors, DashboardRoadmaps } from "./DashboardSocial";
import { DashboardActionsProvider } from "./DashboardActions";
import { V_GRID } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";
import { tr, isEn } from "@/lib/i18n";

export type DashboardGate = "guest" | "off" | "on";

/**
 * گیت سمت سرور تصمیم گرفته می‌شه (app/dashboard/page.tsx) و داده اولیه هم
 * همراه HTML میاد — دیگه نه منتظر /api/features می‌مونیم نه /api/dashboard.
 * enforcement واقعی همچنان روی روت API هم هست (featureBlocked).
 */
export function DashboardClient({ gate, initial }: { gate: DashboardGate; initial: { key: string; data: DashboardData } | null }) {
  if (gate === "guest") {
    return <section className="db-page"><AuthGate message={tr("برای دیدن داشبورد وارد شوید", "Sign in to view the dashboard")} /></section>;
  }
  if (gate === "off") {
    return <section className="db-page dash-scope"><SuperAdminGate forceLocked><DashboardShellSkeleton /></SuperAdminGate></section>;
  }
  return (
    <section className="db-page dash-scope">
      <DashboardBody initial={initial} />
    </section>
  );
}

/**
 * grid-template-areas برای سه عرض — از روی کارت‌هایی که واقعا هستن ساخته
 * می‌شه: کارت ماژول خریده‌نشده یا فلگ خاموش اصلا رندر نمی‌شه و هیچ‌وقت یک
 * خانه‌ی خالی در چیدمان نمی‌ذاره.
 */
type Area = DashArea;
function bentoAreas(has: Set<Area>, section: SectionKey | null = null) {
  // زیردامنه‌ی یک بخش: چیدمان همون بخش (lib/dashboardSection.ts)؛ دامنه‌ی اصلی همون چیدمان قبلی
  if (section) {
    const a = sectionAreas(has, section);
    return { ["--areas-lg" as any]: a.lg, ["--areas-md" as any]: a.md, ["--areas-sm" as any]: a.sm } as React.CSSProperties;
  }
  const q = (row: string[]) => `"${row.join(" ")}"`;
  const fit = (list: string[], cols: number) => {
    // یک ردیف با `cols` ستون؛ کارت آخر جای خالی رو پر می‌کنه
    const row = list.slice(0, cols);
    while (row.length < cols) row.push(row[row.length - 1]);
    return row;
  };
  const fitness = (["ex", "cal"] as Area[]).filter((a) => has.has(a));
  const bottom = (["mentor", "road", "inbox"] as Area[]).filter((a) => has.has(a));
  // روتین از پنل ادمین خاموش (فلگ routine) → کارت‌های امروز/نقشه‌ی ثبات نیستن
  const routine = has.has("today");
  const tradeRow = (["trade", "market"] as Area[]).filter((a) => has.has(a));
  // «دوستان» و «همه‌ی بخش‌ها» به درخواست صریح از پایین داشبورد برداشته شدن؛
  // آخرین ردیف همون کارت‌های کوتاه مربی/رودمپ/اعلان‌هاست.
  const lg: string[] = [];
  if (routine) lg.push(q(["today", "heat", "heat"]));
  if (fitness.length) lg.push(q(routine ? ["today", ...fit(fitness, 2)] : fit(fitness, 3)));
  if (tradeRow.length === 2) lg.push(q(["trade", "trade", "market"]));
  else if (tradeRow.length === 1) lg.push(q(fit(tradeRow, 3)));
  if (bottom.length) lg.push(q(fit(bottom, 3)));

  const md: string[] = [];
  if (routine) md.push(q(["heat", "heat"]));
  if (routine && fitness.length === 2) md.push(q(["today", "ex"]), q(["today", "cal"]));
  else if (routine && fitness.length === 1) md.push(q(["today", fitness[0]]));
  else if (routine) md.push(q(["today", "today"]));
  else if (fitness.length) md.push(q(fit(fitness, 2)));
  for (const a of tradeRow) md.push(q([a, a]));
  for (let i = 0; i < bottom.length; i += 2) md.push(q(bottom[i + 1] ? [bottom[i], bottom[i + 1]] : [bottom[i], bottom[i]]));

  const order: Area[] = ["today", "ex", "cal", "heat", "trade", "market", "mentor", "road", "inbox"];
  const sm = order.filter((a) => has.has(a)).map((a) => q([a])).join(" ");
  return { ["--areas-lg" as any]: lg.join(" "), ["--areas-md" as any]: md.join(" "), ["--areas-sm" as any]: sm } as React.CSSProperties;
}

// پنجره‌ی اشتراک فقط با تعامل باز می‌شه؛ چانکش خارج از مسیر لود اولیه‌ست
const loadShare = () => import("./DashboardShare").then((m) => m.DashboardShare);
const DashboardShare = dynamic(loadShare, { ssr: false });

function DashboardBody({ initial }: { initial: { key: string; data: DashboardData } | null }) {
  const { data, status, refresh } = useDashboardData(initial);
  const router = useRouter();
  const refreshNow = useCallback(() => refresh(true), [refresh]);
  const goTo = useCallback((href: string) => router.push(href), [router]);
  const section = useSection();
  const blocks = dashboardBlocks(section);
  // تنها مقصد واقعا محتمل بعدی؛ بعد از اولین پینت، زمان بیکاری، و نه روی اتصال کند/صرفه‌جویی داده
  // (روی زیردامنه‌ی ورزش/ترید، /weekly به دامنه‌ی دیگه‌ای ریدایرکت می‌شه، پس مقصد خود بخشه)
  const nextHref = section === "workout" ? "/sleep" : section === "trade" ? "/trade/journal" : "/weekly";
  useEffect(() => prefetchWhenIdle((h) => router.prefetch(h), nextHref), [router, nextHref]);
  // روتین کامل فقط برای دامنه‌ی اصلی و بخش روتین؛ ورزش فقط ساعت‌های خواب (نوار روز)؛ ترید هیچ
  const routine = useDashboardRoutine(blocks.routine ? "full" : section === "workout" ? "wake" : "none");
  const flagFeatures = useFeatures();
  const [shareOpen, setShareOpen] = useState(false);
  // بعد از اولین باز شدن mount می‌مونه تا انیمیشن بسته‌شدن سر جاش بمونه
  const [shareEver, setShareEver] = useState(false);
  useEffect(() => { if (shareOpen) setShareEver(true); }, [shareOpen]);
  useEffect(() => { preloadWhenIdle(loadShare); }, []);

  const features = data?.features ?? flagFeatures;
  const modules = useMemo(() => (data ? new Set(data.modules) : null), [data]);
  const loading = !data && status === "loading";
  // هر بخش ماژول پولی فقط با خرید همون بخش به داشبورد اضافه می‌شه (نه کارت
  // قفل برای همه). بخش‌های چندبخشی (هیرو، کارهای سریع، همه‌ی بخش‌ها، جست‌وجو)
  // می‌مونن ولی داده‌ی ماژول خریده‌نشده رو نمی‌گیرن (سرور براش null می‌ده).
  // فلگ‌های پنل ادمین (/admin/features): بخش خاموش اصلا کارت نمی‌گیره
  const owns = (m: string) => !!modules && modules.has(m);
  const on = (k: FeatureKey) => featureVisible(features, k);
  const flagSig = FEATURE_KEYS.map((k) => (on(k) ? 1 : 0)).join("");
  const routineOn = on("routine");
  const { has, locked } = useMemo(() => {
    const set = new Set<Area>(["inbox"]);
    // کارت ماژول پولی خریده‌نشده فقط روی زیردامنه‌ی خودش قفل نشون می‌ده (دامنه‌ی اصلی مثل قبل: اصلا کارتی نیست)
    const lock = new Set<Area>();
    if (!section) {
      if (routineOn) { set.add("today"); set.add("heat"); }
      if (owns("EXERCISE") && on("exercise")) set.add("ex");
      if (owns("CALORIE") && on("calorie")) set.add("cal");
      if (owns("TRADE") && on("tradeJournal")) set.add("trade");
      if (owns("TRADE") && on("economicCalendar")) set.add("market");
      if (on("mentors")) set.add("mentor");
      if (owns("ROADMAP") && features?.roadmaps === true) set.add("road");
      return { has: set, locked: lock };
    }
    const paid = (area: Area, mod: string, flag: FeatureKey) => {
      if (!on(flag)) return;
      if (owns(mod)) set.add(area);
      else if (modules) { set.add(area); lock.add(area); }
    };
    if (blocks.routine && routineOn) { set.add("today"); set.add("heat"); }
    if (blocks.sleep && on("sleep")) set.add("sleep");
    if (blocks.fitness) {
      // ورزش: «فضای تمرین» (پنل‌های واقعی)؛ ماژول خریده‌نشده رو ModuleGate داخل خودش نشون می‌ده، پس کارت قفل جدا نداریم
      if (section === "workout") { if (on("exercise") || on("calorie")) set.add("space"); }
      else { paid("ex", "EXERCISE", "exercise"); paid("cal", "CALORIE", "calorie"); }
    }
    if (blocks.trade) {
      paid("trade", "TRADE", "tradeJournal");
      if (owns("TRADE") && on("economicCalendar")) set.add("market");
      // ابزارهای ترید (جای هاب قدیمی /trade): فقط با ماژول و حداقل یک ابزار روشن
      if (section === "trade" && owns("TRADE") && TRADE_TOOL_FLAGS.some(on)) set.add("tools");
    }
    if (on("mentors")) set.add("mentor");
    if (blocks.roadmaps && owns("ROADMAP") && features?.roadmaps === true) set.add("road");
    return { has: set, locked: lock };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, flagSig, features?.roadmaps, section]);
  const areas = useMemo(() => bentoAreas(has, section), [has, section]);
  // «روتین من» بعد از ۱۴ روز رایگان پلن می‌خواد — تا وقتی ماژول‌ها معلوم نشدن
  // (modules=null) قفل نشون داده نمی‌شه که صفحه‌ی خریده‌شده یک لحظه قفل نپره.
  const routineLocked = !!modules && !modules.has("ROUTINE");

  if (status === "forbidden" && !data) {
    return <div className="db-error"><DashIcon name="lock" /> {tr("این بخش موقتا غیرفعال است", "This section is temporarily disabled")}</div>;
  }

  return (
    <MotionConfig reducedMotion="user">
      <DashboardActionsProvider scheduleOpts={routine.opts} onChanged={refreshNow} onNeedPage={goTo}>
      <DashboardHero data={data} routine={routine} routineLocked={routineLocked} routineOff={!routineOn} streakOn={on("streak")} section={section} tradeCta={section === "trade" && owns("TRADE") && on("tradeJournal")} sessionPill={on("forexClock")} onTradeSaved={refreshNow} onShare={section !== "trade" && on("shareCards") ? () => setShareOpen(true) : undefined} />

      {status === "error" && !data && (
        <div className="db-error">
          <DashIcon name="bell" /> {tr("دریافت اطلاعات ناموفق بود.", "Could not load data.")}
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => refresh(true)}>{tr("تلاش دوباره", "Try again")}</button>
        </div>
      )}

      <motion.div className="db-bento" style={areas} variants={V_GRID} initial="hidden" animate="show">
        {!has.has("today") ? null : routineLocked ? (
          <>
            <DashboardRoutineLock area="today" />
            <DashboardRoutineLock area="heat" />
          </>
        ) : (
          <>
            <DashboardToday ready={routine.ready} tasks={routine.tasks} stats={routine.stats} week={routine.heat.length ? routine.heat[routine.heat.length - 1] : null} onToggle={routine.toggle} />
            <DashboardHeatmap heat={routine.heat} streak={routine.streak} ready={routine.ready && routine.rangeLoaded} memberSince={data?.user.memberSince} />
          </>
        )}
        {has.has("sleep") && <DashboardSleep sleep={data?.sleep ?? null} loading={loading} />}
        {has.has("space") && <DashboardWorkoutSpace features={features} />}
        {has.has("ex") && (locked.has("ex") ? <DashboardModuleLock area="ex" /> : <DashboardExercise ex={data?.exercise ?? null} loading={loading} />)}
        {has.has("cal") && (locked.has("cal") ? <DashboardModuleLock area="cal" /> : <DashboardCalorie cal={data?.calorie ?? null} loading={loading} />)}
        {has.has("trade") && (locked.has("trade") ? <DashboardModuleLock area="trade" /> : <DashboardTrade trade={data?.trade ?? null} loading={loading} />)}
        {has.has("market") && <DashboardMarket events={data?.calendar?.events ?? null} loading={loading} />}
        {has.has("tools") && <DashboardTradeTools tools={data?.tradeTools ?? null} accountCount={data?.trade?.accountCount ?? null} accounts={data?.trade?.accounts ?? []} features={features} loading={loading} />}
        {has.has("mentor") && <DashboardMentors m={data?.mentors ?? null} loading={loading} />}
        {has.has("road") && <DashboardRoadmaps r={data?.roadmaps ?? null} loading={loading} />}
        <DashboardInbox data={data} loading={loading} />
      </motion.div>

      {shareEver && <DashboardShare open={shareOpen} onClose={() => setShareOpen(false)} data={data} routine={routine} routineLocked={routineLocked} />}
      </DashboardActionsProvider>
    </MotionConfig>
  );
}

function DashboardShellSkeleton() {
  return (
    <div className="db-shell-skel" aria-busy="true">
      <span className="db-skel" style={{ height: 230, borderRadius: 24 }} />
      <span className="db-skel" style={{ height: 56, borderRadius: 16 }} />
      <div className="db-shell-skel-row">
        <span className="db-skel" style={{ height: 300, borderRadius: 22 }} />
        <span className="db-skel" style={{ height: 300, borderRadius: 22 }} />
      </div>
    </div>
  );
}
