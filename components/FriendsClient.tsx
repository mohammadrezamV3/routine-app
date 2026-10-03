"use client";

// صفحه‌ی «دوستان» (/friends) — خونه‌ی کامل بخش دوستان:
//  - رتبه‌بندی: سکوی سه نفر اول + فهرست کامل، با خود کاربر («تو»)، به دو
//    معیار «امروز» و «این هفته» (lib/friendsRank.ts). روی بدنسازی/کالری همون
//    آماری که کارت همون بخش نشون می‌ده (/api/friends?module=…).
//  - درخواست‌ها: دریافتی (قبول/رد) و ارسالی (لغو).
//  - افزودن دوست: جست‌وجوی زنده با یوزرنیم (فقط کاربران discoverable، سمت سرور).
//  - مدیریت هر دوست با منوی سه‌نقطه: فیوریت و حذف.
// همه‌ی داده‌ها سمت سرور و محدود به خود کاربرن؛ این صفحه هیچ چیزی بیشتر از
// کارت دوستان نمی‌بینه. ردیف «تو» از lib/storage.ts (useMyFriendEntry) میاد.

import "@/app/dashboard/dashboard.css";
import "./friends.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { Crown, Star, UserMinus } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { BentoCard, CardHead, V_GRID, Skel } from "./DashboardKit";
import { SegmentedTabs } from "./SegmentedTabs";
import { FriendRankRow, type FriendRowData } from "./FriendRankRow";
import { FriendAvatar, FriendRingAvatar } from "./FriendAvatar";
import { FriendProfileModal } from "./FriendProfileModal";
import { GoldenName } from "./GoldenName";
import { TradeKebabMenu } from "./TradeKebabMenu";
import { Spinner } from "./Spinner";
import { AgentAvatar } from "./AgentAvatar";
import { useLiveRefresh } from "@/lib/liveSync";
import { rankFriends, type RankMode, type Ranked } from "@/lib/friendsRank";
import { useMyFriendEntry } from "@/lib/useMyFriendEntry";
import { writeFriendsCache, type FriendListItem } from "./DashFriendsCard";

type ModuleTab = "routine" | "exercise" | "calorie";
type Person = { friendshipId: string; id: string; name: string; username: string | null; avatarUrl: string | null; golden?: boolean; staff?: boolean };
type SearchStatus = "none" | "friends" | "pending_sent" | "pending_received";
type SearchUser = Omit<Person, "friendshipId"> & { status: SearchStatus; friendshipId: string | null };

const MODULE_TABS: { value: ModuleTab; label: string }[] = [
  { value: "routine", label: "روتین" },
  { value: "exercise", label: "بدنسازی" },
  { value: "calorie", label: "کالری" },
];
const UNIT: Record<ModuleTab, string> = { routine: "برنامه", exercise: "جلسه", calorie: "روز موفق" };

export function FriendsClient() {
  const { status } = useSession();
  if (status === "unauthenticated") {
    return <section className="db-page"><AuthGate message="برای دیدن دوستان وارد حساب شو" /></section>;
  }
  return (
    <section className="db-page dash-scope fr-page">
      <MotionConfig reducedMotion="user">
        <FriendsBody ready={status === "authenticated"} />
      </MotionConfig>
    </section>
  );
}

