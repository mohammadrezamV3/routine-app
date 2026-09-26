import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, Pencil, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import PullToRefresh from "@/components/PullToRefresh";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import {
  MARKET_POLL_MS,
  TICKER_CATEGORY_LABELS,
  TICKER_DEFAULT_SYMBOLS,
  TICKER_MAX_SYMBOLS,
  type TickerSymbolDto,
} from "@/lib/trade-online-contract";
import { OFFLINE_MESSAGE, describeTradeOnlineError, isModuleLockedError, useTradeOnlineApi } from "../api";
import { onlineDb, setKv, storeQuotes, type CachedQuote } from "../db";
import OnlineGate from "../components/OnlineGate";
import { formatChange, formatPrice, groupCatalog, labelFor, toggleSymbol, tradingViewUrl } from "../lib/market";
import { jalaliDateTime } from "../lib/calendar";

export default function Watchlist() {
  const [locked, setLocked] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div>
      <AppHeader
        title="قیمت بازارها"
        showBack
        right={
          <button type="button" onClick={() => setEditOpen(true)} aria-label="ویرایشِ واچ‌لیست" className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
            <Pencil size={18} color="var(--text)" />
          </button>
        }
      />
      <OnlineGate locked={locked}>
        <WatchlistBody onLocked={() => setLocked(true)} editOpen={editOpen} onCloseEdit={() => setEditOpen(false)} />
      </OnlineGate>
    </div>
  );
}

