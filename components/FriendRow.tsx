"use client";
import "./friends.css";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { StreakFlame } from "./StreakFlame";
import { GoldenName } from "./GoldenName";
import { FriendRingAvatar } from "./FriendAvatar";
import { tr, isEn } from "@/lib/i18n";

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
};

/** فیوریت‌ها اول، بعد به ترتیب نام (فقط مرتب‌سازی آرام، نه رقابت) */
export function sortFriends<T extends { name: string; favorite?: boolean }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name, "fa"));
}

// یک ردیف ساده‌ی دوست: آواتار داخل حلقه‌ی پیشرفت امروز، اسم (طلایی/بنفش)،
// شعله‌ی استریک. بدون رتبه و امتیاز.
export function FriendRow({ f, size = 40, onOpen, actions }: { f: FriendRowData; size?: number; onOpen?: () => void; actions?: ReactNode }) {
  return (
    <li className="fr-row">
      <button type="button" className="fr-who" onClick={onOpen}>
        <FriendRingAvatar name={f.name} avatarUrl={f.avatarUrl} pct={f.total > 0 ? f.pct : 0} size={size} />
        <span className="fr-who-text">
          <span className="fr-name-line">
            <span className="fr-name"><GoldenName golden={f.golden} staff={f.staff}>{f.name}</GoldenName></span>
            {f.favorite && <Star size={11} className="fr-fav" fill="currentColor" aria-label={tr("فیوریت", "Favorite")} />}
            <StreakFlame streak={f.streak} className="fr-flame" />
          </span>
        </span>
      </button>
      {actions && <span className="fr-actions">{actions}</span>}
    </li>
  );
}