function FriendsBody({ ready }: { ready: boolean }) {
  const params = useSearchParams();
  const initialModule = (["exercise", "calorie"].includes(params.get("m") ?? "") ? params.get("m") : "routine") as ModuleTab;
  const [moduleTab, setModuleTab] = useState<ModuleTab>(initialModule);
  const [mode, setMode] = useState<RankMode>("today");
  const [friends, setFriends] = useState<FriendListItem[] | null>(null);
  const [incoming, setIncoming] = useState<Person[]>([]);
  const [sent, setSent] = useState<Person[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<FriendListItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isRoutine = moduleTab === "routine";
  const me = useMyFriendEntry(ready && isRoutine);

  const loadFriends = useCallback(async () => {
    const res = await fetch(isRoutine ? "/api/friends" : `/api/friends?module=${moduleTab}`, { cache: "no-store" });
    if (res.ok) {
      const list = (await res.json()).friends as FriendListItem[];
      setFriends(list);
      writeFriendsCache(moduleTab, list);
    } else setFriends((prev) => prev ?? []);
  }, [isRoutine, moduleTab]);
  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/friends/requests", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setIncoming(d.requests ?? []);
      setSent(d.sent ?? []);
    }
  }, []);

  useEffect(() => { if (ready) { setFriends(null); loadFriends(); } }, [ready, loadFriends]);
  useEffect(() => { if (ready) loadRequests(); }, [ready, loadRequests]);
  useLiveRefresh(["friends"], () => { if (ready) { loadFriends(); loadRequests(); } });

  // ?add=1 (از حالت خالی کارت) → مستقیم روی فیلد جست‌وجو؛ #requests → درخواست‌ها
  useEffect(() => {
    if (params.get("add") === "1") setTimeout(() => searchRef.current?.focus(), 350);
  }, [params]);

  useEffect(() => { if (!isRoutine) setMode("today"); }, [isRoutine]);

  const ranked = useMemo(() => {
    const list: FriendRowData[] = [...(friends ?? [])];
    if (me && isRoutine) list.push(me);
    return rankFriends(list, mode);
  }, [friends, me, mode, isRoutine]);

  async function respond(p: Person, accept: boolean) {
    setBusy(p.friendshipId);
    try {
      await fetch(`/api/friends/${p.friendshipId}`, { method: accept ? "PATCH" : "DELETE" });
      setIncoming((prev) => prev.filter((r) => r.friendshipId !== p.friendshipId));
      setSent((prev) => prev.filter((r) => r.friendshipId !== p.friendshipId));
      if (accept) loadFriends();
    } finally { setBusy(null); }
  }

  async function toggleFavorite(f: FriendListItem) {
    const next = !f.favorite;
    setFriends((prev) => prev && prev.map((x) => (x.friendshipId === f.friendshipId ? { ...x, favorite: next } : x)));
    const res = await fetch(`/api/friends/${f.friendshipId}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    if (!res.ok) setFriends((prev) => prev && prev.map((x) => (x.friendshipId === f.friendshipId ? { ...x, favorite: !next } : x)));
  }

  async function removeFriend(f: FriendListItem) {
    setBusy(f.friendshipId);
    try {
      const res = await fetch(`/api/friends/${f.friendshipId}`, { method: "DELETE" });
      if (res.ok) setFriends((prev) => prev && prev.filter((x) => x.friendshipId !== f.friendshipId));
    } finally {
      setBusy(null);
      setConfirmRemove(null);
    }
  }

  const byId = useMemo(() => new Map((friends ?? []).map((f) => [f.id, f])), [friends]);
  const myRank = ranked.find((r) => r.isMe);
  const podium = ranked.length >= 2 ? ranked.slice(0, 3) : [];
  const hasRequests = incoming.length + sent.length > 0;

  return (
    <>
      <div className="fr-top">
        <h1>دوستان</h1>
        <SegmentedTabs options={MODULE_TABS} active={moduleTab} onChange={setModuleTab} ariaLabel="بخش" className="fr-module-tabs" />
      </div>

      <div className="fr-grid">
        <motion.div variants={V_GRID} initial="hidden" animate="show" className="fr-main">
          <BentoCard label="رتبه‌بندی دوستان">
            <CardHead
              icon="trophy"
              title="رتبه‌بندی"
              extra={isRoutine ? (
                <SegmentedTabs
                  options={[{ value: "today" as RankMode, label: "امروز" }, { value: "week" as RankMode, label: "این هفته" }]}
                  active={mode}
                  onChange={setMode}
                  ariaLabel="معیار رتبه‌بندی"
                  className="fr-mode-tabs"
                />
              ) : null}
            />

            {friends === null ? (
              <div className="fr-list" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="fr-row"><Skel w={18} h={12} /><Skel w={44} h={44} r={22} /><Skel w="45%" h={12} /></div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="fr-empty">
                <span className="fr-empty-stack" aria-hidden="true">
                  <AgentAvatar seed="arion-a" size={40} />
                  <AgentAvatar seed="arion-b" size={40} />
                  <AgentAvatar seed="arion-c" size={40} />
                </span>
                <p>هنوز دوستی اضافه نکردی. با یوزرنیم پیداشون کن و رقابت روزانه رو شروع کنید.</p>
                <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => searchRef.current?.focus()}>افزودن دوست</button>
              </div>
            ) : (
              <LayoutGroup>
                {podium.length > 0 && <Podium entries={podium} onOpen={(id) => setViewing(id)} />}
                <div className="fr-board-meta">
                  <span className="fr-board-hint">
                    {myRank
                      ? <>رتبه‌ی تو {mode === "week" ? "این هفته" : "امروز"} <b className="mono">{myRank.rank}</b> از <b className="mono">{ranked.length}</b></>
                      : <><b className="mono">{ranked.length}</b> دوست</>}
                  </span>
                  <span className="fr-board-hint">{mode === "week" ? "میانگین 7 روز اخیر" : isRoutine ? "پیشرفت امروز" : moduleTab === "exercise" ? "جلسه‌های این هفته" : "روزهای موفق 7 روز اخیر"}</span>
                </div>
                <ul className="fr-list">
                  <AnimatePresence initial={false}>
                    {ranked.map((f, i) => {
                      const item = byId.get(f.id);
                      return (
                        <FriendRankRow
                          key={f.id}
                          f={f}
                          rank={f.rank}
                          score={f.score}
                          mode={mode}
                          unitLabel={UNIT[moduleTab]}
                          index={i}
                          onOpen={f.isMe ? undefined : () => setViewing(f.id)}
                          actions={item ? (
                            <TradeKebabMenu
                              label={`گزینه‌های ${item.name}`}
                              actions={[
                                { label: item.favorite ? "حذف از فیوریت‌ها" : "افزودن به فیوریت‌ها", icon: <Star size={14} />, onClick: () => toggleFavorite(item) },
                                { label: "حذف از دوستان", icon: <UserMinus size={14} />, danger: true, onClick: () => setConfirmRemove(item) },
                              ]}
                            />
                          ) : <span className="fr-actions-spacer" aria-hidden="true" />}
                        />
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </LayoutGroup>
            )}
          </BentoCard>
        </motion.div>

        <motion.div variants={V_GRID} initial="hidden" animate="show" className="fr-side">
          <AddFriendCard inputRef={searchRef} />

          {hasRequests && (
            <BentoCard label="درخواست‌های دوستی">
              <span id="requests" style={{ position: "absolute", top: -90 }} aria-hidden="true" />
              <CardHead icon="friends" title="درخواست‌ها" extra={incoming.length ? <span className="fr-badge mono">{incoming.length}</span> : null} />
              {incoming.length > 0 && (
                <div>
                  <div className="fr-section-label">دریافتی</div>
                  <ul className="fr-list">
                    <AnimatePresence initial={false}>
                      {incoming.map((p) => (
                        <PersonRow key={p.friendshipId} p={p} onOpen={() => setViewing(p.id)}>
                          <button type="button" className="account-outline-btn" disabled={busy === p.friendshipId} onClick={() => respond(p, false)}>رد</button>
                          <button type="button" className="trade-primary-btn" disabled={busy === p.friendshipId} onClick={() => respond(p, true)}>
                            {busy === p.friendshipId ? <Spinner size={12} /> : "قبول"}
                          </button>
                        </PersonRow>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
              {sent.length > 0 && (
                <div>
                  <div className="fr-section-label">ارسالی</div>
                  <ul className="fr-list">
                    <AnimatePresence initial={false}>
                      {sent.map((p) => (
                        <PersonRow key={p.friendshipId} p={p} onOpen={() => setViewing(p.id)}>
                          <span className="fr-person-status">در انتظار</span>
                          <button type="button" className="account-outline-btn" disabled={busy === p.friendshipId} onClick={() => respond(p, false)}>
                            {busy === p.friendshipId ? <Spinner size={12} /> : "لغو"}
                          </button>
                        </PersonRow>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
            </BentoCard>
          )}
        </motion.div>
      </div>

      {viewing && (
        <FriendProfileModal
          userId={viewing}
          onClose={() => setViewing(null)}
          onChanged={() => { loadFriends(); loadRequests(); }}
          onBlocked={() => { loadFriends(); loadRequests(); }}
        />
      )}

      {confirmRemove && (
        <>
          <div className="modal-overlay open" onClick={() => !busy && setConfirmRemove(null)} style={{ zIndex: 90 }} />
          <div className="modal-panel open" role="dialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 340 }}>
            <div className="modal-body" style={{ paddingTop: 4, textAlign: "center" }}>
              <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                «{confirmRemove.name}» از دوستات حذف بشه؟
              </div>
              <div className="trade-modal-actions">
                <button type="button" className="account-outline-btn" onClick={() => setConfirmRemove(null)} disabled={!!busy}>انصراف</button>
                <button type="button" className="trade-danger-btn" onClick={() => removeFriend(confirmRemove)} disabled={!!busy}>
                  {busy ? <Spinner size={13} /> : "حذف کن"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── سکوی سه نفر اول ────────────────────────────────────────
function Podium({ entries, onOpen }: { entries: Ranked<FriendRowData>[]; onOpen: (id: string) => void }) {
  const PLACE = ["اول", "دوم", "سوم"];
  // برچسب از رتبه‌ی واقعی (برابری = همون رتبه)، جای سکو از ترتیب
  return (
    <div className="fr-podium">
      {entries.map((f, i) => {
        const place = i + 1;
        const size = place === 1 ? 76 : 60;
        const Cmp = f.isMe ? "div" : "button";
        return (
          <motion.div
            key={f.id}
            layout="position"
            className={`fr-podium-col is-${place} rank-${Math.min(f.rank, 3)}${f.isMe ? " is-me" : ""}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 * (place === 1 ? 0 : place) }}
          >
            <Cmp
              {...(f.isMe ? {} : { type: "button" as const, onClick: () => onOpen(f.id) })}
              className="fr-podium-slot"
            >
              <span className="fr-podium-crown" aria-hidden="true">{place === 1 && <Crown size={18} fill="currentColor" />}</span>
              <FriendRingAvatar name={f.name} avatarUrl={f.avatarUrl} pct={f.score} size={size} stroke={place === 1 ? 4.5 : 3.5} delay={0.2} />
              <span className="fr-podium-name"><GoldenName golden={f.golden} staff={f.staff}>{f.isMe ? "تو" : f.name}</GoldenName></span>
              <span className="fr-podium-score mono">{f.score}<small>%</small></span>
              <span className="fr-podium-place">{PLACE[f.rank - 1]}</span>
            </Cmp>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── یک نفر (درخواست/نتیجه‌ی جست‌وجو) ──────────────────────
