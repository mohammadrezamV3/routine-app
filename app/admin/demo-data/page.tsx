"use client";

import { useCallback, useEffect, useState } from "react";
import { DatabaseZap, Trash2 } from "lucide-react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { ensureE2EEKeys } from "@/lib/e2ee/client";
import { pick, tr, type Localized } from "@/lib/i18n";

type Counts = { mentors: number; students: number; mentorships: number; programs: number; messages: number; reviews: number; reports: number };
type Status = { seeded: boolean; seededAt: string | null; ownerProfileCreated: boolean; counts: Counts };

const COUNT_LABELS: [keyof Counts, Localized][] = [
  ["mentors", { fa: "مربی", en: "mentors" }],
  ["students", { fa: "شاگرد", en: "students" }],
  ["mentorships", { fa: "رابطه", en: "relations" }],
  ["programs", { fa: "برنامه", en: "programs" }],
  ["messages", { fa: "پیام", en: "messages" }],
  ["reviews", { fa: "نظر", en: "reviews" }],
  ["reports", { fa: "گزارش", en: "reports" }],
];

// داده‌ی آزمایشی بخش منتورها — فقط Owner. ساخت و حذف هر دو در لاگ فعالیت ثبت می‌شن.
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
      // کلید رمزگذاری خود Owner پیش از ساخت (تا گفت‌وگوهایش با کاربران آزمایشی پر شوند)
      if (kind === "seed") await ensureE2EEKeys();
      const d = await adminFetch<{ status: Status; warnings?: string[] }>("/api/admin/demo-data", { method: kind === "seed" ? "POST" : "DELETE" });
      setStatus(d.status);
      toast(kind === "seed" ? tr("داده‌ی آزمایشی ساخته شد", "Demo data created") : tr("داده‌ی آزمایشی حذف شد", "Demo data deleted"));
      for (const w of d.warnings ?? []) toast(w, "err");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  if (!isSuperAdmin) {
    return <div className="admin-empty">{tr("این بخش فقط برای Owner است.", "This section is for Owner only.")}</div>;
  }

  const summary = status?.seeded
    ? COUNT_LABELS.filter(([k]) => status.counts[k] > 0).map(([k, l]) => `${formatNumber(status.counts[k])} ${pick(l)}`).join(tr("، ", ", "))
    : null;

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("داده‌ی آزمایشی", "Demo data")}</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            {tr(
              "مربی، شاگرد، برنامه، پیام، نظر و گزارش نمونه برای تست بخش مربی‌ها. حساب شما هم به‌عنوان شاگرد و مربی به این داده وصل می‌شود. پیام‌ها رمزگذاری سرتاسری دارند: گفت‌وگوهای حساب شما فقط وقتی پیام نمونه می‌گیرند که پیش از ساخت، دست‌کم یک بار با رمز عبور وارد شده باشید؛ گفت‌وگوی کاربران آزمایشی با هم برای هیچ‌کس خواندنی نیست.",
              "Sample mentors, students, programs, messages, reviews and reports for testing the mentor section. Your account is linked to this data as both a student and a mentor. Messages are end-to-end encrypted: your account's conversations only get sample messages if you signed in with your password at least once before creating them. Conversations between demo users can't be read by anyone.",
            )}
          </div>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn primary" disabled={!status || !!busy} onClick={() => setConfirm("seed")}>
            <DatabaseZap size={14} /> {status?.seeded ? tr("ساخت دوباره", "Create again") : tr("ساخت داده‌ی آزمایشی", "Create demo data")}
          </button>
          <button type="button" className="admin-btn danger" disabled={!status?.seeded || !!busy} onClick={() => setConfirm("clear")}>
            <Trash2 size={14} /> {tr("حذف همه‌ی داده‌ی آزمایشی", "Delete all demo data")}
          </button>
        </div>
      </div>

      {!status ? (
        <div className={failed ? "admin-empty" : "admin-empty is-loading"}>
          {failed ? tr("خطا در دریافت وضعیت", "Couldn't load the status") : tr("در حال بارگذاری…", "Loading…")}
          {failed && <button type="button" className="admin-btn" style={{ marginTop: 10 }} onClick={load}>{tr("تلاش دوباره", "Try again")}</button>}
        </div>
      ) : (
        <div className="admin-chart-card">
          <div className="admin-perm-row">
            <div>
              <div className="admin-perm-label">
                {status.seeded ? <span className="admin-badge green">{tr("ساخته شده", "Created")}</span> : <span className="admin-badge gray">{tr("ساخته نشده", "Not created")}</span>}
              </div>
              <div className="admin-perm-hint">
                {status.seeded
                  ? `${summary}${status.seededAt ? ` — ${formatDateTime(status.seededAt)}` : ""}`
                  : tr("هیچ کاربر آزمایشی‌ای در دیتابیس نیست.", "There are no demo users in the database.")}
              </div>
              {status.seeded && (
                <div className="admin-perm-hint">
                  {tr(
                    "کاربران آزمایشی با ایمیل demo+N@demo.arion.local و یوزرنیم demo_ ساخته شده‌اند و امکان ورود ندارند.",
                    "Demo users were created with the email demo+N@demo.arion.local and usernames starting with demo_. They can't sign in.",
                  )}
                  {status.ownerProfileCreated ? tr(" پروفایل مربی‌گری شما هم با حذف داده پاک می‌شود.", " Your mentor profile will also be removed when the data is deleted.") : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirm === "seed" && (
        <ConfirmModal
          title={tr("ساخت داده‌ی آزمایشی", "Create demo data")}
          danger={false}
          message={status?.seeded
            ? tr("داده‌ی آزمایشی فعلی حذف و از نو ساخته می‌شود. تغییراتی که روی آن داده‌ها داده‌اید از بین می‌رود.", "The current demo data will be deleted and created again. Any changes you made to that data will be lost.")
            : tr("14 کاربر آزمایشی با رابطه، برنامه، پیام، نظر و گزارش ساخته می‌شود.", "14 demo users will be created with relations, programs, messages, reviews and reports.")}
          confirmLabel={tr("ساخت", "Create")}
          onConfirm={() => run("seed")}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "clear" && (
        <ConfirmModal
          title={tr("حذف داده‌ی آزمایشی", "Delete demo data")}
          message={tr(
            "همه‌ی کاربران آزمایشی و هرچه به آن‌ها وصل است (رابطه‌ها، برنامه‌ها، پیام‌ها، نظرها، گزارش‌ها) حذف می‌شود. داده‌ی کاربران واقعی دست نمی‌خورد.",
            "All demo users and everything linked to them (relations, programs, messages, reviews, reports) will be deleted. Real users' data is not touched.",
          )}
          confirmLabel={tr("حذف", "Delete")}
          onConfirm={() => run("clear")}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
