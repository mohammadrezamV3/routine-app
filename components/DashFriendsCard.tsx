"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Plus, Star, Trash2, X } from "lucide-react";
import { DashCard } from "./DashCard";
import { DashProgressCircle } from "./DashProgressCircle";
import { StreakFlame } from "./StreakFlame";
import { AgentAvatar } from "./AgentAvatar";
import { LockBodyScroll } from "./LockBodyScroll";
import { useSession } from "next-auth/react";

type Friend = { friendshipId: string; id: string; name: string; username: string | null; avatarUrl: string | null; completed: number; total: number; pct: number; streak: number; favorite: boolean };
type SearchStatus = "none" | "friends" | "pending_sent" | "pending_received";
type SearchUser = { id: string; name: string; username: string | null; avatarUrl: string | null; status: SearchStatus };
type FriendRequest = { friendshipId: string; id: string; name: string; username: string | null; avatarUrl: string | null };

// اگه دوست عکسِ پروفایلِ واقعی انتخاب نکرده باشه، دقیقاً همون آواتارِ
// پیکسلیِ پیش‌فرضِ خودِ کاربر (AgentAvatar) نشون داده می‌شه — نه یه چیزِ
// دیگه مثلِ حرفِ اول با رنگِ تصادفی — تا با بقیه‌ی اپ یکدست بمونه.
function Avatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <AgentAvatar seed={name || "؟"} size={size} className="shrink-0" />;
}

const STATUS_LABEL: Record<Exclude<SearchStatus, "none">, string> = {
  friends: "قبلاً دوستید",
  pending_sent: "درخواست دادن",
  pending_received: "منتظرِ پاسخِ توئه",
};