function PersonRow({ p, onOpen, children }: { p: Omit<Person, "friendshipId">; onOpen: () => void; children: React.ReactNode }) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fr-person"
    >
      <button type="button" className="fr-who" onClick={onOpen}>
        <FriendAvatar name={p.name} avatarUrl={p.avatarUrl} size={36} />
        <span className="fr-person-text">
          <span className="fr-name"><GoldenName golden={p.golden} staff={p.staff}>{p.name}</GoldenName></span>
          {p.username && <span className="fr-person-handle mono">@{p.username}</span>}
        </span>
      </button>
      <span className="fr-person-actions">{children}</span>
    </motion.li>
  );
}

// ── افزودن دوست ────────────────────────────────────────────
function AddFriendCard({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (q: string) => {
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.ok) setResults((await res.json()).users);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResults(null); setSearching(false); return; }
    setSearching(true);
    timer.current = setTimeout(() => run(q), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, run]);

  async function act(u: SearchUser) {
    setBusy(u.id);
    try {
      if (u.status === "none") {
        const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id }) });
        const d = res.ok ? await res.json() : null;
        if (d?.friendshipId) setResults((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, status: "pending_sent", friendshipId: d.friendshipId } : x)));
      } else if (u.friendshipId && (u.status === "pending_sent" || u.status === "pending_received")) {
        const accept = u.status === "pending_received";
        const res = await fetch(`/api/friends/${u.friendshipId}`, { method: accept ? "PATCH" : "DELETE" });
        if (res.ok) setResults((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, status: accept ? "friends" : "none", friendshipId: accept ? x.friendshipId : null } : x)));
      }
    } finally { setBusy(null); }
  }

  const q = query.trim();
  return (
    <BentoCard label="افزودن دوست">
      <CardHead icon="userPlus" title="افزودن دوست" />
      <input
        ref={inputRef}
        type="search"
        dir="rtl"
        className="wsearch-newform-name trade-glass-field fr-search-field"
        placeholder="جست‌وجو با یوزرنیم…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="جست‌وجوی کاربر با یوزرنیم"
        autoComplete="off"
        spellCheck={false}
      />
      {q.length >= 2 && (
        searching && !results ? (
          <div className="fr-search-state"><Spinner size={13} /> در حال جست‌وجو…</div>
        ) : results && results.length === 0 ? (
          <div className="fr-search-state">کسی با این یوزرنیم پیدا نشد.</div>
        ) : results ? (
          <ul className="fr-list">
            <AnimatePresence initial={false}>
              {results.map((u) => (
                <PersonRow key={u.id} p={u} onOpen={() => setViewing(u.id)}>
                  {u.status === "none" && (
                    <button type="button" className="trade-primary-btn" disabled={busy === u.id} onClick={() => act(u)}>
                      {busy === u.id ? <Spinner size={12} /> : "افزودن"}
                    </button>
                  )}
                  {u.status === "pending_sent" && (
                    <button type="button" className="account-outline-btn" disabled={busy === u.id} onClick={() => act(u)}>
                      {busy === u.id ? <Spinner size={12} /> : "لغو درخواست"}
                    </button>
                  )}
                  {u.status === "pending_received" && (
                    <button type="button" className="trade-primary-btn" disabled={busy === u.id} onClick={() => act(u)}>
                      {busy === u.id ? <Spinner size={12} /> : "قبول"}
                    </button>
                  )}
                  {u.status === "friends" && <span className="fr-person-status">دوستید</span>}
                </PersonRow>
              ))}
            </AnimatePresence>
          </ul>
        ) : null
      )}
      {viewing && <FriendProfileModal userId={viewing} onClose={() => setViewing(null)} onChanged={() => run(q)} />}
    </BentoCard>
  );
}
