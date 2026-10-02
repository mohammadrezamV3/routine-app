"use client";

// ردیف «تو» در رتبه‌بندی دوستان — عمدا سمت کلاینت و از lib/storage.ts (نه یک
// فیلد جدا در /api/friends): همون قرارداد persistence و همگام‌سازی زنده‌ی
// بقیه‌ی اپ؛ تیکی که در /weekly یا داشبورد زده می‌شه همون لحظه رتبه‌ی خود
// کاربر رو جابه‌جا می‌کنه. استریک فقط از lib/routineStreak.ts (useMyStreak).

import { useEffect, useMemo, useState } from "react";
import { isoLocal } from "./jalali";
import { computeDayStats } from "./schedule";
import { getCustomOccurrences, getDaily, getDailyRange, getRemovedOccurrences } from "./storage";
import { keyMatches, useLiveRefresh } from "./liveSync";
import { useMyStreak } from "./useMyStreak";
import { getAccount, getAvatarUrl } from "./accountCache";
import { WEEK_DAYS, type WeekPcts } from "./friendsRank";

export type MyFriendEntry = {
  id: string;
  isMe: true;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  golden: boolean;
  staff: boolean;
  completed: number;
  total: number;
  pct: number;
  streak: number;
  week: WeekPcts;
};

export function useMyFriendEntry(enabled = true): MyFriendEntry | null {
  const { streak } = useMyStreak();
  const [who, setWho] = useState<{ name: string; username: string | null; golden: boolean; staff: boolean; avatarUrl: string | null } | null>(null);
  const [stats, setStats] = useState<{ completed: number; total: number; pct: number; week: WeekPcts } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    Promise.all([getAccount(), getAvatarUrl()]).then(([acc, avatarUrl]) => {
      if (!alive) return;
      const u = (acc?.user ?? {}) as Record<string, any>;
      setWho({
        name: u.firstName || u.name || u.username || "تو",
        username: u.username ?? null,
        golden: !!u.golden,
        staff: !!u.staff,
        avatarUrl: avatarUrl ?? null,
      });
    }).catch(() => {});
    return () => { alive = false; };
  }, [enabled]);

  useLiveRefresh(["daily", "customOccurrences", "removedOccurrences"], (changed) => {
    if (changed.some((c) => c === "*" || keyMatches("daily", c) || c === "customOccurrences" || c === "removedOccurrences")) setVersion((v) => v + 1);
  }, { enabled });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const now = new Date();
    const todayIso = isoLocal(now);
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (WEEK_DAYS - 1));
    Promise.all([getCustomOccurrences(), getRemovedOccurrences(), getDailyRange(isoLocal(from), todayIso), getDaily(todayIso)])
      .then(([custom, removed, range, todayRec]) => {
        if (!alive) return;
        const opts = { customOccurrences: custom, removedOccurrences: new Set(removed) };
        const entries = { ...range, [todayIso]: todayRec };
        const week: WeekPcts = [];
        let today = { completed: 0, total: 0, pct: 0 };
        for (let back = WEEK_DAYS - 1; back >= 0; back--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
          const s = computeDayStats(d, opts, entries[isoLocal(d)]);
          if (back === 0) today = s;
          week.push(s.total > 0 ? s.pct : null);
        }
        setStats({ ...today, week });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [enabled, version]);

  return useMemo(() => {
    if (!enabled || !who || !stats) return null;
    return { id: "me", isMe: true as const, ...who, ...stats, streak: streak ?? 0 };
  }, [enabled, who, stats, streak]);
}
