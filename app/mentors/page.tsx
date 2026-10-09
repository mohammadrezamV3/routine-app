"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TickButton } from "@/components/TickButton";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bookmark, Filter, Search, SearchX, Sparkles, Star, Users, X } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorEmptyState, MentorSectionTitle } from "@/components/MentorUI";
import { MentorCard } from "@/components/MentorCard";
import { MentorCarousel } from "@/components/MentorCarousel";
import { SavedMentorsProvider, useSavedMentors } from "@/components/MentorSaved";
import { MentorPlatformNotice } from "@/components/MentorPlatformNotice";
import { MentorCollapse, MentorStagger, MentorStaggerItem, MentorSwap } from "@/components/MentorMotion";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, isMentorCategory, type MentorCategory } from "@/lib/mentorCategories";
import type { MentorCard as MentorCardData, MentorsListResponse, MentorsPopularResponse } from "@/lib/mentorTypes";
import { networkError, readApiError } from "@/lib/mentorFormat";
import { tr } from "@/lib/i18n";
import { faNum } from "@/lib/jalali";
import {
  DEFAULT_FILTERS, MAX_RESPONSE_OPTIONS, MIN_RATING_OPTIONS, SEARCH_QUERY_MAX,
  activeFilterCount, filtersFromParams, filtersToParams, isDefaultView,
  type MentorFilters, type MentorSort,
} from "@/lib/mentorSearch";

const IC = { strokeWidth: 1.75, "aria-hidden": true } as const;
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// گزینه‌ها تابع‌اند تا متن موقع رندر (نه موقع بارگذاری ماژول) به زبان جاری دربیاد
const sortOptions = (): { value: MentorSort; label: string }[] => [
  { value: "best", label: tr("بهترین نتیجه", "Best match") },
  { value: "rating", label: tr("بالاترین امتیاز", "Highest rated") },
  { value: "new", label: tr("تازه‌ترین", "Newest") },
];
const categoryOptions = () => [{ value: "", label: tr("همه", "All") }, ...MENTOR_CATEGORIES.map((c) => ({ value: c as string, label: MENTOR_CATEGORY_META[c].short }))];
const ratingOptions = () => [{ value: "0", label: tr("همه", "All") }, ...MIN_RATING_OPTIONS.map((r) => ({ value: String(r), label: tr(`${faNum(r)} به بالا`, `${faNum(r)} and up`) }))];
const responseOptions = () => [{ value: "0", label: tr("همه", "All") }, ...MAX_RESPONSE_OPTIONS.map((h) => ({ value: String(h), label: tr(`تا ${faNum(h)} ساعت`, `Within ${faNum(h)} ${"hours"}`) }))];

// «پیدا کردن منتور»: جستجوی هوشمند (غلط املایی/هم‌معنی — lib/mentorSearch.ts)،
// فیلترهای همیشه‌پیدا که در نشانی صفحه می‌نشینند (قابل اشتراک)، و تب
// «ذخیره‌شده‌ها». در نمای پیش‌فرض (بی‌جستجو/فیلتر) ردیف‌های افقی می‌آیند:
// محبوب، تازه و یک ردیف برای هر حوزه؛ «مشاهده همه»ی هر ردیف همان فهرست را
// با فیلتر متناظر (یا ?view=all برای همه‌ی منتورها) باز می‌کند.
type View = "rows" | "all" | "saved";
const categoryRowTitle = (c: MentorCategory) => tr(`مربی‌های ${MENTOR_CATEGORY_META[c].label}`, `${MENTOR_CATEGORY_META[c].label} mentors`);

export default function MentorsSearchPage() {
  return (
    <MentorPageShell title={tr("مربی‌ها", "Mentors")}>
      <Suspense fallback={<LoadingBlock />}>
        <SavedMentorsProvider>
          <Discovery />
        </SavedMentorsProvider>
        <MentorPlatformNotice />
      </Suspense>
    </MentorPageShell>
  );
}

