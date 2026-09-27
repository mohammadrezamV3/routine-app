"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, SearchX, Sparkles, Star, Users } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorEmpty, MentorEmptyState, MentorSectionTitle } from "@/components/MentorUI";
import { MentorCard } from "@/components/MentorCard";
import { LoadingBlock, Spinner } from "@/components/Spinner";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META } from "@/lib/mentorCategories";
import type { MentorCard as MentorCardData, MentorsListResponse, MentorsPopularResponse } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";

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

// انتخابِ منتور: جست‌وجو، فیلترِ دسته، مرتب‌سازی، «منتورهای محبوب» (رتبه‌ی
// شایستگیِ سمتِ سرور — lib/mentorRanking.ts) و جایگاهِ جدای «منتورهای تازه».
export default function MentorsDiscoveryPage() {
  return (
    <MentorPageShell title="انتخاب منتور">
      <Discovery />
    </MentorPageShell>
  );
}

function Discovery() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [sort, setSort] = useState<Sort>("best");
  const [page, setPage] = useState(1);
  const [mentors, setMentors] = useState<MentorCardData[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [popular, setPopular] = useState<MentorCardData[] | null>(null);
  const [newcomers, setNewcomers] = useState<MentorCardData[]>([]);
  const reqId = useRef(0);

  // جست‌وجو با تأخیرِ کوتاه — هر حرف یک درخواست نمی‌شود
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async (p: number) => {
    const id = ++reqId.current;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    params.set("sort", sort);
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
  }, [q, category, sort]);

  useEffect(() => { load(1); }, [load]);

  const loadPopular = useCallback(() => {
    fetch("/api/mentors/popular", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MentorsPopularResponse | null) => {
        setPopular(d?.mentors ?? []);
        setNewcomers(d?.newcomers ?? []);
      })
      .catch(() => setPopular([]));
  }, []);
  useEffect(() => { loadPopular(); }, [loadPopular]);

  const filtered = !!q || !!category;
  const clearFilters = () => { setQInput(""); setQ(""); setCategory(""); };

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
              placeholder="مثلاً برنامه‌ریزی کنکور"
              aria-label="جست‌وجوی نام، تخصص یا عنوان منتور"
            />
          </label>
          <select
            className="wsearch-newform-name trade-glass-field mentor-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="مرتب‌سازی"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="trade-tag-row" role="group" aria-label="حوزه">
          <button type="button" className={`trade-tag-chip${category === "" ? " active" : ""}`} aria-pressed={category === ""} onClick={() => setCategory("")}>همه</button>
          {MENTOR_CATEGORIES.map((c) => (
            <button key={c} type="button" className={`trade-tag-chip${category === c ? " active" : ""}`} aria-pressed={category === c} onClick={() => setCategory(c)}>
              {MENTOR_CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </div>

      {!filtered && popular && popular.length > 0 && (
        <>
          <MentorSectionTitle icon={<Star size={15} strokeWidth={1.75} aria-hidden />}>منتورهای محبوب</MentorSectionTitle>
          <div className="mentor-popular-row">
            {popular.map((m) => <MentorCard key={m.userId} mentor={m} />)}
          </div>
        </>
      )}

      {!filtered && newcomers.length > 0 && (
        <>
          <MentorSectionTitle icon={<Sparkles size={15} strokeWidth={1.75} aria-hidden />}>منتورهای تازه</MentorSectionTitle>
          <p className="mentor-muted mentor-section-note">منتورهای تأییدشده‌ای که هنوز سابقه‌ی کافی برای رتبه‌بندی ندارند</p>
          <div className="mentor-popular-row">
            {newcomers.map((m) => <MentorCard key={m.userId} mentor={m} />)}
          </div>
        </>
      )}

      <MentorSectionTitle icon={<Users size={15} strokeWidth={1.75} aria-hidden />}>
        {filtered ? "نتیجه‌ی جست‌وجو" : "همه‌ی منتورها"}
      </MentorSectionTitle>
      {SORT_NOTES[sort] && <p className="mentor-muted mentor-section-note">{SORT_NOTES[sort]}</p>}

      {error ? (
        <MentorErrorState message={error} onRetry={() => load(1)} />
      ) : mentors === null ? (
        <LoadingBlock />
      ) : mentors.length === 0 ? (
        filtered ? (
          <>
            <MentorEmpty icon={<SearchX size={16} strokeWidth={1.75} aria-hidden />}>منتوری با این فیلتر پیدا نشد</MentorEmpty>
            <div className="mentor-more" style={{ marginTop: 0 }}>
              <button type="button" className="mentor-text-btn" onClick={clearFilters}>پاک کردن فیلترها</button>
            </div>
          </>
        ) : (
          <MentorEmptyState icon={<Users size={24} strokeWidth={1.75} aria-hidden />} title="هنوز منتوری منتشر نشده است" />
        )
      ) : (
        <>
          <div className="mentor-grid">
            {mentors.map((m) => <MentorCard key={m.userId} mentor={m} />)}
          </div>
          {hasMore && (
            <div className="mentor-more" style={{ flexDirection: "column", alignItems: "center", gap: 8 }}>
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
