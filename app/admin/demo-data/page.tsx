"use client";

import { useCallback, useEffect, useState } from "react";
import { DatabaseZap, Trash2 } from "lucide-react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { ensureE2EEKeys } from "@/lib/e2ee/client";

type Counts = { mentors: number; students: number; mentorships: number; programs: number; messages: number; reviews: number; reports: number };
type Status = { seeded: boolean; seededAt: string | null; ownerProfileCreated: boolean; counts: Counts };

const COUNT_LABELS: [keyof Counts, string][] = [
  ["mentors", "مربی"],
  ["students", "شاگرد"],
  ["mentorships", "رابطه"],
  ["programs", "برنامه"],
  ["messages", "پیام"],
  ["reviews", "نظر"],
  ["reports", "گزارش"],
];

// داده‌ی آزمایشیِ بخشِ منتورها — فقط Owner. ساخت و حذف هر دو در لاگِ فعالیت ثبت می‌شن.
export default function AdminDemoDataPage() {
  const toast = useAdminToast();
  const { isSuperAdmin } = useAdminAccess();
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [confirm, setConfirm] = useState<"seed" | "clear" | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    adminFetch<{ status: Status }>("/api/admin/demo-data")
      .then((d) => setStatus(d.status))
      .catch((e) => { setFailed(true); toast(e.message, "err"); });
  }, [toast]);

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin, load]);

  async function run(kind: "seed" | "clear") {
    setBusy(kind);
    try {
      // کلیدِ رمزگذاریِ خودِ Owner پیش از ساخت (تا گفت‌وگوهایش با کاربرانِ آزمایشی پُر شوند)
      if (kind === "seed") await ensureE2EEKeys();
      const d = await adminFetch<{ status: Status; warnings?: string[] }>("/api/admin/demo-data", { method: kind === "seed" ? "POST" : "DELETE" });
      setStatus(d.status);
      toast(kind === "seed" ? "داده‌ی آزمایشی ساخته شد" : "داده‌ی آزمایشی حذف شد");
      for (const w of d.warnings ?? []) toast(w, "err");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  if (!isSuperAdmin) {
    return <div className="admin-empty">این بخش فقط برای Owner است.</div>;
  }

  const summary = status?.seeded
    ? COUNT_LABELS.filter(([k]) => status.counts[k] > 0).map(([k, l]) => `${formatNumber(status.counts[k])} ${l}`).join("، ")
    : null;

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">داده‌ی آزمایشی</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            مربی، شاگرد، برنامه، پیام، نظر و گزارش نمونه برای تست بخش مربی‌ها. حساب شما هم به‌عنوان شاگرد و مربی به این داده وصل می‌شود.
            پیام‌ها رمزگذاری سرتاسری دارند: گفت‌وگوهای حساب شما فقط وقتی پیام نمونه می‌گیرند که پیش از ساخت، دست‌کم یک بار با رمز عبور وارد شده باشید؛ گفت‌وگوی کاربران آزمایشی با هم برای هیچ‌کس خواندنی نیست.
          </div>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn primary" disabled={!status || !!busy} onClick={() => setConfirm("seed")}>
            <DatabaseZap size={14} /> {status?.seeded ? "ساخت دوباره" : "ساخت داده‌ی آزمایشی"}
          </button>
          <button type="button" className="admin-btn danger" disabled={!status?.seeded || !!busy} onClick={() => setConfirm("clear")}>
            <Trash2 size={14} /> حذف همه‌ی داده‌ی آزمایشی
          </button>
        </div>
      </div>

      {!status ? (
        <div className={failed ? "admin-empty" : "admin-empty is-loading"}>
          {failed ? "خطا در دریافت وضعیت" : "در حال بارگذاری…"}
          {failed && <button type="button" className="admin-btn" style={{ marginTop: 10 }} onClick={load}>تلاش دوباره</button>}
        </div>
      ) : (
        <div className="admin-chart-card">
          <div className="admin-perm-row">
            <div>
              <div className="admin-perm-label">
                {status.seeded ? <span className="admin-badge green">ساخته شده</span> : <span className="admin-badge gray">ساخته نشده</span>}
              </div>
              <div className="admin-perm-hint">
                {status.seeded
                  ? `${summary}${status.seededAt ? ` — ${formatDateTime(status.seededAt)}` : ""}`
                  : "هیچ کاربر آزمایشی‌ای در دیتابیس نیست."}
              </div>
              {status.seeded && (
                <div className="admin-perm-hint">
                  کاربران آزمایشی با ایمیل demo+N@demo.arion.local و یوزرنیم demo_ ساخته شده‌اند و امکان ورود ندارند.
                  {status.ownerProfileCreated ? " پروفایل مربی‌گری شما هم با حذف داده پاک می‌شود." : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirm === "seed" && (
        <ConfirmModal
          title="ساخت داده‌ی آزمایشی"
          danger={false}
          message={status?.seeded ? "داده‌ی آزمایشی فعلی حذف و از نو ساخته می‌شود. تغییراتی که روی آن داده‌ها داده‌اید از بین می‌رود." : "۱۴ کاربر آزمایشی با رابطه، برنامه، پیام، نظر و گزارش ساخته می‌شود."}
          confirmLabel="ساخت"
          onConfirm={() => run("seed")}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "clear" && (
        <ConfirmModal
          title="حذف داده‌ی آزمایشی"
          message="همه‌ی کاربران آزمایشی و هرچه به آن‌ها وصل است (رابطه‌ها، برنامه‌ها، پیام‌ها، نظرها، گزارش‌ها) حذف می‌شود. داده‌ی کاربران واقعی دست نمی‌خورد."
          confirmLabel="حذف"
          onConfirm={() => run("clear")}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