function Discovery() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromParams(sp, isMentorCategory), [sp]);
  const viewRaw = sp.get("view");
  const view: View = viewRaw === "saved" ? "saved" : viewRaw === "all" ? "all" : "rows";

  const push = useCallback((next: MentorFilters, nextView: View = view) => {
    const p = filtersToParams(next);
    if (nextView !== "rows") p.set("view", nextView);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, view]);

  const setFilters = useCallback((patch: Partial<MentorFilters>) => push({ ...filters, ...patch }), [push, filters]);

  // جستجو با تاخیر کوتاه؛ متن فیلد محلی است و با نشانی (برگشت/جلو) هم‌گام می‌ماند
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
  // «بازگشت به ردیف‌ها»: همه‌ی فیلترها و ?view=all پاک
  const backToRows = () => { lastQ.current = ""; setQInput(""); push(DEFAULT_FILTERS, "rows"); };
  const openAll = (patch: Partial<MentorFilters>, nextView: View = "rows") => {
    push({ ...DEFAULT_FILTERS, ...patch }, nextView);
    window.scrollTo({ top: 0 });
  };
  const showRows = view === "rows" && isDefaultView(filters);
  const openSaved = () => { push(filters, "saved"); window.scrollTo({ top: 0 }); };

  return (
    <MentorSwap swapKey={view === "saved" ? "saved" : "all"}>
      {view === "saved" ? (
        <SavedView onBack={backToRows} />
      ) : (
        <>
          <FilterPanel
            filters={filters}
            qInput={qInput}
            onQInput={setQInput}
            onChange={setFilters}
            onClear={clearAll}
          />
          <MentorSwap swapKey={showRows ? "rows" : "list"}>
            {showRows ? (
              <Rows
                onPopular={() => openAll({}, "all")}
                onNew={() => openAll({ sort: "new" })}
                onCategory={(c) => openAll({ category: c })}
                onSaved={openSaved}
              />
            ) : (
              <Results filters={filters} allView={view === "all"} onClear={clearAll} onBack={backToRows} />
            )}
          </MentorSwap>
        </>
      )}
    </MentorSwap>
  );
}

/** ناحیه‌ی فیلتر — جستجو همیشه‌پیدا + دکمه‌ی «فیلتر» (همان قرص تقویم اقتصادی،
 *  چپ جستجو در RTL)؛ بقیه‌ی فیلترها داخل پنل جمع‌شونده: بخش/ترتیب/امتیاز/پاسخ
 *  فیلد کشویی، مدرک/پذیرش چک‌باکس، با دکمه‌ی «اعمال» که همه را یک‌جا می‌فرستد */
