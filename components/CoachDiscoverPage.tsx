"use client";

import "./coach.css";
import "./coach-pages.css";
import "./coach-discover.css";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Search, SearchX, Users } from "lucide-react";
import { CoachPanelShell } from "./CoachPanelShell";
import { CoachDiscoverCard } from "./CoachDiscoverCard";
import { CoachEmpty } from "./CoachEmpty";
import { SegmentedTabs } from "./SegmentedTabs";
import { SavedMentorsProvider, useSavedMentors } from "./MentorSaved";
import { MentorPlatformNotice } from "./MentorPlatformNotice";
import { MentorDashError } from "./MentorDashKit";
import { PageLoader } from "./PageLoader";
import { Spinner } from "./Spinner";
import { useSection } from "./SectionProvider";
import { MENTOR_CATEGORIES, MENTOR_CATEGORY_META, isMentorCategory, restrictCategories, type MentorCategory } from "@/lib/mentorCategories";
import { SECTION_META } from "@/lib/sections";
import { SEARCH_QUERY_MAX } from "@/lib/mentorSearch";
import { networkError, readApiError } from "@/lib/mentorFormat";
import type { MentorCard, MentorsListResponse, MentorsPopularResponse } from "@/lib/mentorTypes";
import { tr, iso } from "@/lib/i18n";

const DEBOUNCE_MS = 300;

/** پیدا کردن مربی (/mentors): جست‌وجو، دسته‌های همین بخش، محبوب و تازه، نتیجه‌ها با «بیشتر» */
export function CoachDiscoverPage() {
  return (
    <CoachPanelShell title={tr("پیدا کردن مربی", "Find a mentor")} back={{ href: "/mentorship" }} nav={false} wide>
      <Suspense fallback={<PageLoader />}>
        <SavedMentorsProvider>
          <Discovery />
        </SavedMentorsProvider>
      </Suspense>
      <MentorPlatformNotice />
    </CoachPanelShell>
  );
}

function CardList({ mentors }: { mentors: MentorCard[] }) {
  return (
    <ul className="chd-grid">
      {mentors.map((m) => <li key={m.userId}><CoachDiscoverCard mentor={m} /></li>)}
    </ul>
  );
}

