import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Filter, RefreshCw, X } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import PullToRefresh from "@/components/PullToRefresh";
import { isoLocal } from "@/lib/jalali";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import {
  ECON_CALENDAR_CURRENCIES,
  ECON_IMPACT_COLORS,
  ECON_IMPACT_LABELS,
  ECON_IMPACT_ORDER,
  type EconomicEventDto,
  type EconomicImpact,
} from "@/lib/trade-online-contract";
import { describeTradeOnlineError, isModuleLockedError, useTradeOnlineApi } from "../api";
import { getKv, onlineDb, setKv, storeWeek } from "../db";
import OnlineGate from "../components/OnlineGate";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  addDays,
  applyCalendarFilters,
  compareActualToForecast,
  groupByLocalDay,
  hasPendingRelease,
  jalaliDateTime,
  jalaliDayLabel,
  jalaliWeekLabel,
  localTime,
  parseIsoLocal,
  weekQuery,
  weekStartOf,
  type CalendarFilters,
} from "../lib/calendar";

/** تازه‌سازیِ بی‌صدا وقتی رویدادی همین حوالی منتشر می‌شه (وب ۵ ثانیه؛ موبایل ملایم‌تر) */
const LIVE_POLL_MS = 20_000;
const FILTERS_KEY = "arion:trade-online:calendar-filters";

function readFilters(): CalendarFilters {
  try {
    const v = JSON.parse(localStorage.getItem(FILTERS_KEY) || "null");
    if (v && Array.isArray(v.currencies) && Array.isArray(v.impacts)) return { ...EMPTY_FILTERS, ...v, q: "" };
  } catch {
    /* noop */
  }
  return EMPTY_FILTERS;
}

export default function EconomicCalendar() {
  const [locked, setLocked] = useState(false);
  return (
    <div>
      <AppHeader title="تقویم اقتصادی" showBack />
      <OnlineGate locked={locked}>
        <CalendarBody onLocked={() => setLocked(true)} />
      </OnlineGate>
    </div>
  );
}