function FilterPanel({
  filters, qInput, onQInput, onChange, onClear,
}: {
  filters: MentorFilters;
  qInput: string;
  onQInput: (v: string) => void;
  onChange: (patch: Partial<MentorFilters>) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  useEffect(() => { setDraft(filters); }, [filters]);

  const activeCount = activeFilterCount(filters) + (filters.sort !== "best" ? 1 : 0);
  const dirty = !!filters.q || !!qInput.trim() || activeCount > 0;

  const applyDraft = () => { onChange(draft); setOpen(false); };
  const clearAll = () => { setDraft(DEFAULT_FILTERS); onClear(); };

  return (
    <div className="trade-surface mentor-filters" role="search" aria-label={tr("جستجو و فیلتر مربی‌ها", "Search and filter mentors")}>
      <div className="mentor-search-row">
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
            placeholder={tr("مثلا کنکور، بدنسازی یا نام مربی", "For example: workout, nutrition or a mentor's name")}
            aria-label={tr("جستجوی نام، تخصص یا عنوان مربی", "Search by name, specialty or title")}
          />
          {qInput && (
            <button type="button" className="trade-icon-btn mentor-search-clear" onClick={() => onQInput("")} aria-label={tr("پاک کردن جستجو", "Clear search")}>
              <X size={14} {...IC} />
            </button>
          )}
        </label>
        <button
          type="button"
          className={`trade-cal-pill-btn mentor-filter-toggle${open || activeCount ? " on" : ""}`}
          aria-expanded={open}
          aria-controls="mentor-filter-panel"
          onClick={() => setOpen((o) => !o)}
        >
          <Filter size={15} {...IC} /> {tr("فیلتر", "Filter")}{activeCount ? ` (${faNum(activeCount)})` : ""}
        </button>
      </div>

      <MentorCollapse open={open} id="mentor-filter-panel">
        <div className="mentor-filter-grid">
          <SelectField label={tr("بخش", "Category")} value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} options={categoryOptions()} />
          <SelectField label={tr("ترتیب", "Sort by")} value={draft.sort} onChange={(v) => setDraft((d) => ({ ...d, sort: v as MentorSort }))} options={sortOptions()} />
          <SelectField label={tr("حداقل امتیاز", "Minimum rating")} value={String(draft.minRating)} onChange={(v) => setDraft((d) => ({ ...d, minRating: Number(v) }))} options={ratingOptions()} />
          <SelectField label={tr("زمان پاسخ", "Response time")} value={String(draft.maxResponse)} onChange={(v) => setDraft((d) => ({ ...d, maxResponse: Number(v) }))} options={responseOptions()} />
        </div>
        <div className="mentor-filter-checks">
          <CheckField label={tr("دارای مدرک", "Has certificate")} checked={draft.cert} onChange={(v) => setDraft((d) => ({ ...d, cert: v }))} />
          <CheckField label={tr("پذیرش باز", "Open for requests")} checked={draft.open} onChange={(v) => setDraft((d) => ({ ...d, open: v }))} />
        </div>
        <div className="mentor-filter-actions">
          {dirty && (
            <button type="button" className="mentor-text-btn" onClick={clearAll}>{tr("پاک کردن", "Clear")}</button>
          )}
          <button type="button" className="trade-primary-btn mentor-btn is-sm" onClick={applyDraft}>{tr("اعمال", "Apply")}</button>
        </div>
      </MentorCollapse>
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="mentor-filter-field">
      <span className="mentor-filter-label">{label}</span>
      <select className="wsearch-newform-name trade-glass-field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="auth-remember-label mentor-filter-check">
      <TickButton shape="square" size={22} checked={checked} onToggle={() => onChange(!checked)} />
      {label}
    </label>
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

function Results({ filters, allView, onClear, onBack }: { filters: MentorFilters; allView: boolean; onClear: () => void; onBack: () => void }) {
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
        const msg = await readApiError(res, tr("فهرست مربی‌ها دریافت نشد؛ دوباره تلاش کن", "Couldn't load mentors. Try again"));
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
      if (p === 1) setError(networkError()); else setMoreError(networkError());
    } finally {
      if (id === reqId.current) { setLoading(false); setMoreBusy(false); }
    }
  }, [key]);

  useEffect(() => { load(1); }, [load]);

  const stale = loading && mentors !== null;

  return (
    <>
      <button type="button" className="mentor-text-btn mentor-list-back" onClick={onBack}>
        <ArrowRight size={14} {...IC} className="dir-flip" /> {tr("بازگشت به ردیف‌ها", "Back to rows")}
      </button>
      <section className="trade-surface mentor-box">
      <MentorSectionTitle
        icon={<Users size={15} {...IC} />}
        action={stale ? <Spinner size={14} /> : undefined}
      >
        {defaultView && allView ? tr("همه‌ی مربی‌ها", "All mentors") : tr("نتیجه‌ها", "Results")}
      </MentorSectionTitle>

      {error ? (
        <MentorErrorState message={error} onRetry={() => load(1)} />
      ) : mentors === null ? (
        <LoadingBlock />
      ) : (
        <div className={`mentor-results${stale ? " is-stale" : ""}`} aria-busy={loading}>
          {mentors.length === 0 ? (
            defaultView ? (
              <MentorEmptyState icon={<Users size={24} {...IC} />} title={tr("هنوز مربی‌ای منتشر نشده است", "No mentors have been published yet")} />
            ) : (
              <div className="mentor-empty-search">
                <MentorEmpty icon={<SearchX size={16} {...IC} />}>
                  {filters.q ? tr(`مربی‌ای برای «${filters.q}» پیدا نشد`, `No mentors found for "${filters.q}"`) : tr("مربی‌ای با این فیلترها پیدا نشد", "No mentors match these filters")}
                </MentorEmpty>
                <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={onClear}>{tr("پاک کردن فیلترها", "Clear filters")}</button>
              </div>
            )
          ) : (
            <>
              <CardGrid key={shownKey ?? ""} mentors={mentors} from={(page - 1) * PAGE_SIZE} />
              {hasMore && (
                <div className="mentor-more mentor-more-col">
                  {moreError && <p className="mentor-field-error" role="alert">{moreError}</p>}
                  <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => load(page + 1)} disabled={moreBusy}>
                    {moreBusy ? <Spinner size={14} /> : moreError ? tr("تلاش دوباره", "Try again") : tr("مربی‌های بیشتر", "More mentors")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      </section>
    </>
  );
}

/** نمای پیش‌فرض: ذخیره‌شده‌ها (اگر بود) اول، بعد ردیف‌های افقی محبوب، تازه و هر حوزه (MentorCarousel) */
function Rows({
  onPopular, onNew, onCategory, onSaved,
}: {
  onPopular: () => void;
  onNew: () => void;
  onCategory: (c: MentorCategory) => void;
  onSaved: () => void;
}) {
  const saved = useSavedMentors();
  const [popular, setPopular] = useState<MentorCardData[] | null>(null);
  const [newcomers, setNewcomers] = useState<MentorCardData[]>([]);
  const [byCategory, setByCategory] = useState<Partial<Record<MentorCategory, MentorCardData[]>>>({});
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setPopular(null);
    const popularReq = fetch("/api/mentors/popular", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: MentorsPopularResponse) => {
        setPopular(d.mentors ?? []);
        setNewcomers(d.newcomers ?? []);
      });
    const catReqs = MENTOR_CATEGORIES.map((c) =>
      fetch(`/api/mentors?cat=${c}&page=1`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: MentorsListResponse) => setByCategory((prev) => ({ ...prev, [c]: d.mentors }))),
    );
    Promise.allSettled([popularReq, ...catReqs]).then((res) => {
      // فقط وقتی هیچ ردیفی نیامد خطا؛ ردیفی که نیامد صرفا پنهان می‌ماند
      if (res.every((r) => r.status === "rejected")) setFailed(true);
      setPopular((p) => p ?? []);
    });
  }, []);
  useEffect(load, [load]);

  if (failed) return <MentorErrorState message={tr("فهرست مربی‌ها دریافت نشد؛ دوباره تلاش کن", "Couldn't load mentors. Try again")} onRetry={load} />;
  if (popular === null) return <LoadingBlock />;

  const categoryRows = MENTOR_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0);
  if (popular.length === 0 && newcomers.length === 0 && categoryRows.length === 0) {
    return <MentorEmptyState icon={<Users size={24} {...IC} />} title={tr("هنوز مربی‌ای منتشر نشده است", "No mentors have been published yet")} />;
  }

  return (
    <>
      {!!saved?.cards?.length && (
        <MentorCarousel title={tr("مربی‌های ذخیره‌شده", "Saved mentors")} icon={<Bookmark size={15} {...IC} />} mentors={saved.cards} onViewAll={onSaved} />
      )}
      {popular.length > 0 && (
        <MentorCarousel title={tr("مربی‌های محبوب", "Popular mentors")} icon={<Star size={15} {...IC} />} mentors={popular} onViewAll={onPopular} />
      )}
      {newcomers.length > 0 && (
        <MentorCarousel title={tr("مربی‌های تازه", "New mentors")} icon={<Sparkles size={15} {...IC} />} mentors={newcomers} onViewAll={onNew} />
      )}
      {categoryRows.map((c) => (
        <MentorCarousel key={c} title={categoryRowTitle(c)} mentors={byCategory[c]!} onViewAll={() => onCategory(c)} />
      ))}
    </>
  );
}

