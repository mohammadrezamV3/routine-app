"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowRight, Search, SearchX, SlidersHorizontal, Sparkles, Star, Users } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorEmptyState, MentorSectionTitle } from "@/components/MentorUI";
import { MentorCard } from "@/components/MentorCard";
import { MentorCarousel } from "@/components/MentorCarousel";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, isMentorCategory, type MentorCategory } from "@/lib/mentorCategories";
import type { MentorCard as MentorCardData, MentorsListResponse, MentorsPopularResponse } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";
import { faNum } from "@/lib/jalali";

type Sort = "best" | "rating" | "new";
const SORTS: { value: Sort; label: string }[] = [
  { value: "best", label: "بهترین نتیجه" },
  { value: "rating", label: "بالاترین امتیاز" },
  { value: "new", label: "تازه‌ترین" },
];
// توضیحِ یک‌خطیِ هر ترتیب (مدلِ کامل: docs/mentor-ranking.md)
const SORT_NOTES: Record<Sort, string | null> = {
  best: "ترتیب بر اساس نتیجه‌ی واقعی شاگردها، پایبندی، ماندگاری و نظرهای تأییدشده",
  rating: "فقط نظر شاگردهایی شمرده می‌شود که دست‌کم دو هفته با منتور کار کرده و برنامه‌ای را شروع کرده‌اند",
  new: null,
};

// «مشاهده همه»ی هر ردیف: popular | new | یکی از حوزه‌ها (?view=...)
type View = "popular" | "new" | MentorCategory;
function parseView(v: string | null): View | null {
  if (v === "popular" || v === "new") return v;
  return isMentorCategory(v) ? v : null;
}
const categoryRowTitle = (c: MentorCategory) => `منتورهای ${MENTOR_CATEGORY_META[c].label}`;
function viewTitle(v: View): string {
  if (v === "popular") return "منتورهای محبوب";
  if (v === "new") return "منتورهای تازه";
  return categoryRowTitle(v);
}

type Filters = { category: string; sort: Sort; verified: boolean; accepting: boolean };
const NO_FILTERS: Filters = { category: "", sort: "best", verified: false, accepting: false };

// «پیدا کردن منتور»: جست‌وجو + فیلتر، و زیرش ردیف‌های افقی (محبوب، تازه، و
// یک ردیف برای هر حوزه). هر ردیف «مشاهده همه» دارد که فهرستِ کاملِ همان
// ردیف را با صفحه‌بندی باز می‌کند. با جست‌وجو/فیلتر، ردیف‌ها جایشان را به
// نتیجه‌ی جست‌وجو می‌دهند. «منتورهای محبوب» رتبه‌ی شایستگیِ سمتِ سرور است
// (lib/mentorRanking.ts) و «منتورهای تازه» جایگاهِ جدای خودش را دارد.
export default function MentorsDiscoveryPage() {
  return (
    <MentorPageShell title="پیدا کردن منتور">
      <Suspense fallback={<LoadingBlock />}>
        <Discovery />
      </Suspense>
    </MentorPageShell>
  );
}

function Discovery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view"));

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // جست‌وجو با تأخیرِ کوتاه — هر حرف یک درخواست نمی‌شود
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const activeFilterCount =
    (filters.category ? 1 : 0) + (filters.sort !== "best" ? 1 : 0) + (filters.verified ? 1 : 0) + (filters.accepting ? 1 : 0);
  const listMode = !!view || !!q || activeFilterCount > 0;

  const openView = (v: View) => {
    router.push(`${pathname}?view=${v}`);
    window.scrollTo({ top: 0 });
  };
  const closeView = () => router.push(pathname);
  const clearAll = () => { setQInput(""); setQ(""); setFilters(NO_FILTERS); };

  // پارامترهای فهرست: فیلترهای کاربر، و اگر از «مشاهده همه» آمده، پیش‌فرضِ همان ردیف
  const listCategory = filters.category || (view && isMentorCategory(view) ? view : "");
  const listSort: Sort = filters.sort !== "best" ? filters.sort : view === "new" ? "new" : "best";

  return (
    <>
      <div className="mentor-filter">
        <div className="mentor-filter-row">
          <label className="mentor-search">
            <Search size={16} strokeWidth={1.75} aria-hidden />
            <input
              className="wsearch-newform-name trade-glass-field"
              type="search"
              value={qInput}
              maxLength={80}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="نام، تخصص یا عنوان منتور"
              aria-label="جست‌وجوی نام، تخصص یا عنوان منتور"
            />
          </label>
          <button
            type="button"
            className={`account-outline-btn mentor-btn mentor-filter-btn${activeFilterCount ? "" : " muted"}`}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            aria-controls="mentor-filter-panel"
          >
            <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden />
            فیلتر
            {activeFilterCount > 0 && <span className="mentor-filter-count">{faNum(activeFilterCount)}</span>}
          </button>
        </div>

        {filterOpen && (
          <FilterPanel
            value={filters}
            onChange={setFilters}
            onClear={() => setFilters(NO_FILTERS)}
          />
        )}
      </div>

      {listMode ? (
        <MentorList
          key={`${view ?? ""}|${q}|${listCategory}|${listSort}|${filters.verified}|${filters.accepting}`}
          title={view ? viewTitle(view) : "نتیجه‌ی جست‌وجو"}
          onBack={view ? closeView : undefined}
          q={q}
          category={listCategory}
          sort={listSort}
          verified={filters.verified}
          accepting={filters.accepting}
          filtered={!!q || activeFilterCount > 0}
          onClear={clearAll}
        />
      ) : (
        <Rows onViewAll={openView} />
      )}
    </>
  );
}

