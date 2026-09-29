"use client";

// داشبورد — نمای کلیِ همه‌ی بخش‌ها و (وقتی فلگِ `dashboard` روشن باشه) صفحه‌ی
// اصلیِ بعد از ورود. فعلا فقط ادمین‌ها (فلگ پیش‌فرض admins؛ Owner همیشه).
//
// معماری:
//   • روتین از lib/storage.ts (useDashboardRoutine) — زنده و هم‌گام با /weekly.
//   • بقیه‌ی ماژول‌ها با یک درخواست از /api/dashboard (useDashboardData) که
//     خودش پشتِ فلگ و گیتِ ماژول‌هاست؛ این‌جا FeatureGate فقط UI ـه.
//   • چیدمانِ بنتو با grid-template-areas در app/dashboard/dashboard.css.

import "@/app/dashboard/dashboard.css";
import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { MotionConfig, motion } from "framer-motion";
import { AuthGate } from "./AuthGate";
import { SuperAdminGate } from "./SuperAdminGate";
import { useFeatures } from "@/lib/useFeatures";
import { useDashboardData } from "@/lib/useDashboardData";
import { useDashboardRoutine } from "@/lib/useDashboardRoutine";
import type { DashboardData } from "@/lib/dashboardTypes";
import { DashboardHero } from "./DashboardHero";
import { DashboardToday } from "./DashboardToday";
import { DashboardHeatmap } from "./DashboardHeatmap";
import { DashboardCalorie, DashboardExercise } from "./DashboardFitness";
import { DashboardTrade } from "./DashboardTrade";
import { DashboardMarket } from "./DashboardMarket";
import { DashboardInbox, DashboardMentors, DashboardRoadmaps } from "./DashboardSocial";
import { DashboardLauncher, DashboardQuickActions } from "./DashboardLauncher";
import { DashboardCommand, useCommandHotkey } from "./DashboardCommand";
import { DashFriendsCard } from "./DashFriendsCard";
import { V_GRID } from "./DashboardKit";
import { DashIcon } from "./DashboardIcons";

export type DashboardGate = "guest" | "off" | "on";

/**
 * گیت سمتِ سرور تصمیم گرفته می‌شه (app/dashboard/page.tsx) و دادهِ اولیه هم
 * همراهِ HTML میاد — دیگه نه منتظرِ /api/features می‌مونیم نه /api/dashboard.
 * enforcement واقعی همچنان روی روتِ API هم هست (featureBlocked).
 */
export function DashboardClient({ gate, initial }: { gate: DashboardGate; initial: { key: string; data: DashboardData } | null }) {
  if (gate === "guest") {
    return <section className="db-page"><AuthGate message="برای دیدنِ داشبورد وارد شوید" /></section>;
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
 * می‌شه تا کارتِ مخفی (فلگِ خاموش) هیچ‌وقت یک خانه‌ی خالی در چیدمان نذاره.
 */
function bentoAreas(bottom: string[]) {
  const q = (row: string[]) => `"${row.join(" ")}"`;
  const lgBottom = bottom.length === 3 ? bottom : bottom.length === 2 ? [bottom[0], bottom[1], bottom[1]] : bottom.length === 1 ? [bottom[0], bottom[0], bottom[0]] : [];
  const lg = [q(["today", "heat", "heat"]), q(["today", "ex", "cal"]), q(["trade", "trade", "market"]), ...(lgBottom.length ? [q(lgBottom)] : []), q(["friends", "launch", "launch"])].join(" ");
  const pairs = [...bottom, "friends"];
  const md: string[] = [q(["heat", "heat"]), q(["today", "ex"]), q(["today", "cal"]), q(["trade", "trade"]), q(["market", "market"])];
  for (let i = 0; i < pairs.length; i += 2) md.push(q(pairs[i + 1] ? [pairs[i], pairs[i + 1]] : [pairs[i], pairs[i]]));
  md.push(q(["launch", "launch"]));
  const sm = ["today", "ex", "cal", "heat", "trade", "market", ...bottom, "friends", "launch"].map((a) => q([a])).join(" ");
  return { ["--areas-lg" as any]: lg, ["--areas-md" as any]: md.join(" "), ["--areas-sm" as any]: sm } as React.CSSProperties;
}

function DashboardBody({ initial }: { initial: { key: string; data: DashboardData } | null }) {
  const { data, status, refresh } = useDashboardData(initial);
  const routine = useDashboardRoutine();
  const flagFeatures = useFeatures();
  const { data: session } = useSession();
  const [cmdOpen, setCmdOpen] = useState(false);
  const toggleCmd = useCallback((fn: (v: boolean) => boolean) => setCmdOpen(fn), []);
  useCommandHotkey(toggleCmd);

  const features = data?.features ?? flagFeatures;
  const modules = useMemo(() => (data ? new Set(data.modules) : null), [data]);
  const isAdmin = !!(data?.user.isAdmin ?? ((session?.user as any)?.isAdmin || (session?.user as any)?.isSuperAdmin));
  const loading = !data && status === "loading";
  const locked = (m: string) => !!modules && !modules.has(m);
  const showMentors = features?.mentors !== false;
  const showRoadmaps = features?.roadmaps === true;
  const areas = useMemo(() => bentoAreas([...(showMentors ? ["mentor"] : []), ...(showRoadmaps ? ["road"] : []), "inbox"]), [showMentors, showRoadmaps]);

  if (status === "forbidden" && !data) {
    return <div className="db-error"><DashIcon name="lock" /> این بخش موقتا غیرفعال است</div>;
  }

  return (
    <MotionConfig reducedMotion="user">
      <DashboardHero data={data} routine={routine} onOpenCommand={() => setCmdOpen(true)} />
      <DashboardQuickActions features={features} modules={modules} />

      {status === "error" && !data && (
        <div className="db-error">
          <DashIcon name="bell" /> دریافتِ اطلاعات ناموفق بود.
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => refresh(true)}>تلاشِ دوباره</button>
        </div>
      )}

      <motion.div className="db-bento" style={areas} variants={V_GRID} initial="hidden" animate="show">
        <DashboardToday ready={routine.ready} tasks={routine.tasks} stats={routine.stats} week={routine.heat.length ? routine.heat[routine.heat.length - 1] : null} onToggle={routine.toggle} />
        <DashboardHeatmap heat={routine.heat} streak={routine.streak} ready={routine.ready && routine.rangeLoaded} />
        <DashboardExercise ex={data?.exercise ?? null} loading={loading} locked={locked("EXERCISE")} />
        <DashboardCalorie cal={data?.calorie ?? null} loading={loading} locked={locked("CALORIE")} />
        <DashboardTrade trade={data?.trade ?? null} loading={loading} locked={locked("TRADE")} />
        <DashboardMarket events={data?.calendar?.events ?? null} loading={loading} locked={locked("TRADE")} />
        {showMentors && <DashboardMentors m={data?.mentors ?? null} loading={loading} />}
        {showRoadmaps && <DashboardRoadmaps r={data?.roadmaps ?? null} loading={loading} locked={locked("ROADMAP")} />}
        <DashboardInbox data={data} loading={loading} />
        <motion.div className="db-embed" style={{ gridArea: "friends" }} variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
          <DashFriendsCard />
        </motion.div>
        <DashboardLauncher features={features} modules={modules} isAdmin={isAdmin} />
      </motion.div>

      <DashboardCommand open={cmdOpen} onClose={() => setCmdOpen(false)} features={features} modules={modules} isAdmin={isAdmin} />
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