function WatchlistBody({ onLocked, editOpen, onCloseEdit }: { onLocked: () => void; editOpen: boolean; onCloseEdit: () => void }) {
  const api = useTradeOnlineApi();
  const online = useNetworkStatus();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const watch = useLiveQuery(() => onlineDb.kv.get("watchlist"), []);
  const catalogRow = useLiveQuery(() => onlineDb.kv.get("catalog"), []);
  const symbols: string[] = watch?.key === "watchlist" ? watch.value.symbols : TICKER_DEFAULT_SYMBOLS;
  const catalog: TickerSymbolDto[] = catalogRow?.key === "catalog" ? catalogRow.value : [];
  const quotes = useLiveQuery(() => onlineDb.quotes.bulkGet(symbols), [symbols.join(",")]) ?? [];
  const bySymbol = useMemo(() => {
    const m = new Map<string, CachedQuote>();
    for (const q of quotes) if (q) m.set(q.symbol, q);
    return m;
  }, [quotes]);

  // واچ‌لیست + کاتالوگ از سرور (همون تنظیمِ نوارِ قیمتِ وب)
  useEffect(() => {
    if (!online || !api.available) return;
    let cancelled = false;
    api
      .getWatchlist()
      .then(async (w) => {
        if (cancelled) return;
        await setKv({ key: "watchlist", value: { symbols: w.symbols, saved: w.saved } });
        await setKv({ key: "catalog", value: w.catalog });
      })
      .catch((err) => {
        if (isModuleLockedError(err)) onLocked();
      });
    return () => {
      cancelled = true;
    };
  }, [api, online, onLocked]);

  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (!online || !api.available || busy.current || !symbolsRef.current.length) return;
    busy.current = true;
    setLoading(true);
    try {
      const q = await api.prices(symbolsRef.current);
      await storeQuotes(q, new Date().toISOString());
      setError(null);
    } catch (err) {
      if (isModuleLockedError(err)) onLocked();
      else setError(describeTradeOnlineError(err));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [api, online, onLocked]);

  // مثلِ نوارِ وب: فقط وقتی صفحه دیده می‌شه و آنلاینیم؛ برگشت = یک‌بار فوری
  useEffect(() => {
    if (!online) return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, MARKET_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [online, refresh, symbols.join(",")]);

  const oldest = quotes.reduce<string | null>((acc, q) => (q && (!acc || q.fetchedAt < acc) ? q.fetchedAt : acc), null);
  const detailQuote = detail ? bySymbol.get(detail) : undefined;
  const detailMeta = detail ? catalog.find((c) => c.symbol === detail) : undefined;
  const detailTv = detailMeta ? tradingViewUrl(detailMeta) : null;

  return (
    <PullToRefresh enabled={online} onRefresh={refresh}>
      <div className="flex flex-col gap-2.5 px-4 py-4">
        <div className="flex items-center gap-2 font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
          <span className="flex-1">
            {!online
              ? oldest
                ? `آفلاین — آخرین قیمت‌ها (${jalaliDateTime(oldest)})`
                : OFFLINE_MESSAGE
              : error ?? "هر ۳۰ ثانیه تازه می‌شه · قیمت‌ها تقریبی‌ان"}
          </span>
          {loading && <RefreshCw size={14} className="animate-spin" />}
        </div>

        {symbols.map((s) => {
          const q = bySymbol.get(s);
          const up = (q?.changePercent ?? 0) >= 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setDetail(s)}
              className="flex items-center gap-3 rounded-card border px-3.5 py-3 text-start"
              style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
            >
              <div className="flex flex-1 flex-col">
                <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                  {labelFor(s, catalog)}
                </span>
                <span className="text-[11px]" style={{ color: "var(--muted)" }} dir="ltr">
                  {s}
                </span>
              </div>
              {q ? (
                <div className="flex flex-col items-end tabular-nums" dir="ltr">
                  <span className="text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
                    {formatPrice(q.price)}
                  </span>
                  <span className="flex items-center gap-1 text-[12px]" style={{ color: up ? "var(--pnl-win)" : "var(--pnl-loss)" }}>
                    {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {formatChange(q)}
                  </span>
                </div>
              ) : (
                <span className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
                  —
                </span>
              )}
            </button>
          );
        })}
      </div>

      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title={detail ? labelFor(detail, catalog) : undefined}>
        {detail && (
          <div className="flex flex-col gap-3 px-4 pb-6">
            {detailQuote ? (
              <div className="grid grid-cols-2 gap-2 tabular-nums">
                <Cell label="قیمت" value={formatPrice(detailQuote.price)} />
                <Cell label="تغییرِ روز" value={`${formatChange(detailQuote)} (${detailQuote.changeAbs >= 0 ? "+" : ""}${formatPrice(detailQuote.changeAbs)})`} />
                <Cell label="به‌روزرسانی" value={jalaliDateTime(detailQuote.fetchedAt)} />
                <Cell label="نماد" value={detail} />
              </div>
            ) : (
              <p className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
                قیمتِ این نماد فعلا در دسترس نیست.
              </p>
            )}
            {detailTv && (
              <button
                type="button"
                onClick={() => window.open(detailTv, "_blank")}
                className="flex items-center justify-center gap-2 rounded-card border font-vazir text-[13.5px]"
                style={{ borderColor: "var(--surface-line)", color: "var(--text)", height: 44 }}
              >
                <ExternalLink size={15} /> مشاهده‌ی چارت در TradingView
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      <WatchlistEditor open={editOpen} onClose={onCloseEdit} symbols={symbols} catalog={catalog} online={online} onLocked={onLocked} />
    </PullToRefresh>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border px-3 py-2" style={{ borderColor: "var(--surface-line)" }}>
      <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <b className="text-[13px]" style={{ color: "var(--text)" }} dir="ltr">
        {value}
      </b>
    </div>
  );
}

function WatchlistEditor({
  open,
  onClose,
  symbols,
  catalog,
  online,
  onLocked,
}: {
  open: boolean;
  onClose: () => void;
  symbols: string[];
  catalog: TickerSymbolDto[];
  online: boolean;
  onLocked: () => void;
}) {
  const api = useTradeOnlineApi();
  const [draft, setDraft] = useState<string[]>(symbols);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(symbols);
      setQuery("");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => groupCatalog(catalog, query), [catalog, query]);
  const changed = draft.join(",") !== symbols.join(",");

  async function save() {
    if (!online) return setError(OFFLINE_MESSAGE);
    setSaving(true);
    setError(null);
    try {
      const w = await api.setWatchlist(draft);
      await setKv({ key: "watchlist", value: { symbols: w.symbols, saved: w.saved } });
      onClose();
    } catch (err) {
      if (isModuleLockedError(err)) onLocked();
      setError(describeTradeOnlineError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="بازارهایی که دنبال می‌کنی">
      <div className="flex flex-col gap-3 px-4 pb-6">
        <p className="font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
          {draft.length} از حداکثر {TICKER_MAX_SYMBOLS} بازار انتخاب شده — همین فهرست روی نوارِ قیمتِ نسخه‌ی وب هم نشون داده می‌شه.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نماد یا اسم بازار…"
          className="rounded-lg border px-3 font-vazir text-[14px]"
          style={{ height: 44, borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)" }}
        />
        {catalog.length === 0 && (
          <p className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            فهرستِ بازارها هنوز از سرور گرفته نشده — آنلاین شو و دوباره باز کن.
          </p>
        )}
        {groups.map(([cat, items]) => (
          <div key={cat} className="flex flex-col gap-1">
            <span className="font-vazir text-[12.5px] font-semibold" style={{ color: "var(--muted)" }}>
              {TICKER_CATEGORY_LABELS[cat]}
            </span>
            {items.map((s) => {
              const on = draft.includes(s.symbol);
              return (
                <label key={s.symbol} className="flex items-center gap-3 py-2" style={{ minHeight: 44 }}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      void tapHaptic();
                      setDraft((d) => toggleSymbol(d, s.symbol));
                    }}
                    style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                  />
                  <span className="flex-1 font-vazir text-[13.5px]" style={{ color: "var(--text)" }}>
                    {s.label}
                    {s.category !== "forex" && (
                      <span className="text-[11px]" style={{ color: "var(--muted)" }} dir="ltr">
                        {" "}
                        {s.symbol}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
        {error && (
          <p className="font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }} role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!changed || saving}
          className="sticky bottom-0 rounded-card font-vazir text-[14px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--bg)", height: 46, opacity: !changed || saving ? 0.5 : 1 }}
        >
          {saving ? "در حالِ ذخیره…" : "ذخیره"}
        </button>
      </div>
    </BottomSheet>
  );
}
