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
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MotionConfig, motion } from "framer-motion";
import { AuthGate } from "./AuthGate";
import { SuperAdminGate } from "./SuperAdminGate";
import { useFeatures } from "@/lib/useFeatures";
import { FEATURE_KEYS, featureVisible, type FeatureKey } from "@/lib/featureFlags";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardRoutine } from "@/lib/useDashboardRoutine";
import type { DashboardData } from "@/lib/dashboardTypes";
import { DashboardHero } from "./DashboardHero";
import { DashboardToday } from "./DashboardToday";
import { DashboardHeatmap } from "./DashboardHeatmap";
import { DashboardRoutineLock } from "./DashboardRoutineLock";
import { DashboardCalorie, DashboardExercise } from "./DashboardFitness";
import { DashboardTrade } from "./DashboardTrade";
import { DashboardMarket } from "./DashboardMarket";
import { DashboardInbox, DashboardMentors, DashboardRoadmaps } from "./DashboardSocial";
import { DashboardQuickActions } from "./DashboardLauncher";
import { DashboardActionsProvider } from "./DashboardActions";
import { DashboardCommand, useCommandHotkey } from "./DashboardCommand";
import { DashboardShare } from "./DashboardShare";
import { V_GRID } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

export type DashboardGate = "guest" | "off" | "on";

/**
 * گیت سمت سرور تصمیم گرفته می‌شه (app/dashboard/page.tsx) و داده اولیه هم
 * همراه HTML میاد — دیگه نه منتظر /api/features می‌مونیم نه /api/dashboard.
 * enforcement واقعی همچنان روی روت API هم هست (featureBlocked).
 */
export function DashboardClient({ gate, initial }: { gate: DashboardGate; initial: { key: string; data: DashboardData } | null }) {
  if (gate === "guest") {
    return <section className="db-page"><AuthGate message="برای دیدن داشبورد وارد شوید" /></section>;
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
type Area = "today" | "heat" | "ex" | "cal" | "trade" | "market" | "mentor" | "road" | "inbox";
function bentoAreas(has: Set<Area>) {
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

function DashboardBody({ initial }: { initial: { key: string; data: DashboardData } | null }) {
  const { data, status, refresh } = useDashboardData(initial);
  const router = useRouter();
  const refreshNow = useCallback(() => refresh(true), [refresh]);
  const goTo = useCallback((href: string) => router.push(href), [router]);
  const routine = useDashboardRoutine();
  const flagFeatures = useFeatures();
  const { data: session } = useSession();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const toggleCmd = useCallback((fn: (v: boolean) => boolean) => setCmdOpen(fn), []);
  useCommandHotkey(toggleCmd);

  const features = data?.features ?? flagFeatures;
  const modules = useMemo(() => (data ? new Set(data.modules) : null), [data]);
  const isAdmin = !!(data?.user.isAdmin ?? ((session?.user as any)?.isAdmin || (session?.user as any)?.isSuperAdmin));
  const loading = !data && status === "loading";
  // هر بخش ماژول پولی فقط با خرید همون بخش به داشبورد اضافه می‌شه (نه کارت
  // قفل برای همه). بخش‌های چندبخشی (هیرو، کارهای سریع، همه‌ی بخش‌ها، جست‌وجو)
  // می‌مونن ولی داده‌ی ماژول خریده‌نشده رو نمی‌گیرن (سرور براش null می‌ده).
  // فلگ‌های پنل ادمین (/admin/features): بخش خاموش اصلا کارت نمی‌گیره
  const owns = (m: string) => !!modules && modules.has(m);
  const on = (k: FeatureKey) => featureVisible(features, k);
  const flagSig = FEATURE_KEYS.map((k) => (on(k) ? 1 : 0)).join("");
  const routineOn = on("routine");
  const has = useMemo(() => {
    const set = new Set<Area>(["inbox"]);
    if (routineOn) { set.add("today"); set.add("heat"); }
    if (owns("EXERCISE") && on("exercise")) set.add("ex");
    if (owns("CALORIE") && on("calorie")) set.add("cal");
    if (owns("TRADE") && on("tradeJournal")) set.add("trade");
    if (owns("TRADE") && on("economicCalendar")) set.add("market");
    if (on("mentors")) set.add("mentor");
    if (owns("ROADMAP") && features?.roadmaps === true) set.add("road");
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, flagSig, features?.roadmaps]);
  const areas = useMemo(() => bentoAreas(has), [has]);
  // «روتین من» بعد از ۱۴ روز رایگان پلن می‌خواد — تا وقتی ماژول‌ها معلوم نشدن
  // (modules=null) قفل نشون داده نمی‌شه که صفحه‌ی خریده‌شده یک لحظه قفل نپره.
  const routineLocked = !!modules && !modules.has("ROUTINE");

  if (status === "forbidden" && !data) {
    return <div className="db-error"><DashIcon name="lock" /> این بخش موقتا غیرفعال است</div>;
  }

  return (
    <MotionConfig reducedMotion="user">
      <DashboardActionsProvider scheduleOpts={routine.opts} onChanged={refreshNow} onNeedPage={goTo}>
      <DashboardHero data={data} routine={routine} routineLocked={routineLocked} routineOff={!routineOn} streakOn={on("streak")} onOpenCommand={() => setCmdOpen(true)} onShare={on("shareCards") ? () => setShareOpen(true) : undefined} />
      <DashboardQuickActions features={features} modules={modules} />

      {status === "error" && !data && (
        <div className="db-error">
          <DashIcon name="bell" /> دریافت اطلاعات ناموفق بود.
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => refresh(true)}>تلاش دوباره</button>
        </div>
      )}

      <motion.div className="db-bento" style={areas} variants={V_GRID} initial="hidden" animate="show">
        {!routineOn ? null : routineLocked ? (
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
        {has.has("ex") && <DashboardExercise ex={data?.exercise ?? null} loading={loading} />}
        {has.has("cal") && <DashboardCalorie cal={data?.calorie ?? null} loading={loading} />}
        {has.has("trade") && <DashboardTrade trade={data?.trade ?? null} loading={loading} />}
        {has.has("market") && <DashboardMarket events={data?.calendar?.events ?? null} loading={loading} />}
        {has.has("mentor") && <DashboardMentors m={data?.mentors ?? null} loading={loading} />}
        {has.has("road") && <DashboardRoadmaps r={data?.roadmaps ?? null} loading={loading} />}
        <DashboardInbox data={data} loading={loading} />
      </motion.div>

      <DashboardShare open={shareOpen} onClose={() => setShareOpen(false)} data={data} routine={routine} routineLocked={routineLocked} />
      <DashboardCommand open={cmdOpen} onClose={() => setCmdOpen(false)} features={features} modules={modules} isAdmin={isAdmin} />
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
