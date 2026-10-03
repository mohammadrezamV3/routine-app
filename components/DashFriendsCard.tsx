"use client";

import "./friends.css";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import { useFeature } from "@/lib/useFeatures";
import { useSession } from "next-auth/react";
import { DashCard } from "./DashCard";
import { AgentAvatar } from "./AgentAvatar";
import { FriendProfileModal } from "./FriendProfileModal";
import { FriendRow, sortFriends, type FriendRowData } from "./FriendRow";
import { FriendsManageSheet } from "./FriendsManageSheet";
import { getPreloadedBootstrap } from "@/lib/preload";
import { useLiveRefresh } from "@/lib/liveSync";

export type FriendListItem = FriendRowData & { friendshipId: string; username: string | null; favorite: boolean };
type FriendRequest = { friendshipId: string; id: string; name: string; username: string | null; avatarUrl: string | null; golden?: boolean; staff?: boolean };

// کش آخرین لیست دوستان (حافظه + localStorage) تا کارت همون اول با داده رندر
// بشه و «در حال بارگذاری» نبینه؛ داده‌ی تازه پشت صحنه جایگزین می‌شه.
const FRIENDS_CACHE_KEY = "friends-cache-v2";
const memFriendsCache = new Map<string, FriendListItem[]>();
function readFriendsCache(key: string): FriendListItem[] | null {
  const mem = memFriendsCache.get(key);
  if (mem) return mem;
  try {
    const raw = window.localStorage.getItem(`${FRIENDS_CACHE_KEY}:${key}`);
    const list = raw ? (JSON.parse(raw) as FriendListItem[]) : null;
    if (Array.isArray(list)) { memFriendsCache.set(key, list); return list; }
  } catch {}
  return null;
}
export function writeFriendsCache(key: string, list: FriendListItem[] | null) {
  try {
    if (list) {
      memFriendsCache.set(key, list);
      window.localStorage.setItem(`${FRIENDS_CACHE_KEY}:${key}`, JSON.stringify(list));
    } else {
      memFriendsCache.delete(key);
      window.localStorage.removeItem(`${FRIENDS_CACHE_KEY}:${key}`);
    }
  } catch {}
}

// فلگ «دوستان» از پنل ادمین (/admin/features) — خاموش یعنی کارت اصلا رندر نمی‌شه
// (روت‌های /api/friends هم سمت سرور همون 403 رو می‌دن)
export function DashFriendsCard(props: { delay?: number; module?: "exercise" | "calorie" }) {
  const on = useFeature("friends");
  if (on === false) return null;
  return <DashFriendsCardInner {...props} />;
}

// کارت «دوستان» — فهرست آرام دوستان: آواتار داخل حلقه‌ی پیشرفت امروز، نام
// طلایی/بنفش و شعله‌ی استریک. بدون رتبه‌بندی و بدون صفحه‌ی جدا؛ مدیریت (افزودن/
// درخواست‌ها/حذف/فیوریت) از دکمه‌ی سرتیتر در پنجره‌ی FriendsManageSheet باز می‌شه.
function DashFriendsCardInner({ delay, module }: { delay?: number; module?: "exercise" | "calorie" }) {
  const { status } = useSession();
  const [friends, setFriends] = useState<FriendListItem[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const cacheKey = module ?? "routine";
  const [managing, setManaging] = useState(false);

  useLayoutEffect(() => {
    const cached = readFriendsCache(cacheKey);
    if (cached) setFriends((prev) => prev ?? cached);
  }, [cacheKey]);
  useEffect(() => {
    if (friends && !authRequired) writeFriendsCache(cacheKey, friends);
  }, [friends, authRequired, cacheKey]);

  async function loadFriends(fresh = false) {
    // داشبورد روتین (بدون module) داده‌اش از قبل داخل HTML آمده (InlineBootstrap).
    if (!module && !fresh) {
      const boot = getPreloadedBootstrap();
      if (boot) {
        const payload: any = await boot.data;
        if (payload?.friends) { setFriends(payload.friends); return; }
      }
    }
    const res = await fetch(module ? `/api/friends?module=${module}` : "/api/friends", { cache: "no-store" });
    if (res.status === 401) { setAuthRequired(true); setFriends([]); return; }
    if (res.ok) setFriends((await res.json()).friends);
    else setFriends((prev) => prev ?? []);
  }
  async function loadRequests() {
    const boot = getPreloadedBootstrap();
    if (boot) {
      const payload: any = await boot.data;
      if (payload?.friendRequests) { setRequests(payload.friendRequests); return; }
    }
    const res = await fetch("/api/friends/requests", { cache: "no-store" });
    if (res.ok) setRequests((await res.json()).requests);
  }

  // برای مهمون اصلا درخواست نمی‌ره (هر دو روت 401 می‌دن).
  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") { writeFriendsCache(cacheKey, null); setFriends(null); setAuthRequired(true); return; }
    setAuthRequired(false);
    loadFriends();
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // تغییر دوستی در تب دیگه → کارت هم تازه می‌شه
  useLiveRefresh(["friends"], () => { if (status === "authenticated") { loadFriends(true); loadRequests(); } });

  const sorted = useMemo(() => sortFriends(friends ?? []), [friends]);

  return (
    <DashCard delay={delay} label="دوستان" dataCard="friends">
      <div className="fr-card-head">
        <h2 className="fr-card-title">
          <Users className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          دوستان
          {requests.length > 0 && <span className="fr-badge mono" aria-label={`${requests.length} درخواست دوستی`}>{requests.length}</span>}
        </h2>
        {!authRequired && (
          <button type="button" className="trade-icon-btn fr-manage-btn" onClick={() => setManaging(true)} aria-label="مدیریت دوستان">
            <UserPlus size={16} />
            {requests.length > 0 && <span className="fr-manage-dot" aria-hidden="true" />}
          </button>
        )}
      </div>

      {authRequired ? (
        <div className="fr-empty"><p>برای استفاده از بخش دوستان اول وارد حساب بشو.</p></div>
      ) : friends === null ? (
        <div className="fr-card-body"><div className="fr-sub is-loading">در حال بارگذاری…</div></div>
      ) : friends.length === 0 ? (
        <div className="fr-empty">
          <span className="fr-empty-stack" aria-hidden="true">
            <AgentAvatar seed="arion-a" size={34} />
            <AgentAvatar seed="arion-b" size={34} />
            <AgentAvatar seed="arion-c" size={34} />
          </span>
          <p>دوستاتو اضافه کن تا پیشرفت امروز و استریک همدیگه رو ببینید.</p>
          <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => setManaging(true)}>افزودن دوست</button>
        </div>
      ) : (
        <div className="fr-card-body no-scrollbar">
          <ul className="fr-list">
            {sorted.map((f) => (
              <FriendRow key={f.id} f={f} size={40} onOpen={() => setViewing(f.id)} />
            ))}
          </ul>
        </div>
      )}

      {managing && (
        <FriendsManageSheet friends={friends ?? []} onClose={() => setManaging(false)} onChanged={() => { loadFriends(true); loadRequests(); }} />
      )}

      {viewing && (
        <FriendProfileModal
          userId={viewing}
          onClose={() => setViewing(null)}
          onChanged={() => loadFriends(true)}
        />
      )}
    </DashCard>
  );
}