function Discovery() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const section = useSection();
  const cats = useMemo(
    () => restrictCategories(MENTOR_CATEGORIES, section ? SECTION_META[section].mentorCategories : null),
    [section],
  );

  const qParam = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, SEARCH_QUERY_MAX);
  const catRaw = sp.get("cat") ?? sp.get("category") ?? "";
  const cat = isMentorCategory(catRaw) && (cats as readonly string[]).includes(catRaw) ? (catRaw as MentorCategory) : "";

  const push = useCallback((q: string, c: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (c) p.set("cat", c);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname]);

  // جست‌وجو با تاخیر کوتاه؛ متن فیلد محلی است و با نشانی هم‌گام می‌ماند
  const [qInput, setQInput] = useState(qParam);
  const lastQ = useRef(qParam);
  useEffect(() => {
    if (qParam !== lastQ.current) { lastQ.current = qParam; setQInput(qParam); }
  }, [qParam]);
  useEffect(() => {
    const v = qInput.replace(/\s+/g, " ").trim().slice(0, SEARCH_QUERY_MAX);
    if (v === qParam) return;
    const t = setTimeout(() => { lastQ.current = v; push(v, cat); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [qInput, qParam, cat, push]);

  const searching = !!qParam || !!cat;

  return (
    <div className="ch-stack">
      <div className="chp-search">
        <input
          type="search" inputMode="search" enterKeyHint="search" className="trade-glass-field"
          value={qInput} maxLength={SEARCH_QUERY_MAX + 20} onChange={(e) => setQInput(e.target.value)}
          placeholder={tr("نام یا تخصص مربی", "Mentor name or specialty")} aria-label={tr("جست‌وجوی مربی", "Search mentors")}
        />
      </div>
      {cats.length > 1 && (
        <SegmentedTabs<string>
          active={cat} onChange={(v) => push(qParam, v)} ariaLabel={tr("دسته‌ی مربی", "Mentor category")}
          options={[{ value: "", label: tr("همه", "All") }, ...cats.map((c) => ({ value: c as string, label: MENTOR_CATEGORY_META[c].short }))]}
        />
      )}
      {searching ? <Results q={qParam} cat={cat} onClear={() => { lastQ.current = ""; setQInput(""); push("", ""); }} /> : <Showcase />}
    </div>
  );
}

/** نمای پیش‌فرض: ذخیره‌شده‌ها، محبوب، تازه */
function Showcase() {
  const saved = useSavedMentors();
  const [popular, setPopular] = useState<MentorCard[] | null>(null);
  const [fresh, setFresh] = useState<MentorCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/mentors/popular", { cache: "no-store" });
      if (!res.ok) { setError(await readApiError(res, tr("فهرست مربی‌ها دریافت نشد؛ دوباره تلاش کن", "Couldn't load mentors. Try again"))); setPopular([]); return; }
      const d: MentorsPopularResponse = await res.json();
      setPopular(d.mentors ?? []);
      setFresh(d.newcomers ?? []);
    } catch {
      setError(networkError());
      setPopular([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (popular === null) return <PageLoader />;
  if (error && popular.length === 0) return <MentorDashError message={error} onRetry={load} />;
  const savedCards = saved?.cards ?? [];
  if (popular.length === 0 && fresh.length === 0 && savedCards.length === 0) {
    return <CoachEmpty icon={<Users size={28} aria-hidden="true" />} text={tr("هنوز مربی‌ای منتشر نشده", "No mentors have been published yet")} />;
  }
  return (
    <>
      {savedCards.length > 0 && (
        <section className="chd-section">
          <h2 className="ch-section-title"><Bookmark size={13} aria-hidden="true" /> {tr("ذخیره‌شده‌ها", "Saved")}</h2>
          <CardList mentors={savedCards} />
        </section>
      )}
      {popular.length > 0 && (
        <section className="chd-section">
          <h2 className="ch-section-title">{tr("محبوب", "Popular")}</h2>
          <CardList mentors={popular} />
        </section>
      )}
      {fresh.length > 0 && (
        <section className="chd-section">
          <h2 className="ch-section-title">{tr("تازه", "New")}</h2>
          <CardList mentors={fresh} />
        </section>
      )}
    </>
  );
}

function Results({ q, cat, onClear }: { q: string; cat: string; onClear: () => void }) {
  const key = `${q}|${cat}`;
  const [mentors, setMentors] = useState<MentorCard[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (p: number) => {
    const id = ++reqId.current;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("cat", cat);
    params.set("page", String(p));
    if (p === 1) { setMentors(null); setError(null); } else { setMoreBusy(true); setMoreError(null); }
    try {
      const res = await fetch(`/api/mentors?${params}`, { cache: "no-store" });
      if (id !== reqId.current) return;
      if (!res.ok) {
        const msg = await readApiError(res, tr("فهرست مربی‌ها دریافت نشد؛ دوباره تلاش کن", "Couldn't load mentors. Try again"));
        if (p === 1) setError(msg); else setMoreError(msg);
        return;
      }
      const d: MentorsListResponse = await res.json();
      if (id !== reqId.current) return;
      setMentors((prev) => (p === 1 ? d.mentors : [...(prev ?? []), ...d.mentors.filter((m) => !(prev ?? []).some((x) => x.userId === m.userId))]));
      setHasMore(!!d.hasMore);
      setPage(p);
    } catch {
      if (id !== reqId.current) return;
      if (p === 1) setError(networkError()); else setMoreError(networkError());
    } finally {
      if (id === reqId.current) setMoreBusy(false);
    }
  }, [q, cat]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, [key]);

  if (error) return <MentorDashError message={error} onRetry={() => load(1)} />;
  if (mentors === null) return <PageLoader />;
  if (mentors.length === 0) {
    return (
      <CoachEmpty
        icon={<SearchX size={28} aria-hidden="true" />}
        text={q ? tr(`مربی‌ای برای «${q}» پیدا نشد`, `No mentors found for "${iso(q)}"`) : tr("مربی‌ای در این دسته نیست", "No mentors in this category")}
        action={<button type="button" className="btn btn-ghost" onClick={onClear}><Search size={16} aria-hidden="true" /> {tr("پاک کردن جست‌وجو", "Clear search")}</button>}
      />
    );
  }
  return (
    <>
      <CardList mentors={mentors} />
      {hasMore && (
        <div className="chd-more">
          <div className="ch-stack">
            {moreError && <p className="chpf-error" role="alert">{moreError}</p>}
            <button type="button" className="btn btn-ghost" onClick={() => load(page + 1)} disabled={moreBusy}>
              {moreBusy ? <Spinner size={14} /> : moreError ? tr("تلاش دوباره", "Try again") : tr("بیشتر", "More")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
