"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Award, Bookmark, Check, ChevronDown, DoorOpen, Search, SearchX, Sparkles, Star, Users, X } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorEmptyState, MentorSectionTitle } from "@/components/MentorUI";
import { MentorCard } from "@/components/MentorCard";
import { SavedMentorsProvider, useSavedMentors } from "@/components/MentorSaved";
import { MentorPlatformNotice } from "@/components/MentorPlatformNotice";
import { MentorCollapse, MentorStagger, MentorStaggerItem, MentorSwap } from "@/components/MentorMotion";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, isMentorCategory } from "@/lib/mentorCategories";
import type { MentorCard as MentorCardData, MentorsListResponse, MentorsPopularResponse } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";
import {
  DEFAULT_FILTERS, MAX_RESPONSE_OPTIONS, MIN_RATING_OPTIONS, SEARCH_QUERY_MAX,
  activeFilterCount, filtersFromParams, filtersToParams, isDefaultView,
  type MentorFilters, type MentorSort,
} from "@/lib/mentorSearch";

const IC = { strokeWidth: 1.75, "aria-hidden": true } as const;
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MORE_OPEN_KEY = "mentors:filters-more";

const SORT_OPTIONS: { value: MentorSort; label: string }[] = [
  { value: "best", label: "بهترین نتیجه" },
  { value: "rating", label: "بالاترین امتیاز" },
  { value: "new", label: "تازه‌ترین" },
];
const CATEGORY_OPTIONS = [{ value: "", label: "همه" }, ...MENTOR_CATEGORIES.map((c) => ({ value: c as string, label: MENTOR_CATEGORY_META[c].short }))];
const RATING_OPTIONS = [{ value: "0", label: "همه" }, ...MIN_RATING_OPTIONS.map((r) => ({ value: String(r), label: `${faNum(r)} به بالا` }))];
const RESPONSE_OPTIONS = [{ value: "0", label: "همه" }, ...MAX_RESPONSE_OPTIONS.map((h) => ({ value: String(h), label: `تا ${faNum(h)} ساعت` }))];

// «جستجوی منتور»: جستجوی هوشمند (غلطِ املایی/هم‌معنی — lib/mentorSearch.ts)،
// فیلترهای همیشه‌پیدا که در نشانیِ صفحه می‌نشینند (قابلِ اشتراک)، ویترینِ
// «محبوب/تازه» فقط در نمای پیش‌فرض، و تبِ «ذخیره‌شده‌ها».
export default function MentorsSearchPage() {
  return (
    <MentorPageShell title="جستجوی منتور">
      <Suspense fallback={<LoadingBlock />}>
        <SavedMentorsProvider>
          <Discovery />
        </SavedMentorsProvider>
        <MentorPlatformNotice />
      </Suspense>
    </MentorPageShell>
  );
}

function readMoreOpen(): boolean {
  try { return window.localStorage.getItem(MORE_OPEN_KEY) !== "0"; } catch { return true; }
}

