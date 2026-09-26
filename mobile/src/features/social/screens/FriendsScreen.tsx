import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, MessagesSquare, Search, Star, UserPlus, Users } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import ProgressRing from "@/components/ProgressRing";
import SegmentedTabs from "@/components/SegmentedTabs";
import StreakFlame from "@/components/StreakFlame";
import { faNum } from "@/lib/jalali";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import type {
  SocialFriend,
  SocialFriendsResponse,
  SocialRequestsResponse,
  SocialSearchUser,
  SocialStatsModule,
} from "@/lib/social-contract";
import { useSocialApi } from "../api";
import { cacheKeys } from "../db";
import { describeSocialError, NEED_INTERNET } from "../errors";
import { useCachedResource, type CachedResource } from "../hooks";
import { socialRoutePaths } from "../paths";
import { ActionButton, Avatar, EmptyState, ErrorNotice, Loading, StaleNotice } from "../components/SocialUi";

type Tab = "friends" | "requests" | "add";

const MODULE_OPTIONS: { value: SocialStatsModule; label: string }[] = [
  { value: "routine", label: "روتین" },
  { value: "exercise", label: "بدنسازی" },
  { value: "calorie", label: "کالری" },
];

/** صفحه‌ی اصلیِ دوستان: فهرست + پیشرفت/استریک، درخواست‌ها، افزودن دوست. */
export default function FriendsScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const api = useSocialApi();
  const requests = useCachedResource<SocialRequestsResponse>(cacheKeys.requests, () => api.requests());
  const pending = requests.data?.requests.length ?? 0;

  return (
    <div>
      <AppHeader title="دوستان" showBack />
      <main className="px-4 pt-4 pb-6">
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <ShortcutCard icon={<MessagesSquare size={18} color="var(--accent)" />} label="گفت‌وگوی نمادها" onClick={() => navigate(socialRoutePaths.chatRooms)} />
          <ShortcutCard icon={<BarChart3 size={18} color="var(--accent)" />} label="گزارش هفتگی" onClick={() => navigate(socialRoutePaths.weekly)} />
        </div>

        <div className="mb-4">
          <SegmentedTabs<Tab>
            active={tab}
            onChange={setTab}
            options={[
              { value: "friends", label: "دوستان" },
              { value: "requests", label: pending ? `درخواست‌ها (${faNum(pending)})` : "درخواست‌ها" },
              { value: "add", label: "افزودن" },
            ]}
          />
        </div>

        {tab === "friends" && <FriendsList />}
        {tab === "requests" && <RequestsList resource={requests} />}
        {tab === "add" && <AddFriend />}
      </main>
    </div>
  );
}

function ShortcutCard({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-card border p-3 text-start" style={{ borderColor: "var(--surface-line)" }}>
      {icon}
      <span className="font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
        {label}
      </span>
    </button>
  );
}

