"use client";
import "./friends.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star, UserMinus, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { FriendAvatar } from "./FriendAvatar";
import { FriendProfileModal } from "./FriendProfileModal";
import { GoldenName } from "./GoldenName";
import { TradeKebabMenu } from "./TradeKebabMenu";
import { Spinner } from "./Spinner";
import { sortFriends, type FriendRowData } from "./FriendRow";
import { useLiveRefresh } from "@/lib/liveSync";

type Person = { friendshipId: string; id: string; name: string; username: string | null; avatarUrl: string | null; golden?: boolean; staff?: boolean };
type SearchStatus = "none" | "friends" | "pending_sent" | "pending_received";
type SearchUser = Omit<Person, "friendshipId"> & { status: SearchStatus; friendshipId: string | null };
type Manageable = FriendRowData & { friendshipId: string };

// پنجره‌ی مدیریت دوستان (از سرتیتر کارت دوستان): جست‌وجو با یوزرنیم و افزودن،
// درخواست‌های دریافتی (قبول/رد) و ارسالی (لغو)، فیوریت و حذف با تایید.
// بخش دوستان صفحه‌ی جدا و رتبه‌بندی نداره.
export function FriendsManageSheet({ friends, onClose, onChanged }: { friends: Manageable[]; onClose: () => void; onChanged: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [incoming, setIncoming] = useState<Person[]>([]);
  const [sent, setSent] = useState<Person[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Manageable | null>(null);
  const [favOverride, setFavOverride] = useState<Record<string, boolean>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !viewing && !confirmRemove) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, viewing, confirmRemove]);

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/friends/requests", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setIncoming(d.requests ?? []);
      setSent(d.sent ?? []);
    }
  }, []);
  useEffect(() => { loadRequests(); }, [loadRequests]);
  useLiveRefresh(["friends"], () => { loadRequests(); });

  async function respond(p: Person, accept: boolean) {
    setBusy(p.friendshipId);
    try {
      await fetch(`/api/friends/${p.friendshipId}`, { method: accept ? "PATCH" : "DELETE" });
      setIncoming((prev) => prev.filter((r) => r.friendshipId !== p.friendshipId));
      setSent((prev) => prev.filter((r) => r.friendshipId !== p.friendshipId));
      onChanged();
    } finally { setBusy(null); }
  }

  async function toggleFavorite(f: Manageable) {
    const cur = favOverride[f.id] ?? !!f.favorite;
    setFavOverride((p) => ({ ...p, [f.id]: !cur }));
    const res = await fetch(`/api/friends/${f.friendshipId}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !cur }),
    });
    if (!res.ok) setFavOverride((p) => ({ ...p, [f.id]: cur }));
    else onChanged();
  }

  async function removeFriend(f: Manageable) {
    setBusy(f.friendshipId);
    try {
      const res = await fetch(`/api/friends/${f.friendshipId}`, { method: "DELETE" });
      if (res.ok) { setRemoved((p) => new Set(p).add(f.id)); onChanged(); }
    } finally {
      setBusy(null);
      setConfirmRemove(null);
    }
  }

  if (!mounted) return null;
  const list = sortFriends(friends.filter((f) => !removed.has(f.id)).map((f) => ({ ...f, favorite: favOverride[f.id] ?? !!f.favorite })));

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open modal-panel-notransform fr-sheet" role="dialog" aria-modal="true" aria-label="مدیریت دوستان" dir="rtl">
        <div className="modal-head">
          <div className="modal-title">دوستان</div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <AddFriend onViewing={setViewing} onChanged={() => { onChanged(); loadRequests(); }} />

        {incoming.length > 0 && (
          <div>
            <div className="fr-section-label">درخواست‌های دریافتی</div>
            <ul className="fr-list">
              {incoming.map((p) => (
                <PersonRow key={p.friendshipId} p={p} onOpen={() => setViewing(p.id)}>
                  <button type="button" className="account-outline-btn" disabled={busy === p.friendshipId} onClick={() => respond(p, false)}>رد</button>
                  <button type="button" className="trade-primary-btn" disabled={busy === p.friendshipId} onClick={() => respond(p, true)}>
                    {busy === p.friendshipId ? <Spinner size={12} /> : "قبول"}
                  </button>
                </PersonRow>
              ))}
            </ul>
          </div>
        )}

        {sent.length > 0 && (
          <div>
            <div className="fr-section-label">درخواست‌های ارسالی</div>
            <ul className="fr-list">
              {sent.map((p) => (
                <PersonRow key={p.friendshipId} p={p} onOpen={() => setViewing(p.id)}>
                  <span className="fr-person-status">در انتظار</span>
                  <button type="button" className="account-outline-btn" disabled={busy === p.friendshipId} onClick={() => respond(p, false)}>
                    {busy === p.friendshipId ? <Spinner size={12} /> : "لغو"}
                  </button>
                </PersonRow>
              ))}
            </ul>
          </div>
        )}

        {list.length > 0 && (
          <div>
            <div className="fr-section-label">دوستان شما</div>
            <ul className="fr-list">
              {list.map((f) => (
                <PersonRow key={f.id} p={f} onOpen={() => setViewing(f.id)} star={f.favorite}>
                  <TradeKebabMenu
                    label={`گزینه‌های ${f.name}`}
                    actions={[
                      { label: f.favorite ? "حذف از فیوریت‌ها" : "افزودن به فیوریت‌ها", icon: <Star size={14} />, onClick: () => toggleFavorite(f) },
                      { label: "حذف از دوستان", icon: <UserMinus size={14} />, danger: true, onClick: () => setConfirmRemove(f) },
                    ]}
                  />
                </PersonRow>
              ))}
            </ul>
          </div>
        )}
      </div>

      {viewing && (
        <FriendProfileModal
          userId={viewing}
          onClose={() => setViewing(null)}
          onChanged={() => { onChanged(); loadRequests(); }}
          onBlocked={() => { onChanged(); loadRequests(); }}
        />
      )}

      {confirmRemove && (
        <>
          <div className="modal-overlay open" onClick={() => !busy && setConfirmRemove(null)} style={{ zIndex: 95 }} />
          <div className="modal-panel open" role="dialog" aria-modal="true" style={{ zIndex: 96, maxWidth: 340 }}>
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
    </>,
    document.body,
  );
}

function PersonRow({ p, onOpen, star, children }: { p: Omit<Person, "friendshipId" | "username"> & { username?: string | null }; onOpen: () => void; star?: boolean; children: React.ReactNode }) {
  return (
    <li className="fr-person">
      <button type="button" className="fr-who" onClick={onOpen}>
        <FriendAvatar name={p.name} avatarUrl={p.avatarUrl} size={36} />
        <span className="fr-person-text">
          <span className="fr-name-line">
            <span className="fr-name"><GoldenName golden={p.golden} staff={p.staff}>{p.name}</GoldenName></span>
            {star && <Star size={11} className="fr-fav" fill="currentColor" aria-label="فیوریت" />}
          </span>
          {p.username && <span className="fr-person-handle mono">@{p.username}</span>}
        </span>
      </button>
      <span className="fr-person-actions">{children}</span>
    </li>
  );
}

function AddFriend({ onViewing, onChanged }: { onViewing: (id: string) => void; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
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
        if (d?.friendshipId) { setResults((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, status: "pending_sent", friendshipId: d.friendshipId } : x))); onChanged(); }
      } else if (u.friendshipId && (u.status === "pending_sent" || u.status === "pending_received")) {
        const accept = u.status === "pending_received";
        const res = await fetch(`/api/friends/${u.friendshipId}`, { method: accept ? "PATCH" : "DELETE" });
        if (res.ok) { setResults((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, status: accept ? "friends" : "none", friendshipId: accept ? x.friendshipId : null } : x))); onChanged(); }
      }
    } finally { setBusy(null); }
  }

  const q = query.trim();
  return (
    <div>
      <input
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
            {results.map((u) => (
              <PersonRow key={u.id} p={u} onOpen={() => onViewing(u.id)}>
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
          </ul>
        ) : null
      )}
    </div>
  );
}