// ───────────────────────── فیلتر ─────────────────────────

function FilterPanel({ value, onChange, onClear }: { value: Filters; onChange: (f: Filters) => void; onClear: () => void }) {
  const set = (p: Partial<Filters>) => onChange({ ...value, ...p });
  return (
    <div id="mentor-filter-panel" className="trade-surface mentor-filter-panel">
      <div className="mentor-field">
        <span className="mentor-field-label">حوزه</span>
        <SegmentedTabs
          options={[{ value: "", label: "همه" }, ...MENTOR_CATEGORIES.map((c) => ({ value: c as string, label: MENTOR_CATEGORY_META[c].short }))]}
          active={value.category}
          onChange={(category) => set({ category })}
        />
      </div>
      <div className="mentor-field">
        <span className="mentor-field-label">مرتب‌سازی</span>
        <SegmentedTabs options={SORTS} active={value.sort} onChange={(sort) => set({ sort })} />
        {SORT_NOTES[value.sort] && <p className="mentor-muted">{SORT_NOTES[value.sort]}</p>}
      </div>
      <div>
        <div className="mentor-toggle-row">
          <div className="mentor-toggle-text">
            <div className="mentor-toggle-title">فقط هویت تأییدشده</div>
            <div className="mentor-toggle-desc">منتورهایی که ادمین‌های آریون مدرک شناسایی‌شان را بررسی کرده‌اند</div>
          </div>
          <ToggleSwitch checked={value.verified} onChange={(verified) => set({ verified })} label="فقط هویت تأییدشده" />
        </div>
        <div className="mentor-toggle-row">
          <div className="mentor-toggle-text">
            <div className="mentor-toggle-title">فقط کسانی که شاگرد می‌پذیرند</div>
            <div className="mentor-toggle-desc">منتورهایی که پذیرش شاگرد جدیدشان باز است</div>
          </div>
          <ToggleSwitch checked={value.accepting} onChange={(accepting) => set({ accepting })} label="فقط کسانی که شاگرد می‌پذیرند" />
        </div>
      </div>
      <div className="mentor-btn-group is-end">
        <button type="button" className="mentor-text-btn" onClick={onClear}>پاک کردن فیلترها</button>
      </div>
    </div>
  );
}

// ───────────────────────── ردیف‌ها ─────────────────────────