function FriendsList() {
  const api = useSocialApi();
  const navigate = useNavigate();
  const [module, setModule] = useState<SocialStatsModule>("routine");
  const res = useCachedResource<SocialFriendsResponse>(cacheKeys.friends(module), () => api.friends(module));
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleFavorite(f: SocialFriend) {
    if (busy) return;
    setBusy(f.friendshipId);
    setActionError(null);
    try {
      await api.favorite(f.friendshipId, !f.favorite);
      res.mutate((prev) =>
        prev
          ? {
              ...prev,
              friends: prev.friends
                .map((x) => (x.friendshipId === f.friendshipId ? { ...x, favorite: !f.favorite } : x))
                .sort((a, b) => Number(b.favorite) - Number(a.favorite)),
            }
          : prev
      );
    } catch (err) {
      setActionError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  const friends = res.data?.friends ?? [];
  return (
    <div>
      <div className="mb-3">
        <SegmentedTabs<SocialStatsModule> active={module} onChange={setModule} options={MODULE_OPTIONS} />
      </div>
      <StaleNotice online={res.online} staleSince={res.staleSince} />
      <ErrorNotice message={res.error || actionError} />
      {res.loading && !res.data ? (
        <Loading />
      ) : !friends.length ? (
        <EmptyState icon={<Users size={40} color="var(--muted)" />} text="هنوز دوستی نداری — از «افزودن» شروع کن" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {friends.map((f) => (
            <li key={f.friendshipId} className="flex items-center gap-3 rounded-card border p-3" style={{ borderColor: "var(--surface-line)" }}>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-start"
                onClick={() => navigate(socialRoutePaths.profile(f.id), { state: { friendshipId: f.friendshipId } })}
              >
                <Avatar name={f.name} url={f.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    {f.name}
                  </div>
                  <div className="flex items-center gap-2 font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                    {f.username && <span className="font-latin" dir="ltr">@{f.username}</span>}
                    <StreakFlame streak={f.streak} />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <ProgressRing pct={f.pct / 100} size={40} strokeWidth={4}>
                    <span className="font-vazir text-[10.5px]" style={{ color: "var(--text)" }}>
                      {faNum(f.pct)}٪
                    </span>
                  </ProgressRing>
                  {f.total > 0 && (
                    <span className="mt-0.5 font-vazir text-[10px]" style={{ color: "var(--muted)" }}>
                      {faNum(f.completed)}/{faNum(f.total)}
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggleFavorite(f)}
                disabled={!res.online || busy === f.friendshipId}
                aria-label={f.favorite ? "برداشتن از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                title={!res.online ? NEED_INTERNET : undefined}
                className="flex items-center justify-center disabled:opacity-50"
                style={{ width: 36, height: 36 }}
              >
                <Star size={18} color={f.favorite ? "var(--sun)" : "var(--muted)"} fill={f.favorite ? "var(--sun)" : "none"} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestsList({ resource }: { resource: CachedResource<SocialRequestsResponse> }) {
  const api = useSocialApi();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function respond(friendshipId: string, accept: boolean) {
    if (busy) return;
    setBusy(friendshipId);
    setActionError(null);
    try {
      if (accept) await api.accept(friendshipId);
      else await api.remove(friendshipId);
      resource.mutate((prev) => (prev ? { requests: prev.requests.filter((r) => r.friendshipId !== friendshipId) } : prev));
    } catch (err) {
      setActionError(describeSocialError(err));
      void resource.reload();
    } finally {
      setBusy(null);
    }
  }

  const list = resource.data?.requests ?? [];
  return (
    <div>
      <StaleNotice online={resource.online} staleSince={resource.staleSince} />
      <ErrorNotice message={resource.error || actionError} />
      {resource.loading && !resource.data ? (
        <Loading />
      ) : !list.length ? (
        <EmptyState text="درخواستِ دوستیِ تازه‌ای نداری" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((r) => (
            <li key={r.friendshipId} className="flex items-center gap-3 rounded-card border p-3" style={{ borderColor: "var(--surface-line)" }}>
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => navigate(socialRoutePaths.profile(r.id))}>
                <Avatar name={r.name} url={r.avatarUrl} />
                <div className="min-w-0">
                  <div className="truncate font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    {r.name}
                  </div>
                  {r.username && (
                    <div className="font-latin text-[11.5px]" dir="ltr" style={{ color: "var(--muted)" }}>
                      @{r.username}
                    </div>
                  )}
                </div>
              </button>
              <div className="flex gap-1.5">
                <ActionButton online={resource.online} busy={busy === r.friendshipId} onClick={() => respond(r.friendshipId, true)}>
                  قبول
                </ActionButton>
                <ActionButton online={resource.online} busy={busy === r.friendshipId} tone="ghost" onClick={() => respond(r.friendshipId, false)}>
                  رد
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<SocialSearchUser["status"], string> = {
  none: "",
  friends: "دوست هستید",
  pending_sent: "در انتظارِ تأیید",
  pending_received: "درخواست داده — در «درخواست‌ها»",
};

function AddFriend() {
  const api = useSocialApi();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<SocialSearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const seq = useRef(0);
  // جست‌وجو کش نمی‌شه (نتیجه‌اش لحظه‌ایه)؛ فقط وضعیتِ شبکه لازمه.
  const online = useNetworkStatus();

  const runSearch = useCallback(
    async (term: string) => {
      const mine = ++seq.current;
      if (term.trim().length < 2) {
        setUsers([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await api.search(term.trim());
        if (mine === seq.current) {
          setUsers(res.users);
          setError(null);
        }
      } catch (err) {
        if (mine === seq.current) setError(describeSocialError(err));
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    },
    [api]
  );

  useEffect(() => {
    if (!online) return;
    const t = setTimeout(() => void runSearch(q), 350);
    return () => clearTimeout(t);
  }, [q, online, runSearch]);

  async function send(u: SocialSearchUser) {
    if (busy) return;
    setBusy(u.id);
    setError(null);
    try {
      await api.sendRequest({ userId: u.id });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: "pending_sent" } : x)));
    } catch (err) {
      setError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <label className="mb-3 flex items-center gap-2 rounded-card border px-3" style={{ borderColor: "var(--surface-line)" }}>
        <Search size={16} color="var(--muted)" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={online ? "جست‌وجوی یوزرنیم…" : NEED_INTERNET}
          disabled={!online}
          dir="auto"
          autoCapitalize="none"
          autoCorrect="off"
          maxLength={60}
          className="h-11 flex-1 bg-transparent font-vazir text-[14px] outline-none"
          style={{ color: "var(--text)" }}
          aria-label="جست‌وجوی یوزرنیم"
        />
      </label>
      {!online && <StaleNotice online={false} staleSince={null} />}
      <ErrorNotice message={error} />
      {searching && <Loading />}
      {!searching && q.trim().length >= 2 && !users.length && !error && online && <EmptyState text="کاربری پیدا نشد" />}
      <ul className="flex flex-col gap-2.5">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-card border p-3" style={{ borderColor: "var(--surface-line)" }}>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => navigate(socialRoutePaths.profile(u.id))}>
              <Avatar name={u.name} url={null} />
              <div className="min-w-0">
                <div className="truncate font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                  {u.name}
                </div>
                {u.username && (
                  <div className="font-latin text-[11.5px]" dir="ltr" style={{ color: "var(--muted)" }}>
                    @{u.username}
                  </div>
                )}
              </div>
            </button>
            {u.status === "none" ? (
              <ActionButton online={online} busy={busy === u.id} onClick={() => send(u)} ariaLabel={`ارسال درخواست دوستی به ${u.name}`}>
                <span className="inline-flex items-center gap-1">
                  <UserPlus size={14} /> درخواست
                </span>
              </ActionButton>
            ) : (
              <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                {STATUS_LABEL[u.status]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
