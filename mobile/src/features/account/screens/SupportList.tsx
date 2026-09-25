import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LifeBuoy, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import type { MobileTicketSummary } from "@/lib/account-contract";
import { describeAccountError, useAccountApi } from "../api";
import { formatIsoJalali, TICKET_STATUS_LABELS } from "../logic";
import { accountRoutePaths } from "../paths";
import { Empty, ErrorBox, Loading } from "../components/Ui";

export default function SupportList() {
  const api = useAccountApi();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const [tickets, setTickets] = useState<MobileTicketSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.listTickets().then((r) => setTickets(r.tickets), (e) => setError(describeAccountError(e)));
  }, [api]);

  useEffect(() => {
    if (online) load();
  }, [online, load]);

  const newButton = (
    <button type="button" onClick={() => navigate(accountRoutePaths.supportNew)} aria-label="تیکتِ جدید" className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
      <Plus size={20} color="var(--accent)" />
    </button>
  );

  return (
    <div>
      <AppHeader title="پشتیبانی" showBack right={newButton} />
      <main className="pb-6 pt-3">
        {error && <ErrorBox message={error} onRetry={load} />}
        {!tickets && !error && (online ? <Loading /> : <ErrorBox message="برای دیدنِ تیکت‌ها به اینترنت وصل شو" />)}
        {tickets?.length === 0 && (
          <Empty
            icon={<LifeBuoy size={40} color="var(--muted)" />}
            text="هنوز تیکتی نفرستادی. سوال یا مشکلی داری؟"
            action={
              <button
                type="button"
                onClick={() => navigate(accountRoutePaths.supportNew)}
                className="mt-2 rounded-full px-5 py-2.5 font-vazir text-[13.5px] font-semibold"
                style={{ background: "var(--accent)", color: "white" }}
              >
                + تیکتِ جدید
              </button>
            }
          />
        )}
        {!!tickets?.length && (
          <div className="flex flex-col gap-2.5 px-4">
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(accountRoutePaths.ticket(t.id))}
                className="rounded-card border px-4 py-3 text-start font-vazir"
                style={{ borderColor: t.status === "ANSWERED" ? "var(--accent)" : "var(--surface-line)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
                    {t.subject}
                  </span>
                  <span className="text-[11.5px] font-semibold" style={{ color: t.status === "ANSWERED" ? "var(--accent)" : "var(--muted)" }}>
                    {TICKET_STATUS_LABELS[t.status]}
                  </span>
                </div>
                {t.lastMessage && (
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                    {t.lastMessage.fromAdmin ? "پشتیبانی: " : ""}
                    {t.lastMessage.body}
                  </p>
                )}
                <div className="mt-1 text-[11.5px] tabular-nums" style={{ color: "var(--muted)" }}>
                  {formatIsoJalali(t.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