// کارتِ «دوستان» — واقعاً به /api/friends وصله. جستجوی زنده (بدون دکمه‌ی
// ارسالِ جدا) برای افزودنِ دوستِ جدید؛ درخواست‌های واردشده هم دیگه توی
// اطلاعیه‌ها/یادآوری‌ها نیستن، همین‌جا (پاپ‌آپِ دوستان) قابلِ قبول/ردن.
export function DashFriendsCard({ delay, module, unitLabel = "برنامه" }: { delay?: number; module?: "exercise" | "calorie"; unitLabel?: string }) {
  const { status } = useSession();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmDeleteFriend, setConfirmDeleteFriend] = useState<Friend | null>(null);
  const [deletingFriend, setDeletingFriend] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  async function loadFriends() {
    const res = await fetch(module ? `/api/friends?module=${module}` : "/api/friends");
    if (res.status === 401) { setAuthRequired(true); setFriends([]); return; }
    if (res.ok) setFriends((await res.json()).friends);
    else setFriends([]);
  }
  async function loadRequests() {
    const res = await fetch("/api/friends/requests");
    if (res.status === 401) return;
    if (res.ok) setRequests((await res.json()).requests);
  }

  async function respondRequest(friendshipId: string, accept: boolean) {
    setRespondingTo(friendshipId);
    await fetch(`/api/friends/${friendshipId}`, { method: accept ? "PATCH" : "DELETE" });
    setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    setRespondingTo(null);
    if (accept) loadFriends();
  }

  // برای مهمون اصلاً درخواست نمی‌ره: هردو روت ۴۰۱ می‌دادن و کارت هم
  // همون حالتِ authRequired رو نشون می‌ده — پس دو درخواستِ الکی در هر
  // لودِ صفحه بود. status از useSession میاد که خودش از contextِ
  // SessionProvider می‌خونه (نه یه فچِ جدا).
  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") { setAuthRequired(true); return; }
    loadFriends();
    loadRequests();
  }, [status]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setSearchResults((await res.json()).users);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function sendRequest(u: SearchUser) {
    setSearchResults((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, status: "pending_sent" } : x)));
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    if (!res.ok) {
      // اگه واقعاً شکست خورد، وضعیتِ نمایشی رو برگردون
      setSearchResults((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, status: "none" } : x)));
    }
  }

  async function toggleFavorite(f: Friend) {
    const next = !f.favorite;
    setFriends((prev) => prev && prev.map((x) => (x.friendshipId === f.friendshipId ? { ...x, favorite: next } : x)));
    await fetch(`/api/friends/${f.friendshipId}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: next }),
    });
    loadFriends();
  }

  function closePanel() {
    setPanelOpen(false);
    setAddMode(false);
    setQuery("");
  }

  async function deleteFriend(f: Friend) {
    setDeletingFriend(true);
    await fetch(`/api/friends/${f.friendshipId}`, { method: "DELETE" });
    setFriends((prev) => prev && prev.filter((x) => x.friendshipId !== f.friendshipId));
    setDeletingFriend(false);
    setConfirmDeleteFriend(null);
  }

  const list = friends ?? [];

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center text-[13px] font-bold text-dash-text sm:text-[15px]">
          دوستان
          {requests.length > 0 && (
            <span className="mr-1.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-dash-green px-1 text-[9px] font-bold text-dash-bg sm:h-4 sm:min-w-4 sm:text-[10px]">
              {requests.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="text-[11px] font-semibold text-dash-green no-underline hover:no-underline sm:text-[12.5px]"
        >
          مشاهده همه
        </button>
      </div>

      <div className="no-scrollbar mt-4 flex max-h-[210px] flex-col gap-4 overflow-y-auto sm:max-h-[250px]">
        {authRequired ? (
          <div className="text-[11px] text-dash-muted sm:text-[12px]">برای استفاده از بخش دوستان اول وارد حساب بشو.</div>
        ) : friends === null ? (
          <div className="text-[11px] text-dash-muted sm:text-[12px]">در حال بارگذاری…</div>
        ) : list.length === 0 ? (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 py-2 text-[11.5px] font-semibold text-dash-muted transition hover:text-dash-green sm:text-[12.5px]"
          >
            <Plus size={15} />
            افزودن دوست
          </button>
        ) : (
          list.map((f) => (
            <div key={f.friendshipId} className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center justify-start gap-2.5">
                <span className="sm:hidden"><Avatar name={f.name} avatarUrl={f.avatarUrl} size={32} /></span>
                <span className="hidden sm:inline-flex"><Avatar name={f.name} avatarUrl={f.avatarUrl} size={36} /></span>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="text-[11.5px] font-semibold text-dash-text sm:text-[13.5px]">{f.name}</div>
                    <StreakFlame streak={f.streak} className="text-[10px] sm:text-[11px]" />
                  </div>
                  <div className="mt-0.5 text-[9.5px] text-dash-muted sm:text-[11.5px]">
                    {f.completed} از {f.total} {unitLabel}
                  </div>
                </div>
              </div>
              <span className="sm:hidden"><DashProgressCircle value={f.pct} size={34} strokeWidth={3.5} /></span>
              <span className="hidden sm:inline-block"><DashProgressCircle value={f.pct} size={40} strokeWidth={4} /></span>
            </div>
          ))
        )}
      </div>

      {panelOpen && createPortal(
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={closePanel} />
          <div className="modal-panel liquid-glass-panel dash-scope open">
            <div className="relative z-[1]">
              <div className="modal-head">
                {addMode ? (
                  <button type="button" className="exercise-catalog-back-btn" onClick={() => { setAddMode(false); setQuery(""); }} aria-label="بازگشت">
                    <ChevronRight size={20} />
                  </button>
                ) : (
                  <div className="modal-title">دوستان</div>
                )}
                <button className="nav-close" onClick={closePanel} aria-label="بستن">×</button>
              </div>
              <div className="modal-body">
                {authRequired && (
                  <div className="section-note">برای استفاده از بخش دوستان اول وارد حساب بشو.</div>
                )}

                {!authRequired && addMode && (
                  <div className="tm-extra" style={{ marginTop: 0 }}>
                    <div className="domain-sub" style={{ color: "var(--accent)" }}>افزودن دوست</div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      dir="rtl"
                      className="wsearch-newform-name trade-glass-field pill-glass-field"
                      placeholder="جستجو با یوزرنیم…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      style={{ textAlign: "right" }}
                    />

                    {query.trim().length >= 2 && (
                      <div className="flex flex-col gap-2" style={{ marginTop: 10 }}>
                        {searching ? (
                          <div className="item-line">در حال جستجو…</div>
                        ) : !searchResults || searchResults.length === 0 ? (
                          <div className="item-line empty">کسی پیدا نشد.</div>
                        ) : (
                          searchResults.map((u) => {
                            const clickable = u.status === "none";
                            return (
                              <div
                                key={u.id}
                                onClick={clickable ? () => sendRequest(u) : undefined}
                                className="flex items-center justify-between gap-2 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5"
                                style={{ cursor: clickable ? "pointer" : "default" }}
                              >
                                <span className="text-[11.5px] font-semibold" style={{ color: clickable ? "var(--accent)" : "var(--muted)" }}>
                                  {u.status === "none" ? "افزودن" : STATUS_LABEL[u.status]}
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
                                  <div className="text-right text-[13px] font-semibold text-dash-text">{u.name}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!authRequired && !addMode && requests.length > 0 && (
                  <div className="tm-extra" style={{ marginBottom: 14 }}>
                    <div className="domain-sub" style={{ color: "var(--accent)" }}>درخواست‌های دوستی</div>
                    <div className="flex flex-col gap-2" style={{ marginTop: 8 }}>
                      {requests.map((r) => (
                        <div key={r.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={r.name} avatarUrl={r.avatarUrl} size={32} />
                            <div className="text-right text-[13px] font-semibold text-dash-text">{r.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => respondRequest(r.friendshipId, false)}
                              disabled={respondingTo === r.friendshipId}
                              aria-label="رد کردن"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-[#E05252] transition hover:brightness-110 disabled:opacity-40"
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => respondRequest(r.friendshipId, true)}
                              disabled={respondingTo === r.friendshipId}
                              aria-label="قبول کردن"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-dash-green transition hover:brightness-110 disabled:opacity-40"
                            >
                              <Check size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!authRequired && !addMode && (
                  <div className="tm-extra">
                    <button
                      type="button"
                      onClick={() => { setAddMode(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-dash-green transition hover:brightness-110"
                      style={{ marginBottom: list.length ? 12 : 0 }}
                    >
                      <Plus size={15} />
                      افزودن دوست
                    </button>
                    {list.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {list.map((f) => (
                          <div key={f.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={f.name} avatarUrl={f.avatarUrl} size={32} />
                              <div className="text-right text-[13px] font-semibold text-dash-text">{f.name}</div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFriend(f)}
                                aria-label="حذف دوست"
                                className="bg-transparent text-dash-muted transition hover:text-[#E05252]"
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleFavorite(f)}
                                aria-label={f.favorite ? "حذف از فیوریت‌ها" : "افزودن به فیوریت‌ها"}
                                style={{ color: f.favorite ? "#F5C518" : "var(--muted)" }}
                              >
                                <Star size={16} fill={f.favorite ? "currentColor" : "none"} />
                              </button>
                              <span className="mono text-[12px] text-dash-muted">{f.pct}٪</span>
                              <StreakFlame streak={f.streak} className="text-[11px]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {confirmDeleteFriend && createPortal(
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={() => !deletingFriend && setConfirmDeleteFriend(null)} style={{ zIndex: 80 }} />
          <div className="modal-panel liquid-glass-panel dash-scope open" style={{ zIndex: 81, maxWidth: 340 }}>
            <div className="modal-body" style={{ paddingTop: 22, textAlign: "center" }}>
              <div className="text-[13px] font-bold text-dash-text sm:text-[14.5px]">
                واقعاً می‌خوای «{confirmDeleteFriend.name}» رو از دوستات حذف کنی؟
              </div>
              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteFriend(null)}
                  disabled={deletingFriend}
                  className="flex-1 rounded-2xl border py-2.5 text-[12px] font-semibold text-dash-muted disabled:opacity-40"
                  style={{ borderColor: "var(--line)" }}
                >
                  نه
                </button>
                <button
                  type="button"
                  onClick={() => deleteFriend(confirmDeleteFriend)}
                  disabled={deletingFriend}
                  className="flex-1 rounded-2xl py-2.5 text-[12px] font-bold disabled:opacity-40"
                  style={{ background: "#E05252", color: "#fff" }}
                >
                  {deletingFriend ? "در حال حذف…" : "بله، حذف کن"}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </DashCard>
  );
}
