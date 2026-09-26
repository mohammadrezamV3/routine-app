"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Loader2, Search, UserSearch } from "lucide-react";
import { MentorPageShell, MentorErrorState } from "@/components/MentorPageShell";
import { MentorCard } from "@/components/MentorCard";
import { LoadingBlock } from "@/components/Spinner";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META } from "@/lib/mentorCategories";
import type { MentorCard as MentorCardData, MentorsListResponse, MentorsPopularResponse } from "@/lib/mentorTypes";
import { NETWORK_ERROR, readApiError } from "@/lib/mentorFormat";

type Sort = "popular" | "rating" | "new";
const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "محبوب‌ترین" },
  { value: "rating", label: "بالاترین امتیاز" },
  { value: "new", label: "تازه‌ترین" },
];

// کشفِ منتور — جست‌وجو، فیلترِ دسته، مرتب‌سازی، و بخشِ «منتورهای محبوب» (که
// رتبه‌اش سمتِ سرور از چند سیگنال ساخته می‌شود، نه صرفا تعداد شاگرد).
export default function MentorsDiscoveryPage() {
  return (
    <MentorPageShell
      title="منتورها"
      titleAction={<Link href="/mentorship" className="trade-title-add-btn">منتورهای من</Link>}
    >
      <Discovery />
    </MentorPageShell>
  );
}

function Discovery() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [sort, setSort] = useState<Sort>("popular");
  const [page, setPage] = useState(1);
  const [mentors, setMentors] = useState<MentorCardData[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [popular, setPopular] = useState<MentorCardData[] | null>(null);
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
        const msg = await readApiError(res, "لیستِ منتورها بارگذاری نشد");
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
      .then((d: MentorsPopularResponse | null) => setPopular(d?.mentors ?? []))
      .catch(() => setPopular([]));
  }, []);
  useEffect(() => { loadPopular(); }, [loadPopular]);

  const filtered = !!q || !!category;

  return (
    <>
      <p className="mentor-muted" style={{ margin: "0 0 10px" }}>
        منتورها کاربرانِ مستقلِ آریون‌اند. نشانِ «تأییدشده» یعنی هویت یا مدرکشان توسطِ تیمِ آریون بررسی شده.
      </p>

      <div className="mentor-filter">
        <div className="mentor-filter-row">
          <label className="mentor-search">
            <Search size={15} />
            <input
              className="wsearch-newform-name trade-glass-field"
              type="search"
              value={qInput}
              maxLength={80}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="جست‌وجوی نام، تخصص یا عنوان…"
              aria-label="جست‌وجوی منتور"
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
        <div className="trade-tag-row" role="group" aria-label="دسته">
          <button type="button" className={`trade-tag-chip${category === "" ? " active" : ""}`} onClick={() => setCategory("")}>همه</button>
          {MENTOR_CATEGORIES.map((c) => (
            <button key={c} type="button" className={`trade-tag-chip${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
              {MENTOR_CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </div>

      {!filtered && popular && popular.length > 0 && (
        <>
          <h2 className="mentor-section-title"><Flame size={16} /> منتورهای محبوب</h2>
          <div className="mentor-popular-row">
            {popular.map((m) => <MentorCard key={m.userId} mentor={m} />)}
          </div>
        </>
      )}

      <h2 className="mentor-section-title">
        <UserSearch size={16} /> {filtered ? "نتایج" : "همه‌ی منتورها"}
      </h2>

      {error ? (
        <MentorErrorState message={error} onRetry={() => load(1)} />
      ) : mentors === null ? (
        <LoadingBlock />
      ) : mentors.length === 0 ? (
        <div className="trade-surface trade-empty-state">
          <UserSearch size={30} />
          <p>{filtered ? "منتوری با این مشخصات پیدا نشد. عبارت یا دسته را عوض کن." : "هنوز منتورِ منتشرشده‌ای وجود ندارد."}</p>
          {filtered && (
            <button type="button" className="account-outline-btn" onClick={() => { setQInput(""); setQ(""); setCategory(""); }}>
              پاک‌کردنِ فیلترها
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mentor-grid">
            {mentors.map((m) => <MentorCard key={m.userId} mentor={m} />)}
          </div>
          {moreError && <div className="trade-form-error" style={{ textAlign: "center" }}>{moreError}</div>}
          {hasMore && (
            <div className="mentor-more">
              <button type="button" className="account-outline-btn" onClick={() => load(page + 1)} disabled={moreBusy}>
                {moreBusy ? <Loader2 size={15} className="trade-spin" /> : moreError ? "تلاش دوباره" : "بیشتر"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