function Rows({ onViewAll }: { onViewAll: (v: View) => void }) {
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
      fetch(`/api/mentors?category=${c}&sort=best&page=1`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: MentorsListResponse) => setByCategory((prev) => ({ ...prev, [c]: d.mentors }))),
    );
    Promise.allSettled([popularReq, ...catReqs]).then((res) => {
      // فقط وقتی هیچ ردیفی نیامد خطا نشان بده؛ ردیفی که نیامد صرفاً پنهان می‌ماند
      if (res.every((r) => r.status === "rejected")) setFailed(true);
      setPopular((p) => p ?? []);
    });
  }, []);
  useEffect(load, [load]);

  if (failed) return <MentorErrorState message="فهرست منتورها دریافت نشد؛ دوباره تلاش کن" onRetry={load} />;
  if (popular === null) return <LoadingBlock />;

  const categoryRows = MENTOR_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0);
  if (popular.length === 0 && newcomers.length === 0 && categoryRows.length === 0) {
    return <MentorEmptyState icon={<Users size={24} strokeWidth={1.75} aria-hidden />} title="هنوز منتوری منتشر نشده است" />;
  }

  return (
    <>
      {popular.length > 0 && (
        <MentorCarousel
          title="منتورهای محبوب"
          icon={<Star size={15} strokeWidth={1.75} aria-hidden />}
          mentors={popular}
          onViewAll={() => onViewAll("popular")}
        />
      )}
      {newcomers.length > 0 && (
        <MentorCarousel
          title="منتورهای تازه"
          icon={<Sparkles size={15} strokeWidth={1.75} aria-hidden />}
          note="منتورهای تأییدشده‌ای که هنوز سابقه‌ی کافی برای رتبه‌بندی ندارند"
          mentors={newcomers}
          onViewAll={() => onViewAll("new")}
        />
      )}
      {categoryRows.map((c) => (
        <MentorCarousel
          key={c}
          title={categoryRowTitle(c)}
          mentors={byCategory[c]!}
          onViewAll={() => onViewAll(c)}
        />
      ))}
    </>
  );
}

// ───────────────────────── فهرستِ کامل (مشاهده همه / جست‌وجو) ─────────────────────────

function MentorList({
  title, onBack, q, category, sort, verified, accepting, filtered, onClear,
}: {
  title: string;
  onBack?: () => void;
  q: string;
  category: string;
  sort: Sort;
  verified: boolean;
  accepting: boolean;
  filtered: boolean;
  onClear: () => void;
}) {
  const [page, setPage] = useState(1);
  const [mentors, setMentors] = useState<MentorCardData[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (p: number) => {
    const id = ++reqId.current;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    params.set("sort", sort);
    if (verified) params.set("verified", "1");
    if (accepting) params.set("accepting", "1");
    params.set("page", String(p));
    if (p === 1) { setMentors(null); setError(null); } else { setMoreBusy(true); setMoreError(null); }
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
      setHasMore(!!data.hasMore);
      setPage(p);
    } catch {
      if (id !== reqId.current) return;
      if (p === 1) setError(NETWORK_ERROR); else setMoreError(NETWORK_ERROR);
    } finally {
      if (id === reqId.current) setMoreBusy(false);
    }
  }, [q, category, sort, verified, accepting]);

  useEffect(() => { load(1); }, [load]);

  return (
    <>
      {onBack && (
        <button type="button" className="mentor-text-btn mentor-list-back" onClick={onBack}>
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden /> بازگشت به همه‌ی ردیف‌ها
        </button>
      )}
      <MentorSectionTitle icon={<Users size={15} strokeWidth={1.75} aria-hidden />}>{title}</MentorSectionTitle>
      {SORT_NOTES[sort] && <p className="mentor-muted mentor-section-note">{SORT_NOTES[sort]}</p>}

      {error ? (
        <MentorErrorState message={error} onRetry={() => load(1)} />
      ) : mentors === null ? (
        <LoadingBlock />
      ) : mentors.length === 0 ? (
        filtered ? (
          <>
            <MentorEmpty icon={<SearchX size={16} strokeWidth={1.75} aria-hidden />}>منتوری با این فیلتر پیدا نشد</MentorEmpty>
            <div className="mentor-more mentor-more-tight">
              <button type="button" className="mentor-text-btn" onClick={onClear}>پاک کردن فیلترها</button>
            </div>
          </>
        ) : (
          <MentorEmptyState icon={<Users size={24} strokeWidth={1.75} aria-hidden />} title="هنوز منتوری در این بخش نیست" />
        )
      ) : (
        <>
          <div className="mentor-grid">
            {mentors.map((m) => <MentorCard key={m.userId} mentor={m} />)}
          </div>
          {hasMore && (
            <div className="mentor-more mentor-more-stack">
              {moreError && <p className="mentor-field-error" role="alert">{moreError}</p>}
              <button type="button" className="account-outline-btn mentor-btn is-sm" onClick={() => load(page + 1)} disabled={moreBusy}>
                {moreBusy ? <Spinner size={14} /> : moreError ? "تلاش دوباره" : "منتورهای بیشتر"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
