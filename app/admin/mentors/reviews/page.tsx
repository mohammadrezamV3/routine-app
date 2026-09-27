"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EyeOff, RotateCcw, Star } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminPagination } from "@/components/admin/Pagination";
import { AdminTabBar } from "@/components/admin/TabBar";
import { displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
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

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, color: "var(--adm-amber)" }} aria-label={`${n} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} fill={i <= n ? "currentColor" : "none"} strokeWidth={1.6} />)}
    </span>
  );
}

// نظرهای شاگردها درباره‌ی منتورها — پنهان/بازگردانی با دلیل. پنهان‌کردن
// خلاصه‌ی امتیازِ منتور رو هم (سمت سرور) بازمحاسبه می‌کنه.
export default function AdminMentorReviewsPage() {
  const toast = useAdminToast();
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
          <div className="admin-page-kicker">نظرات منتورها</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            نظرِ پنهان‌شده نه در پروفایل دیده می‌شه نه در امتیازِ منتور حساب می‌شه.
          </div>
        </div>
      </div>

      <AdminTabBar items={tabItems} active={tab} onChange={(k) => { setTab(k); setPage(1); }} />

      {!data ? (
        <div className={loading ? "admin-empty is-loading" : "admin-empty"}>
          {loading ? "در حال بارگذاری…" : "خطا در دریافت اطلاعات"}
          {!loading && failed && <button type="button" className="admin-btn" style={{ marginTop: 10 }} onClick={load}>تلاش دوباره</button>}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="نظری در این دسته نیست" />
      ) : (
        <>
          <div className="trade-list" style={{ opacity: loading ? 0.6 : 1 }}>
            {rows.map((r) => (
              <div key={r.id} className="trade-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span className="trade-row-sub">
                    منتور:{" "}
                    {r.mentorProfileId
                      ? <Link href={`/admin/mentors/${r.mentorProfileId}`} style={{ color: "var(--adm-accent)" }}>{displayName(r.mentor)}</Link>
                      : displayName(r.mentor)}
                    {" "}· نویسنده: {displayName(r.student)}
                  </span>
                  <span className="admin-badge-row">
                    {r.openReports > 0 && <span className="admin-badge amber">{formatNumber(r.openReports)} گزارش باز</span>}
                    <span className={`admin-badge ${r.status === "VISIBLE" ? "green" : "gray"}`}>{r.status === "VISIBLE" ? "نمایش" : "پنهان"}</span>
                  </span>
                </div>
                <Stars n={r.rating} />
                <div className="trade-row-main" style={{ whiteSpace: "pre-wrap" }}>{r.body || <span className="admin-muted">بدون متن</span>}</div>
                {r.status === "HIDDEN" && r.hiddenReason && <div className="trade-row-sub">دلیل پنهان‌شدن: {r.hiddenReason}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="trade-row-sub" style={{ direction: "ltr" }}>{formatDateTime(r.createdAt)}</span>
                  {r.status === "VISIBLE"
                    ? <button type="button" className="admin-btn danger" onClick={() => setActing({ review: r, to: "HIDDEN" })}><EyeOff size={14} /> پنهان کردن</button>
                    : <button type="button" className="admin-btn" onClick={() => setActing({ review: r, to: "VISIBLE" })}><RotateCcw size={14} /> بازگردانی</button>}
                </div>
              </div>
            ))}
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
  const toast = useAdminToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const hiding = to === "HIDDEN";

  async function submit() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/mentors/reviews/${review.id}`, { method: "PATCH", json: { status: to, reason: reason.trim() || undefined } });
      onDone(hiding ? "نظر پنهان شد" : "نظر بازگردانی شد");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={hiding ? "پنهان کردن نظر" : "بازگردانی نظر"} eyebrow="تأیید اقدام" onClose={onClose}>
      <div className="admin-modal-text" style={{ whiteSpace: "pre-wrap" }}>
        {review.body || "بدون متن"}
      </div>
      <label className="admin-field">
        <span>{hiding ? "دلیل (الزامی)" : "توضیح (اختیاری)"}</span>
        <textarea className="admin-input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      </label>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" onClick={onClose} disabled={busy}>انصراف</button>
        <button type="button" className={`admin-btn ${hiding ? "danger" : "primary"}`} disabled={busy || (hiding && !reason.trim())} onClick={submit}>
          {busy ? "در حال انجام…" : hiding ? "پنهان کن" : "بازگردانی"}
        </button>
      </div>
    </AdminModal>
  );
}