function CalendarBody({ onLocked }: { onLocked: () => void }) {
  const api = useTradeOnlineApi();
  const online = useNetworkStatus();
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
  const weekIso = isoLocal(weekStart);
  const [filters, setFilters] = useState<CalendarFilters>(readFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<{ from: string | null; to: string | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    getKv("calendarRange").then((r) => r && setRange(r));
  }, []);
  useEffect(() => {
    try {
      const { q: _q, ...rest } = filters;
      localStorage.setItem(FILTERS_KEY, JSON.stringify(rest));
    } catch {
      /* noop */
    }
  }, [filters]);

  const cached = useLiveQuery(() => onlineDb.events.where("weekStart").equals(weekIso).toArray(), [weekIso]);
  const week = useLiveQuery(() => onlineDb.weeks.get(weekIso), [weekIso]);
  const events = cached ?? [];

  const seq = useRef(0);
  const load = useCallback(
    async (silent = false) => {
      if (!online || !api.available) return;
      const my = ++seq.current;
      if (!silent) setLoading(true);
      try {
        const res = await api.calendar(weekQuery(weekStart));
        await storeWeek(weekIso, res.events, new Date().toISOString());
        await setKv({ key: "calendarRange", value: res.range });
        if (my === seq.current) {
          setRange(res.range);
          setError(null);
        }
      } catch (err) {
        if (isModuleLockedError(err)) onLocked();
        else if (my === seq.current && !silent) setError(describeTradeOnlineError(err));
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [api, online, weekStart, weekIso, onLocked]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // «actual» رو زنده بیار: فقط وقتی رویدادِ بی‌actualی همین حوالیه
  const eventsRef = useRef<EconomicEventDto[]>([]);
  eventsRef.current = events;
  useEffect(() => {
    if (!online) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible" && hasPendingRelease(eventsRef.current, Date.now())) void load(true);
    }, LIVE_POLL_MS);
    return () => clearInterval(t);
  }, [online, load]);

  // اپی که از دیروز باز مونده روی «دیروز/هفته‌ی قبل» گیر نکنه (همون رفعِ
  // EconomicCalendarPanelِ وب): اگه کاربر روی هفته‌ی جاریِ اون موقع بود، با
  // عوض‌شدنِ هفته به هفته‌ی جدید می‌ره؛ برگشتن به اپ هم بی‌صدا تازه‌سازی
  // می‌کنه. تیکِ دقیقه‌ای «امروز» رو هم بعد از نیمه‌شب درست می‌کنه.
  const weekAnchor = useRef(isoLocal(weekStartOf(new Date())));
  const [, setNowTick] = useState(0);
  useEffect(() => {
    function check(reload: boolean) {
      if (document.visibilityState !== "visible") return;
      setNowTick((n) => n + 1);
      const nowWeek = isoLocal(weekStartOf(new Date()));
      if (nowWeek !== weekAnchor.current) {
        const wasOnThisWeek = weekIso === weekAnchor.current;
        weekAnchor.current = nowWeek;
        if (wasOnThisWeek) {
          setWeekStart(weekStartOf(new Date()));
          return;
        }
      }
      if (reload) void load(true);
    }
    const onVisible = () => check(true);
    const tick = setInterval(() => check(false), 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, weekIso]);

  const days = useMemo(() => groupByLocalDay(applyCalendarFilters(events, filters)), [events, filters]);
  const filterCount = activeFilterCount(filters);
  const todayIso = isoLocal(new Date());
  const thisWeekIso = isoLocal(weekStartOf(new Date()));

  // مرزِ ناوبری از بازه‌ی واقعیِ داده (مثلِ نوارِ روزهای وب)، با یک هفته حاشیه
  const minWeek = range?.from ? isoLocal(addDays(weekStartOf(new Date(range.from)), -7)) : null;
  const maxWeek = range?.to ? isoLocal(weekStartOf(new Date(range.to))) : null;
  const canPrev = !minWeek || weekIso > minWeek;
  const canNext = !maxWeek || weekIso < maxWeek;

  function go(delta: number) {
    void tapHaptic();
    setOpenId(null);
    setWeekStart((w) => addDays(w, delta * 7));
  }

  return (
    <PullToRefresh enabled={online} onRefresh={() => load()}>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={!canPrev}
            aria-label="هفته‌ی قبل"
            className="flex items-center justify-center rounded-full border"
            style={{ width: 40, height: 40, borderColor: "var(--surface-line)", opacity: canPrev ? 1 : 0.4 }}
          >
            <ChevronRight size={18} color="var(--text)" />
          </button>
          <div className="flex flex-1 flex-col items-center">
            <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
              {jalaliWeekLabel(weekStart)}
            </span>
            {weekIso !== thisWeekIso && (
              <button
                type="button"
                onClick={() => setWeekStart(weekStartOf(new Date()))}
                className="font-vazir text-[12px]"
                style={{ color: "var(--accent)" }}
              >
                برگشت به این هفته
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={!canNext}
            aria-label="هفته‌ی بعد"
            className="flex items-center justify-center rounded-full border"
            style={{ width: 40, height: 40, borderColor: "var(--surface-line)", opacity: canNext ? 1 : 0.4 }}
          >
            <ChevronLeft size={18} color="var(--text)" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-vazir text-[12.5px]"
            style={{ borderColor: filterCount ? "var(--accent)" : "var(--surface-line)", color: filterCount ? "var(--accent)" : "var(--text)" }}
          >
            <Filter size={14} /> فیلتر{filterCount ? ` (${filterCount})` : ""}
          </button>
          {filterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex items-center gap-1 font-vazir text-[12px]"
              style={{ color: "var(--muted)" }}
            >
              <X size={13} /> حذفِ فیلترها
            </button>
          )}
          <span className="flex-1" />
          {loading && <RefreshCw size={15} className="animate-spin" color="var(--muted)" />}
        </div>

        <StatusLine online={online} fetchedAt={week?.fetchedAt ?? null} hasCache={!!week} error={error} />

        {days.length === 0 ? (
          week || !online ? (
            <p className="py-10 text-center font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
              {!week ? "این هفته هنوز روی این دستگاه ذخیره نشده." : filterCount ? "با این فیلترها رویدادی نیست." : "برای این هفته رویدادی ثبت نشده."}
            </p>
          ) : null
        ) : (
          days.map((d) => (
            <section key={d.dayIso} className="flex flex-col gap-1.5">
              <h2
                className="py-1 font-vazir text-[13px] font-semibold"
                style={{ color: d.dayIso === todayIso ? "var(--accent)" : "var(--text)" }}
              >
                {jalaliDayLabel(parseIsoLocal(d.dayIso))}
                {d.dayIso === todayIso ? " · امروز" : ""}
              </h2>
              {d.events.map((e) => (
                <EventRow key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId((v) => (v === e.id ? null : e.id))} />
              ))}
            </section>
          ))
        )}
      </div>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onChange={setFilters} />
    </PullToRefresh>
  );
}

function StatusLine({ online, fetchedAt, hasCache, error }: { online: boolean; fetchedAt: string | null; hasCache: boolean; error: string | null }) {
  let text: string | null = null;
  if (!online) text = hasCache ? `آفلاین — نسخه‌ی ذخیره‌شده (${jalaliDateTime(fetchedAt!)})` : "آفلاینی و این هفته ذخیره نشده — برای دیدنش اینترنت لازمه";
  else if (error) text = hasCache ? `${error} — نسخه‌ی ذخیره‌شده نمایش داده می‌شه` : error;
  if (!text) return null;
  return (
    <div
      className="rounded-card border px-3 py-2 font-vazir text-[12px]"
      style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }}
      role="status"
    >
      {text}
    </div>
  );
}

