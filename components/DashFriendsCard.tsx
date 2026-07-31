"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star } from "lucide-react";
import { DashCard } from "./DashCard";
import { DashProgressCircle } from "./DashProgressCircle";
import { avatarColorFor } from "@/lib/avatarColor";
import { LiquidBlobLayers } from "./LiquidBlobBox";

type Friend = { friendshipId: string; id: string; name: string; username: string | null; completed: number; total: number; pct: number; favorite: boolean };
type SearchStatus = "none" | "friends" | "pending_sent" | "pending_received";
type SearchUser = { id: string; name: string; username: string | null; status: SearchStatus };

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ backgroundColor: avatarColorFor(name), width: size, height: size, fontSize: size * 0.34 }}
    >
      {name.trim().charAt(0) || "؟"}
    </span>
  );
}

const STATUS_LABEL: Record<Exclude<SearchStatus, "none">, string> = {
  friends: "قبلاً دوستید",
  pending_sent: "درخواست دادن",
  pending_received: "منتظرِ پاسخِ توئه",
};

// کارتِ «دوستان» — واقعاً به /api/friends وصله. جستجوی زنده (بدون دکمه‌ی
// ارسالِ جدا) برای افزودنِ دوستِ جدید؛ درخواست‌های واردشده دیگه این‌جا
// قبول/رد نمی‌شن — از بخشِ اطلاعیه‌ها (زنگوله‌ی هدر) مدیریت می‌شن.
export function DashFriendsCard({ delay }: { delay?: number }) {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [authRequired, setAuthRequired] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadFriends() {
    const res = await fetch("/api/friends");
    if (res.status === 401) { setAuthRequired(true); setFriends([]); return; }
    if (res.ok) setFriends((await res.json()).friends);
  }
  async function loadRequestCount() {
    const res = await fetch("/api/friends/requests");
    if (res.status === 401) return;
    if (res.ok) setRequestCount((await res.json()).requests.length);
  }

  useEffect(() => { loadFriends(); loadRequestCount(); }, []);

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

  const list = friends ?? [];

  return (
    <DashCard delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-dash-text sm:text-[15px]">
          دوستان
          {requestCount > 0 && (
            <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-dash-green px-1 text-[10px] font-bold text-dash-bg">
              {requestCount}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="text-[12px] font-semibold text-dash-green hover:underline sm:text-[12.5px]"
        >
          مشاهده همه
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {authRequired ? (
          <div className="text-[12px] text-dash-muted">برای استفاده از بخش دوستان اول وارد حساب بشو.</div>
        ) : friends === null ? (
          <div className="text-[12px] text-dash-muted">در حال بارگذاری…</div>
        ) : list.length === 0 ? (
          <div className="text-[12px] text-dash-muted">
            هنوز دوستی اضافه نکردی — از «مشاهده همه» می‌تونی جستجو کنی.
          </div>
        ) : (
          list.map((f) => (
            <div key={f.friendshipId} className="flex items-center justify-between gap-3">
              <DashProgressCircle value={f.pct} size={40} strokeWidth={4} />
              <div className="flex flex-1 items-center justify-end gap-2.5">
                <div className="text-right">
                  <div className="text-[12.5px] font-semibold text-dash-text sm:text-[13.5px]">{f.name}</div>
                  <div className="mt-0.5 text-[10.5px] text-dash-muted sm:text-[11.5px]">
                    {f.completed} از {f.total} برنامه
                  </div>
                </div>
                <Avatar name={f.name} size={36} />
              </div>
            </div>
          ))
        )}
      </div>

      {panelOpen && createPortal(
        <>
          <div className="modal-overlay open" onClick={() => setPanelOpen(false)} />
          <div className="modal-panel liquid-glass-panel open">
            <LiquidBlobLayers />
            <div className="relative z-[1]">
              <div className="modal-head">
                <div className="modal-title">دوستان</div>
                <button className="nav-close" onClick={() => setPanelOpen(false)} aria-label="بستن">×</button>
              </div>
              <div className="modal-body">
                {authRequired && (
                  <div className="section-note">برای استفاده از بخش دوستان اول وارد حساب بشو.</div>
                )}

                {!authRequired && (
                  <div className="tm-extra" style={{ marginTop: 0 }}>
                    <div className="domain-sub">افزودن دوست</div>
                    <input
                      type="text"
                      dir="auto"
                      className="wsearch-newform-name trade-glass-field pill-glass-field"
                      placeholder="جستجو با یوزرنیم یا اسم…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
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
                                  <div className="text-right text-[13px] font-semibold text-dash-text">{u.name}</div>
                                  <Avatar name={u.name} size={32} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {!authRequired && query.trim().length < 2 && (
                  <div className="tm-extra">
                    <div className="domain-sub">لیست دوستان</div>
                    {list.length === 0 ? (
                      <div className="item-line empty">هنوز دوستی اضافه نکردی.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {list.map((f) => (
                          <div key={f.friendshipId} className="flex items-center justify-between gap-3 rounded-2xl border border-dash-border bg-white/[0.02] px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => toggleFavorite(f)}
                                aria-label={f.favorite ? "حذف از فیوریت‌ها" : "افزودن به فیوریت‌ها"}
                                style={{ color: f.favorite ? "#F5C518" : "var(--muted)" }}
                              >
                                <Star size={16} fill={f.favorite ? "currentColor" : "none"} />
                              </button>
                              <span className="mono text-[12px] text-dash-muted">{f.pct}٪</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="text-right text-[13px] font-semibold text-dash-text">{f.name}</div>
                              <Avatar name={f.name} size={32} />
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
    </DashCard>
  );
}
