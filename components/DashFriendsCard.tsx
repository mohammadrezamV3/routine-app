"use client";

import "./friends.css";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import { ChevronLeft, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { DashCard } from "./DashCard";
import { AgentAvatar } from "./AgentAvatar";
import { FriendProfileModal } from "./FriendProfileModal";
import { FriendRankRow, type FriendRowData } from "./FriendRankRow";
import { getPreloadedBootstrap } from "@/lib/preload";
import { useLiveRefresh } from "@/lib/liveSync";
import { rankFriends } from "@/lib/friendsRank";
import { useMyFriendEntry } from "@/lib/useMyFriendEntry";

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

// کارت «دوستان» — رتبه‌بندی زنده‌ی امروز: هر دوست داخل حلقه‌ی پیشرفت امروزش،
// با شعله‌ی استریک و نام طلایی/بنفش. روی روتین، خود کاربر هم («تو») در
// رتبه‌بندی هست و با هر تیک جابه‌جا می‌شه. مدیریت (افزودن/درخواست‌ها/حذف/
// فیوریت) در صفحه‌ی کامل /friends است؛ کارت فقط نمایش و ناوبری.
export function DashFriendsCard({ delay, module, unitLabel = "برنامه" }: { delay?: number; module?: "exercise" | "calorie"; unitLabel?: string }) {
  const { status } = useSession();
  const [friends, setFriends] = useState<FriendListItem[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const cacheKey = module ?? "routine";
  const me = useMyFriendEntry(!module && status === "authenticated");

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

  // تغییر دوستی در صفحه‌ی /friends (یا تب دیگه) → کارت هم تازه می‌شه
  useLiveRefresh(["friends"], () => { if (status === "authenticated") { loadFriends(true); loadRequests(); } });

  const ranked = useMemo(() => {
    const list: FriendRowData[] = [...(friends ?? [])];
    if (me && list.length) list.push(me);
    return rankFriends(list, "today");
  }, [friends, me]);

  const pageHref = module ? `/friends?m=${module}` : "/friends";
  const myRank = ranked.find((r) => r.isMe);

  return (
    <DashCard delay={delay} label="دوستان" dataCard="friends">
      <div className="fr-card-head">
        <h2 className="fr-card-title">
          <Users className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          دوستان
          {requests.length > 0 && <span className="fr-badge mono" aria-label={`${requests.length} درخواست دوستی`}>{requests.length}</span>}
        </h2>
        {!authRequired && (
          <Link href={pageHref} prefetch className="fr-more">
            همه
            <ChevronLeft size={14} />
          </Link>
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
          <p>با دوستات رقابت کن؛ پیشرفت امروز و استریک همدیگه رو ببینید.</p>
          <Link href="/friends?add=1" prefetch className="account-outline-btn mentor-btn is-sm">افزودن دوست</Link>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="fr-card-body no-scrollbar">
            <LayoutGroup>
              <ul className="fr-list">
                <AnimatePresence initial={false}>
                  {ranked.map((f, i) => (
                    <FriendRankRow
                      key={f.id}
                      f={f}
                      rank={f.rank}
                      score={f.score}
                      mode="today"
                      unitLabel={unitLabel}
                      index={i}
                      size={40}
                      onOpen={f.isMe ? undefined : () => setViewing(f.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </LayoutGroup>
          </div>
          {(requests.length > 0 || myRank) && (
            <div className="fr-card-note">
              {myRank ? <span>رتبه‌ی تو امروز <b className="mono">{myRank.rank}</b> از <b className="mono">{ranked.length}</b></span> : <span />}
              {requests.length > 0 && <Link href="/friends#requests" prefetch>{requests.length} درخواست تازه</Link>}
            </div>
          )}
        </MotionConfig>
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