function EventRow({ e, open, onToggle }: { e: EconomicEventDto; open: boolean; onToggle: () => void }) {
  const cmp = compareActualToForecast(e.actual, e.forecast);
  const actualColor = cmp === "up" ? "var(--pnl-win)" : cmp === "down" ? "var(--pnl-loss)" : "var(--text)";
  const flag = ECON_CALENDAR_CURRENCIES.find((c) => c.code === e.currency)?.flag ?? "🏳️";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex flex-col gap-1.5 rounded-card border px-3 py-2.5 text-start"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)" }}
    >
      <div className="flex items-center gap-2">
        <span className="font-vazir text-[12.5px] tabular-nums" style={{ color: "var(--muted)", minWidth: 40 }} dir="ltr">
          {localTime(e.occursAt)}
        </span>
        <span
          aria-label={ECON_IMPACT_LABELS[e.impact]}
          title={ECON_IMPACT_LABELS[e.impact]}
          className="inline-block rounded-full"
          style={{ width: 9, height: 9, background: ECON_IMPACT_COLORS[e.impact] }}
        />
        <span className="font-vazir text-[12.5px] font-semibold" style={{ color: "var(--text)" }} dir="ltr">
          {flag} {e.currency}
        </span>
        <span className="flex-1 truncate text-[13px]" style={{ color: "var(--text)" }} dir="ltr">
          {e.title}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[12px] tabular-nums" dir="ltr">
        <span style={{ color: "var(--muted)" }}>
          Actual: <b style={{ color: actualColor }}>{e.actual ?? "—"}</b>
        </span>
        <span style={{ color: "var(--muted)" }}>
          Forecast: <b style={{ color: "var(--text)" }}>{e.forecast ?? "—"}</b>
        </span>
        <span style={{ color: "var(--muted)" }}>
          Previous: <b style={{ color: "var(--text)" }}>{e.previous ?? "—"}</b>
        </span>
      </div>
      {open && (
        <p className="font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
          {e.description || "توضیحی برای این رویداد ثبت نشده."} · {ECON_IMPACT_LABELS[e.impact]}
        </p>
      )}
    </button>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="rounded-full border px-3 py-1.5 font-vazir text-[12.5px]"
      style={{ borderColor: on ? "var(--accent)" : "var(--surface-line)", color: on ? "var(--accent)" : "var(--text)" }}
    >
      {children}
    </button>
  );
}

function FilterSheet({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: CalendarFilters;
  onChange: (f: CalendarFilters) => void;
}) {
  const toggleCur = (c: string) =>
    onChange({ ...value, currencies: value.currencies.includes(c) ? value.currencies.filter((x) => x !== c) : [...value.currencies, c] });
  const toggleImpact = (i: EconomicImpact) =>
    onChange({ ...value, impacts: value.impacts.includes(i) ? value.impacts.filter((x) => x !== i) : [...value.impacts, i] });
  return (
    <BottomSheet open={open} onClose={onClose} title="فیلترِ تقویم">
      <div className="flex flex-col gap-4 px-4 pb-6">
        <input
          type="search"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="جستجوی نامِ رویداد (مثلا CPI)"
          className="rounded-lg border px-3 font-vazir text-[14px]"
          style={{ borderColor: "var(--surface-line)", background: "var(--input-bg)", color: "var(--text)", height: 44 }}
          dir="auto"
        />
        <div className="flex flex-col gap-2">
          <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            ارز
          </span>
          <div className="flex flex-wrap gap-2">
            {ECON_CALENDAR_CURRENCIES.map((c) => (
              <Chip key={c.code} on={value.currencies.includes(c.code)} onClick={() => toggleCur(c.code)}>
                {c.flag} {c.code}
              </Chip>
            ))}
            <Chip on={value.other} onClick={() => onChange({ ...value, other: !value.other })}>
              سایر ارزها
            </Chip>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            اهمیت
          </span>
          <div className="flex flex-wrap gap-2">
            {ECON_IMPACT_ORDER.map((i) => (
              <Chip key={i} on={value.impacts.includes(i)} onClick={() => toggleImpact(i)}>
                <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: ECON_IMPACT_COLORS[i], marginInlineEnd: 6 }} />
                {ECON_IMPACT_LABELS[i]}
              </Chip>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-card font-vazir text-[14px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--bg)", height: 46 }}
        >
          نمایش
        </button>
      </div>
    </BottomSheet>
  );
}
