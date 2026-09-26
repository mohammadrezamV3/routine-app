import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MessagesSquare, Search } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import type { SocialChatRoomsResponse } from "@/lib/social-contract";
import { useSocialApi } from "../api";
import { cacheKeys } from "../db";
import { useCachedResource } from "../hooks";
import { socialRoutePaths } from "../paths";
import { EmptyState, ErrorNotice, Loading, LockedState, StaleNotice } from "../components/SocialUi";

/** فهرستِ اتاق‌های گفت‌وگو — یک اتاق برای هر نمادِ مجاز (همون TRADE_PAIRSِ سرور). */
export default function ChatRoomsScreen() {
  const navigate = useNavigate();
  const api = useSocialApi();
  const res = useCachedResource<SocialChatRoomsResponse>(cacheKeys.rooms, () => api.chatRooms());
  const [q, setQ] = useState("");

  const rooms = useMemo(() => {
    const all = res.data?.rooms ?? [];
    const term = q.trim().toUpperCase();
    if (!term) return all;
    return all.filter((r) => r.symbol.includes(term) || r.label.includes(q.trim()));
  }, [res.data, q]);

  if (res.locked) {
    return (
      <div>
        <AppHeader title="گفت‌وگوی نمادها" showBack />
        <LockedState hint="گفت‌وگوی نمادها بخشی از ماژولِ ترید است." />
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="گفت‌وگوی نمادها" showBack />
      <main className="px-4 pt-4 pb-6">
        <StaleNotice online={res.online} staleSince={res.staleSince} />
        <ErrorNotice message={res.error} />
        <label className="mb-3 flex items-center gap-2 rounded-card border px-3" style={{ borderColor: "var(--surface-line)" }}>
          <Search size={16} color="var(--muted)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجوی نماد…"
            dir="auto"
            autoCapitalize="characters"
            className="h-11 flex-1 bg-transparent font-vazir text-[14px] outline-none"
            style={{ color: "var(--text)" }}
            aria-label="جست‌وجوی نماد"
          />
        </label>
        {res.loading && !res.data ? (
          <Loading />
        ) : !rooms.length ? (
          <EmptyState icon={<MessagesSquare size={36} color="var(--muted)" />} text="اتاقی پیدا نشد" />
        ) : (
          <ul className="flex flex-col gap-2">
            {rooms.map((r) => (
              <li key={r.symbol}>
                <button
                  type="button"
                  onClick={() => navigate(socialRoutePaths.chatRoom(r.symbol))}
                  className="flex w-full items-center gap-3 rounded-card border px-4 py-3 text-start"
                  style={{ borderColor: "var(--surface-line)" }}
                >
                  <span className="font-latin text-[14px] font-semibold" dir="ltr" style={{ color: "var(--text)", minWidth: 72 }}>
                    {r.symbol}
                  </span>
                  <span className="flex-1 truncate font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                    {r.label}
                  </span>
                  <ChevronLeft size={18} color="var(--muted)" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
