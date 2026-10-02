"use client";
import "./friends.css";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { StreakFlame } from "./StreakFlame";
import { GoldenName } from "./GoldenName";
import { FriendRingAvatar } from "./FriendAvatar";
import { FriendWeekStrip } from "./FriendWeekStrip";
import { fullDays, isTodayComplete, type RankMode, type WeekPcts } from "@/lib/friendsRank";

export type FriendRowData = {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl: string | null;
  golden?: boolean;
  staff?: boolean;
  completed: number;
  total: number;
  pct: number;
  streak: number;
  favorite?: boolean;
  week?: WeekPcts | null;
  isMe?: boolean;
};

// یک ردیف رتبه‌بندی دوستان — مشترک کارت دوستان و صفحه‌ی /friends. ترتیب
// DOM عمدی‌ست (RTL): رتبه، آواتار داخل حلقه‌ی امروز، اسم/زیرنویس، امتیاز و در
// آخر (لبه‌ی چپ) اکشن‌ها. جابه‌جایی رتبه با layout  فریمر نرم انجام می‌شه و
// MotionConfig reducedMotion="user" والد، برای کاربر کم‌حرکت خاموشش می‌کنه.
export function FriendRankRow({
  f,
  rank,
  score,
  mode,
  unitLabel = "برنامه",
  index = 0,
  size = 44,
  onOpen,
  actions,
}: {
  f: FriendRowData;
  rank: number;
  score: number;
  mode: RankMode;
  unitLabel?: string;
  index?: number;
  size?: number;
  onOpen?: () => void;
  actions?: ReactNode;
}) {
  const done = isTodayComplete(f);
  const medal = rank <= 3 ? ` is-medal-${rank}` : "";
  const sub =
    mode === "week" ? (
      <FriendWeekStrip week={f.week} delay={0.15 + index * 0.03} />
    ) : done ? (
      <span className="fr-sub is-done">امروز کامل شد</span>
    ) : f.total > 0 ? (
      <span className="fr-sub">{f.completed} از {f.total} {unitLabel}</span>
    ) : (
      <span className="fr-sub">{unitLabel === "برنامه" ? "امروز برنامه‌ای نداره" : "برنامه‌ی فعالی نداره"}</span>
    );
  const Who = onOpen ? "button" : "div";
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.04 }}
      className={`fr-row${f.isMe ? " is-me" : ""}${done ? " is-done" : ""}`}
    >
      <span className={`fr-rank mono${medal}`} aria-label={`رتبه ${rank}`}>{rank}</span>
      <Who
        {...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
        className="fr-who"
      >
        <FriendRingAvatar name={f.name} avatarUrl={f.avatarUrl} pct={f.total > 0 ? f.pct : 0} size={size} delay={0.1 + index * 0.04} />
        <span className="fr-who-text">
          <span className="fr-name-line">
            <span className="fr-name"><GoldenName golden={f.golden} staff={f.staff}>{f.isMe ? "تو" : f.name}</GoldenName></span>
            {f.favorite && <Star size={11} className="fr-fav" fill="currentColor" aria-label="فیوریت" />}
            <StreakFlame streak={f.streak} className="fr-flame" />
          </span>
          {sub}
        </span>
      </Who>
      <span className="fr-score mono" title={mode === "week" ? `${fullDays(f.week)} روز کامل در هفته` : undefined}>
        {score}
        <small>%</small>
      </span>
      {actions && <span className="fr-actions">{actions}</span>}
    </motion.li>
  );
}