function Discovery() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromParams(sp, isMentorCategory), [sp]);
  const view: "all" | "saved" = sp.get("view") === "saved" ? "saved" : "all";
  const saved = useSavedMentors();

  const push = useCallback((next: MentorFilters, nextView: "all" | "saved" = view) => {
    const p = filtersToParams(next);
    if (nextView === "saved") p.set("view", "saved");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, view]);

  const setFilters = useCallback((patch: Partial<MentorFilters>) => push({ ...filters, ...patch }), [push, filters]);

  // جستجو با تأخیرِ کوتاه؛ متنِ فیلد محلی است و با نشانی (برگشت/جلو) هم‌گام می‌ماند
  const [qInput, setQInput] = useState(filters.q);
  const lastQ = useRef(filters.q);
  useEffect(() => {
    if (filters.q !== lastQ.current) { lastQ.current = filters.q; setQInput(filters.q); }
  }, [filters.q]);
  useEffect(() => {
    const v = qInput.replace(/\s+/g, " ").trim().slice(0, SEARCH_QUERY_MAX);
    if (v === filters.q) return;
    const t = setTimeout(() => { lastQ.current = v; setFilters({ q: v }); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [qInput, filters.q, setFilters]);

  const clearAll = () => { lastQ.current = ""; setQInput(""); push(DEFAULT_FILTERS); };

  const savedCount = saved?.ids.size ?? 0;
  const viewTabs = [
    { value: "all" as const, label: "همه‌ی منتورها" },
    { value: "saved" as const, label: savedCount ? `ذخیره‌شده‌ها (${faNum(savedCount)})` : "ذخیره‌شده‌ها" },
  ];

  return (
    <>
      <div className="mentor-tabs">
        <SegmentedTabs options={viewTabs} active={view} onChange={(v) => push(filters, v)} />
      </div>
      <MentorSwap swapKey={view}>
        {view === "saved" ? (
          <SavedView />
        ) : (
          <>
            <FilterPanel
              filters={filters}
              qInput={qInput}
              onQInput={setQInput}
              onChange={setFilters}
              onClear={clearAll}
            />
            <Results filters={filters} onClear={clearAll} />
          </>
        )}
      </MentorSwap>
    </>
  );
}

/** ناحیه‌ی فیلتر — همیشه پیدا: جستجو، حوزه، دو کلیدِ پرکاربرد؛ ترتیب/امتیاز/پاسخ در بخشِ «بیشتر» که باز شروع می‌شود */
function FilterPanel({
  filters, qInput, onQInput, onChange, onClear,
}: {
  filters: MentorFilters;
  qInput: string;
  onQInput: (v: string) => void;
  onChange: (patch: Partial<MentorFilters>) => void;
  onClear: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(true);
  useEffect(() => { setMoreOpen(readMoreOpen()); }, []);
  const toggleMore = () => {
    setMoreOpen((o) => {
      try { window.localStorage.setItem(MORE_OPEN_KEY, o ? "0" : "1"); } catch { /* حالتِ خصوصی */ }
      return !o;
    });
  };
  const moreCount = (filters.sort !== "best" ? 1 : 0) + (filters.minRating ? 1 : 0) + (filters.maxResponse ? 1 : 0);
  const dirty = !!filters.q || !!qInput.trim() || activeFilterCount(filters) > 0 || filters.sort !== "best";

  return (
    <div className="trade-surface mentor-filters" role="search" aria-label="جستجو و فیلترِ منتورها">
      <label className="mentor-search">
        <Search size={16} {...IC} />
        <input
          className="wsearch-newform-name trade-glass-field"
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={qInput}
          maxLength={SEARCH_QUERY_MAX + 20}
          onChange={(e) => onQInput(e.target.value)}
          placeholder="مثلاً کنکور، بدنسازی یا نام منتور"
          aria-label="جستجوی نام، تخصص یا عنوانِ منتور"
        />
        {qInput && (
          <button type="button" className="trade-icon-btn mentor-search-clear" onClick={() => onQInput("")} aria-label="پاک کردن جستجو">
            <X size={14} {...IC} />
          </button>
        )}
      </label>

      <SegmentedTabs options={CATEGORY_OPTIONS} active={filters.category} onChange={(v) => onChange({ category: v })} />

      <div className="mentor-filter-chips">
        <ToggleChip on={filters.cert} icon={<Award size={14} {...IC} />} onClick={() => onChange({ cert: !filters.cert })}>
          دارای مدرک
        </ToggleChip>
        <ToggleChip on={filters.open} icon={<DoorOpen size={14} {...IC} />} onClick={() => onChange({ open: !filters.open })}>
          پذیرش باز
        </ToggleChip>
        <button
          type="button"
          className="mentor-text-btn mentor-filter-more"
          aria-expanded={moreOpen}
          aria-controls="mentor-filter-more"
          onClick={toggleMore}
        >
          {!moreOpen && moreCount ? `فیلترها (${faNum(moreCount)})` : "فیلترها"}
          <ChevronDown size={14} {...IC} className={moreOpen ? "is-open" : undefined} />
        </button>
        {dirty && (
          <button type="button" className="mentor-text-btn mentor-filter-clear" onClick={onClear}>
            پاک کردن
          </button>
        )}
      </div>

      <MentorCollapse open={moreOpen} id="mentor-filter-more">
        <div className="mentor-filter-grid">
          <div className="mentor-filter-field" role="group" aria-label="ترتیب">
            <span className="mentor-filter-label" aria-hidden>ترتیب</span>
            <SegmentedTabs options={SORT_OPTIONS} active={filters.sort} onChange={(v) => onChange({ sort: v })} />
          </div>
          <div className="mentor-filter-field" role="group" aria-label="حداقل امتیاز">
            <span className="mentor-filter-label" aria-hidden>حداقل امتیاز</span>
            <SegmentedTabs options={RATING_OPTIONS} active={String(filters.minRating)} onChange={(v) => onChange({ minRating: Number(v) })} />
          </div>
          <div className="mentor-filter-field" role="group" aria-label="زمان پاسخ">
            <span className="mentor-filter-label" aria-hidden>زمان پاسخ</span>
            <SegmentedTabs options={RESPONSE_OPTIONS} active={String(filters.maxResponse)} onChange={(v) => onChange({ maxResponse: Number(v) })} />
          </div>
        </div>
      </MentorCollapse>
    </div>
  );
}

function ToggleChip({ on, icon, onClick, children }: { on: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`account-outline-btn mentor-btn is-sm mentor-toggle-chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {on ? <Check size={14} {...IC} /> : icon}
      {children}
    </button>
  );
}

function CardGrid({ mentors, from = 0 }: { mentors: MentorCardData[]; from?: number }) {
  return (
    <MentorStagger className="mentor-grid">
      {mentors.map((m, i) => (
        <MentorStaggerItem key={m.userId} index={Math.max(0, i - from)} className="mentor-grid-item">
          <MentorCard mentor={m} />
        </MentorStaggerItem>
      ))}
    </MentorStagger>
  );
}

function Results({ filters, onClear }: { filters: MentorFilters; onClear: () => void }) {
  const key = filtersToParams(filters).toString();
  const defaultView = isDefaultView(filters);
  const [mentors, setMentors] = useState<MentorCardData[] | null>(null);
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (p: number) => {
    const id = ++reqId.current;
    const params = new URLSearchParams(key);
    params.set("page", String(p));
    if (p === 1) { setLoading(true); setError(null); } else { setMoreBusy(true); setMoreError(null); }
    try {
      const res = await fetch(`/api/mentors?${params}`, { cache: "no-store" });
      if (id !== reqId.current) return;
      if (!res.ok) {
        const msg = await readApiError(res, "فهرست منتورها دریافت نشد؛ دوباره تلاش کن");
        if (p === 1) setError(msg); else setMoreError(msg);
        return;
      }
      const data: MentorsListResponse = await res.json();
      if (id !== reqId.current) return;
      setMentors((prev) => (p === 1 ? data.mentors : [...(prev ?? []), ...data.mentors.filter((m) => !(prev ?? []).some((x) => x.userId === m.userId))]));
      setShownKey(key);
      setHasMore(!!data.hasMore);
      setPage(p);
    } catch {
      if (id !== reqId.current) return;
      if (p === 1) setError(NETWORK_ERROR); else setMoreError(NETWORK_ERROR);
    } finally {
      if (id === reqId.current) { setLoading(false); setMoreBusy(false); }
    }
  }, [key]);

  useEffect(() => { load(1); }, [load]);

  const [popular, setPopular] = useState<MentorCardData[]>([]);
  const [newcomers, setNewcomers] = useState<MentorCardData[]>([]);
  const popularLoaded = useRef(false);
  useEffect(() => {
    if (!defaultView || popularLoaded.current) return;
    popularLoaded.current = true;
    fetch("/api/mentors/popular", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MentorsPopularResponse | null) => { setPopular(d?.mentors ?? []); setNewcomers(d?.newcomers ?? []); })
      .catch(() => undefined);
  }, [defaultView]);

  const stale = loading && mentors !== null;

  return (
    <>
      {defaultView && popular.length > 0 && (
        <>
          <MentorSectionTitle icon={<Star size={15} {...IC} />}>منتورهای محبوب</MentorSectionTitle>
          <MentorStagger className="mentor-popular-row">
            {popular.map((m, i) => <MentorStaggerItem key={m.userId} index={i}><MentorCard mentor={m} /></MentorStaggerItem>)}
          </MentorStagger>
        </>
      )}
      {defaultView && newcomers.length > 0 && (
        <>
          <MentorSectionTitle icon={<Sparkles size={15} {...IC} />}>منتورهای تازه</MentorSectionTitle>
          <MentorStagger className="mentor-popular-row">
            {newcomers.map((m, i) => <MentorStaggerItem key={m.userId} index={i}><MentorCard mentor={m} /></MentorStaggerItem>)}
          </MentorStagger>
        </>
      )}

      <MentorSectionTitle
        icon={<Users size={15} {...IC} />}
        action={stale ? <Spinner size={14} /> : undefined}
      >
        {defaultView ? "همه‌ی منتورها" : "نتیجه‌ها"}
      </MentorSectionTitle>

      {error ? (
        <MentorErrorState message={error} onRetry={() => load(1)} />
      ) : mentors === null ? (
        <LoadingBlock />
      ) : (
        <div className={`mentor-results${stale ? " is-stale" : ""}`} aria-busy={loading}>
          {mentors.length === 0 ? (
            defaultView ? (
              <MentorEmptyState icon={<Users size={24} {...IC} />} title="هنوز منتوری منتشر نشده است" />
            ) : (
              <div className="mentor-empty-search">
                <MentorEmpty icon={<SearchX size={16} {...IC} />}>
                  {filters.q ? `منتوری برای «${filters.q}» پیدا نشد` : "منتوری با این فیلترها پیدا نشد"}
                </MentorEmpty>
                <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={onClear}>پاک کردن فیلترها</button>
              </div>
            )
          ) : (
            <>
              <CardGrid key={shownKey ?? ""} mentors={mentors} from={(page - 1) * PAGE_SIZE} />
              {hasMore && (
                <div className="mentor-more mentor-more-col">
                  {moreError && <p className="mentor-field-error" role="alert">{moreError}</p>}
                  <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => load(page + 1)} disabled={moreBusy}>
                    {moreBusy ? <Spinner size={14} /> : moreError ? "تلاش دوباره" : "منتورهای بیشتر"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function SavedView() {
  const saved = useSavedMentors();
  if (!saved) return null;
  const { cards, max, error, reload } = saved;
  if (error && !cards?.length) return <MentorErrorState message={error} onRetry={reload} />;
  if (cards === null) return <LoadingBlock />;
  if (cards.length === 0) {
    return (
      <MentorEmptyState
        icon={<Bookmark size={24} {...IC} />}
        title="هنوز منتوری ذخیره نکرده‌ای"
        text="با نشانکِ روی کارتِ هر منتور، او را این‌جا برای تصمیمِ بعدی نگه دار"
      />
    );
  }
  return (
    <>
      <CardGrid mentors={cards} />
      {cards.length >= max && (
        <p className="mentor-muted mentor-saved-full">به سقفِ {faNum(max)} منتورِ ذخیره‌شده رسیده‌ای؛ برای ذخیره‌ی منتورِ دیگر، یکی را بردار</p>
      )}
    </>
  );
}
