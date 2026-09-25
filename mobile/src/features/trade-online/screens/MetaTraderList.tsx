import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Cable, ChevronLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PullToRefresh from "@/components/PullToRefresh";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import { OFFLINE_MESSAGE, describeTradeOnlineError, isModuleLockedError, useTradeOnlineApi } from "../api";
import { onlineDb, setKv } from "../db";
import OnlineGate from "../components/OnlineGate";
import { tradeOnlineRoutePaths } from "../paths";
import { jalaliDateTime } from "../lib/calendar";

const TYPE_LABELS: Record<string, string> = { REAL: "واقعی", DEMO: "دمو", PROP: "پراپ", BACKTEST: "بک‌تست" };

// آینه‌ی /trade/metatrader وب: اتصال روی هر حساب جداست (هر حساب ترمینال و
// لاگینِ خودش رو داره) — این‌جا فقط فهرستِ حساب‌ها و وضعیتِ فعال/غیرفعال.
export default function MetaTraderList() {
  const [locked, setLocked] = useState(false);
  return (
    <div>
      <AppHeader title="اتصال متاتریدر" showBack />
      <OnlineGate locked={locked}>
        <ListBody onLocked={() => setLocked(true)} />
      </OnlineGate>
    </div>
  );
}

function ListBody({ onLocked }: { onLocked: () => void }) {
  const api = useTradeOnlineApi();
  const online = useNetworkStatus();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const cachedRow = useLiveQuery(() => onlineDb.kv.get("mtAccounts"), []);
  const cached = cachedRow?.key === "mtAccounts" ? cachedRow.value : null;

  const load = useCallback(async () => {
    if (!online || !api.available) {
      setLoading(false);
      return;
    }
    try {
      const accounts = await api.mtAccounts();
      await setKv({ key: "mtAccounts", value: { accounts, fetchedAt: new Date().toISOString() } });
      setError(null);
    } catch (err) {
      if (isModuleLockedError(err)) onLocked();
      else setError(describeTradeOnlineError(err));
    } finally {
      setLoading(false);
    }
  }, [api, online, onLocked]);

  useEffect(() => {
    void load();
  }, [load]);

  const accounts = cached?.accounts ?? [];

  return (
    <PullToRefresh enabled={online} onRefresh={load}>
      <div className="flex flex-col gap-2.5 px-4 py-4">
        {(!online || error) && (
          <p className="rounded-card border px-3 py-2 font-vazir text-[12px]" style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }} role="status">
            {!online
              ? cached
                ? `آفلاین — وضعیتِ ذخیره‌شده (${jalaliDateTime(cached.fetchedAt)})`
                : OFFLINE_MESSAGE
              : error}
          </p>
        )}

        {!loading && cached && accounts.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-card border px-4 py-8 text-center" style={{ borderColor: "var(--surface-line)" }}>
            <Cable size={26} color="var(--muted)" />
            <span className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              اول باید یک حساب معاملاتی بسازی (و یک‌بار همگام‌سازی کنی) تا بشه به متاتریدر وصلش کرد.
            </span>
          </div>
        )}

        {accounts.map((a) => {
          const connected = !!a.link?.connected;
          return (
            <button
              key={a.accountId}
              type="button"
              onClick={() => {
                void tapHaptic();
                navigate(tradeOnlineRoutePaths.metatraderAccount(a.accountId));
              }}
              className="flex items-center gap-2.5 rounded-card border px-3.5 py-3 text-start"
              style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", minHeight: 56 }}
            >
              <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: a.color }} />
              <span className="flex-1 truncate font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                {a.name}
              </span>
              <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
                {TYPE_LABELS[a.type] ?? a.type}
              </span>
              <span
                className="flex items-center gap-1 font-vazir text-[12px] font-semibold"
                style={{ color: connected ? "var(--pnl-win)" : "var(--muted)" }}
              >
                <span className="inline-block rounded-full" style={{ width: 7, height: 7, background: connected ? "var(--pnl-win)" : "var(--muted)" }} />
                {connected ? "فعال" : "غیرفعال"}
              </span>
              <ChevronLeft size={16} color="var(--muted)" />
            </button>
          );
        })}
      </div>
    </PullToRefresh>
  );
}
