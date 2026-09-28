"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, Flag, Lock, RefreshCw, RotateCcw, Star } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { Spinner } from "@/components/Spinner";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";

type PublicUser = { id: string; name: string | null; lastName: string | null; username: string | null; avatarUrl: string | null };
type Review = {
  id: string; rating: number; body: string | null; status: "VISIBLE" | "HIDDEN"; hiddenReason: string | null;
  createdAt: string; updatedAt: string; mentor: PublicUser; mentorProfileId: string | null; student: PublicUser; openReports: number;
};
type Data = { reviews: Review[]; total: number; pageSize: number; counts: Record<Tab, number> };

type Tab = "VISIBLE" | "HIDDEN" | "reported";
const TABS: { key: Tab; label: string }[] = [
  { key: "VISIBLE", label: "نمایش داده‌شده" },
  { key: "reported", label: "گزارش‌شده" },
  { key: "HIDDEN", label: "پنهان‌شده" },
];
const EMPTY_LABELS: Record<Tab, string> = {
  VISIBLE: "نظری نمایش داده نمی‌شود",
  reported: "نظر گزارش‌شده‌ای نیست",
  HIDDEN: "نظر پنهان‌شده‌ای نیست",
};
const IS = { size: 14, strokeWidth: 1.75 } as const;

const ROW_LINE: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" };

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, color: "var(--adm-amber)" }} role="img" aria-label={`${formatNumber(n)} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={i <= n ? "currentColor" : "none"} strokeWidth={1.75} aria-hidden />)}
    </span>
  );
}

// نظرهای شاگردها درباره‌ی منتورها — پنهان/بازگردانی با دلیل. پنهان‌کردن
// خلاصه‌ی امتیازِ منتور رو هم (سمت سرور) بازمحاسبه می‌کنه.
export default function AdminMentorReviewsPage() {
  const toast = useAdminToast();
  const { data: session } = useSession();
  const viewerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const [tab, setTab] = useState<Tab>("VISIBLE");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [acting, setActing] = useState<{ review: Review; to: "VISIBLE" | "HIDDEN" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetch(`/api/admin/mentors/reviews?status=${tab}&page=${page}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => setData(d))
      .catch(() => { setFailed(true); setData(null); })
      .finally(() => setLoading(false));
  }, [tab, page]);
  useEffect(load, [load]);

  const rows = data?.reviews || [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const tabItems = TABS.map((t) => ({ key: t.key, label: data?.counts?.[t.key] ? `${t.label} (${formatNumber(data.counts[t.key])})` : t.label }));

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">نظرات مربی‌ها</div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => { setTab(k); setPage(1); }} />

      {!data ? (
        loading ? (
          <div className="admin-empty is-loading" role="status" aria-label="در حال دریافت" />
        ) : failed ? (
          <div className="admin-empty">
            <span>نظرها دریافت نشد</span>
            <button type="button" className="admin-btn" onClick={load}><RefreshCw {...IS} aria-hidden /> تلاش دوباره</button>
          </div>
        ) : null
      ) : rows.length === 0 ? (
        <EmptyState message={EMPTY_LABELS[tab]} />
      ) : (
        <>
          <div className="trade-list" style={{ opacity: loading ? 0.6 : 1 }}>
            {rows.map((r) => {
              const isSelf = !!viewerId && viewerId === r.mentor.id;
              return (
                <div key={r.id} className="trade-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div style={ROW_LINE}>
                    <span className="trade-row-sub">
                      {r.mentorProfileId
                        ? <Link href={`/admin/mentors/${r.mentorProfileId}`} className="admin-link">{displayName(r.mentor)}</Link>
                        : displayName(r.mentor)}
                      {"؛ از "}{displayName(r.student)}
                    </span>
                    <span className="admin-badge-row">
                      {r.openReports > 0 && (
                        <span className="admin-badge amber"><Flag size={13} strokeWidth={1.75} aria-hidden />{formatNumber(r.openReports)} گزارش باز</span>
                      )}
                      {r.status === "VISIBLE"
                        ? <span className="admin-badge green"><Eye size={13} strokeWidth={1.75} aria-hidden />نمایش</span>
                        : <span className="admin-badge gray"><EyeOff size={13} strokeWidth={1.75} aria-hidden />پنهان</span>}
                    </span>
                  </div>
                  <Stars n={r.rating} />
                  <div className="trade-row-main" style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.9 }}>{r.body || <span className="admin-muted">بدون متن</span>}</div>
                  {r.status === "HIDDEN" && r.hiddenReason && <div className="trade-row-sub">دلیل پنهان شدن: {r.hiddenReason}</div>}
                  <div style={ROW_LINE}>
                    <span className="trade-row-sub admin-ltr">{formatDateTime(r.createdAt)}</span>
                    {isSelf ? (
                      <span className="trade-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Lock size={13} strokeWidth={1.75} aria-hidden />نظر درباره‌ی خودت؛ اقدام با ادمین دیگر
                      </span>
                    ) : r.status === "VISIBLE" ? (
                      <button type="button" className="admin-btn danger" onClick={() => setActing({ review: r, to: "HIDDEN" })}>
                        <EyeOff {...IS} aria-hidden /> پنهان کردن
                      </button>
                    ) : (
                      <button type="button" className="admin-btn" onClick={() => setActing({ review: r, to: "VISIBLE" })}>
                        <RotateCcw {...IS} aria-hidden /> بازگردانی
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <AdminPagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {acting && (
        <ReviewActionModal
          review={acting.review} to={acting.to}
          onClose={() => setActing(null)}
          onDone={(msg) => { setActing(null); toast(msg); load(); }}
        />
      )}
    </section>
  );
}

function ReviewActionModal({ review, to, onClose, onDone }: { review: Review; to: "VISIBLE" | "HIDDEN"; onClose: () => void; onDone: (msg: string) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiding = to === "HIDDEN";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/mentors/reviews/${review.id}`, { method: "PATCH", json: { status: to, reason: reason.trim() || undefined } });
      onDone(hiding ? "نظر پنهان شد" : "نظر بازگردانی شد");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={hiding ? "پنهان کردن نظر" : "بازگردانی نظر"} eyebrow="تأیید اقدام" onClose={onClose}>
      <div className="admin-modal-text" style={{ whiteSpace: "pre-wrap" }}>
        {review.body || <span className="admin-muted">بدون متن</span>}
      </div>
      <label className="admin-field">
        <span>{hiding ? "دلیل پنهان کردن" : "توضیح (اختیاری)"}</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} autoFocus />
      </label>
      {error && <div className="admin-form-error">{error}</div>}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button
          type="button" className={`admin-btn ${hiding ? "danger" : "primary"}`}
          disabled={busy || (hiding && !reason.trim())} onClick={submit} aria-busy={busy}
        >
          {busy ? <Spinner size={14} /> : hiding ? "پنهان کردن" : "بازگردانی"}
        </button>
      </div>
    </AdminModal>
  );
}