function SavedView({ onBack }: { onBack: () => void }) {
  const saved = useSavedMentors();
  const back = (
    <button type="button" className="mentor-text-btn mentor-list-back" onClick={onBack}>
      <ArrowRight size={14} {...IC} className="dir-flip" /> {tr("بازگشت به ردیف‌ها", "Back to rows")}
    </button>
  );
  if (!saved) return null;
  const { cards, max, error, reload } = saved;
  return (
    <>
      {back}
      <section className="trade-surface mentor-box">
      <MentorSectionTitle icon={<Bookmark size={15} {...IC} />}>{tr("مربی‌های ذخیره‌شده", "Saved mentors")}</MentorSectionTitle>
      {error && !cards?.length ? (
        <MentorErrorState message={error} onRetry={reload} />
      ) : cards === null ? (
        <LoadingBlock />
      ) : cards.length === 0 ? (
        <MentorEmptyState
          icon={<Bookmark size={24} {...IC} />}
          title={tr("هنوز مربی‌ای ذخیره نکرده‌ای", "You haven't saved any mentors yet")}
          text={tr("با نشانک روی کارت هر مربی، او را این‌جا برای تصمیم بعدی نگه دار", "Tap the bookmark on a mentor's card to keep them here for later")}
        />
      ) : (
        <>
          <CardGrid mentors={cards} />
          {cards.length >= max && (
            <p className="mentor-muted mentor-saved-full">{tr(`به سقف ${faNum(max)} مربی ذخیره‌شده رسیده‌ای؛ برای ذخیره‌ی مربی دیگر، یکی را بردار`, `You've reached the limit of ${faNum(max)} saved mentors. Remove one to save another`)}</p>
          )}
        </>
      )}
      </section>
    </>
  );
}
