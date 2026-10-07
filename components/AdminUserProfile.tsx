"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, ExternalLink, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminTabBar } from "@/components/admin/TabBar";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { Spinner } from "@/components/Spinner";
import { formatCurrencyAmount, formatDateShort, formatDateTime, formatNumber } from "@/lib/adminFormat";
import { auditLabel } from "@/lib/adminAuditLabels";
import { MAX_NOTE_LEN, STATUS_LABELS, UserStatus } from "@/lib/adminUsersView";
import {
  AccessTab, AdminRoleTab, ChatTab, Detail, MODULE_LABELS_FA, ProfileTab, SecurityTab, describeMeta,
} from "@/components/AdminUserManageTabs";
import { ExtendDialog, GrantDialog, MessageDialog, TagDialog } from "@/components/AdminUserDialogs";
import "@/components/admin-users.css";

const SUB_STATUS_FA: Record<string, string> = { ACTIVE: "فعال", TRIAL: "آزمایشی", CANCELED: "لغوشده", EXPIRED: "منقضی", PAST_DUE: "معوق" };
const EXTRA_AUDIT_LABELS: Record<string, string> = {
  "user.message": "ارسال پیام", "user.tag_add": "افزودن برچسب", "user.tag_remove": "حذف برچسب", "user.note_add": "افزودن یادداشت",
  "user.note_delete": "حذف یادداشت", "user.module_grant": "اعطای ماژول", "user.subscription_extend": "تمدید دستی اشتراک",
};
const actionLabel = (a: string) => (auditLabel(a) !== a ? auditLabel(a) : EXTRA_AUDIT_LABELS[a] || a);

export function formatAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "همین الان";
  if (m < 60) return `${m} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعت پیش`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} روز پیش`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} ماه پیش`;
  return `${Math.floor(mo / 12)} سال پیش`;
}

export function StatusChip({ status }: { status: string }) {
  return <span className={`au-status au-status-${status}`}>{STATUS_LABELS[status as UserStatus] || status}</span>;
}

function deriveStatus(u: Detail["user"]): string {
  if (u.deletedAt) return "deleted";
  if (u.isBlocked) return "blocked";
  const now = Date.now();
  if (u.subscriptions.some((s) => s.status === "ACTIVE" && s.plan.priceMonthly > 0)) return "paid";
  if (u.subscriptions.some((s) => s.status === "TRIAL" && new Date(s.currentPeriodEnd).getTime() > now)) return "trial";
  if (u.subscriptions.length) return "expired";
  return "free";
}

type Tab = "overview" | "payments" | "activity" | "notes" | "log" | "manage";
type Manage = "profile" | "access" | "admin" | "chat" | "security";

export function AdminUserProfile({ id, variant, onClose, onChanged }: { id: string; variant: "page" | "drawer"; onClose?: () => void; onChanged?: () => void }) {
  const router = useRouter();
  const toast = useAdminToast();
  const { can, isSuperAdmin: meSuper } = useAdminAccess();
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id as string | undefined;
  const [data, setData] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<null | "notfound" | "error">(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [manage, setManage] = useState<Manage>("profile");
  const [dialog, setDialog] = useState<null | "message" | "grant" | "extend" | "tag" | "untag">(null);
  const [untagValue, setUntagValue] = useState("");
  const [confirm, setConfirm] = useState<null | "block" | "soft" | "hard" | "sessions">(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const load = useCallback(() => {
    const s = ++seq.current;
    fetch(`/api/admin/users/${id}`)
      .then(async (r) => {
        if (s !== seq.current) return;
        if (r.status === 404) { setLoadError("notfound"); return; }
        if (!r.ok) throw new Error(String(r.status));
        setData(await r.json());
        setLoadError(null);
      })
      .catch(() => { if (s === seq.current) setLoadError("error"); });
  }, [id]);
  useEffect(() => { setData(null); setTab("overview"); load(); }, [load]);

  const changed = useCallback(() => { load(); onChanged?.(); }, [load, onChanged]);

  if (loadError === "notfound") return <EmptyState message="کاربر پیدا نشد" />;
  if (!data) {
    return loadError === "error" ? (
      <div className="admin-empty"><span>خطا در دریافت اطلاعات</span><button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button></div>
    ) : <div className="admin-empty"><Spinner size={22} /></div>;
  }

  const u = data.user;
  const x = data.extras;
  const isAdmin = u.isSuperAdmin || u.adminPermissions.length > 0;
  const isSelf = !!meId && meId === u.id;
  const protectedTarget = u.isSuperAdmin && !meSuper;
  const status = deriveStatus(u);
  const canAct = !protectedTarget;

  async function act(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try { await fn(); toast(okMsg); changed(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "نمای کلی" },
    { key: "payments", label: "پرداخت‌ها" },
    { key: "activity", label: "فعالیت" },
    { key: "notes", label: "یادداشت‌ها" },
    { key: "log", label: "لاگ" },
    ...(can("users.edit") || can("users.access") || can("admins.manage") ? [{ key: "manage" as Tab, label: "مدیریت" }] : []),
  ];
  const manageOpts: { value: Manage; label: string }[] = [
    ...(can("users.edit") ? [{ value: "profile" as Manage, label: "پروفایل" }] : []),
    ...(can("users.access") ? [{ value: "access" as Manage, label: "دسترسی" }] : []),
    ...(can("admins.manage") ? [{ value: "admin" as Manage, label: "نقش ادمین" }] : []),
    { value: "chat", label: "چت" },
    { value: "security", label: "امنیت" },
  ];
  const manageActive = manageOpts.some((o) => o.value === manage) ? manage : manageOpts[0].value;

  const profileKey = JSON.stringify([u.name, u.lastName, u.username, u.email, u.phone, u.bio]);
  const accessKey = JSON.stringify(u.moduleAccess.map((m) => [m.module, m.active, m.expiresAt]));
  const roleKey = JSON.stringify([u.isSuperAdmin, u.adminPermissions]);
  const ltvText = x.metrics.ltv.length ? x.metrics.ltv.map((l) => formatCurrencyAmount(l.amount, l.currency)).join(" + ") : "0";

  return (
    <div className={`au-profile au-${variant}`}>
      {variant === "page" ? (
        <button type="button" className="admin-btn au-back" onClick={() => (window.history.length > 1 ? router.back() : router.push("/admin/users"))}>
          <ArrowRight size={14} /> بازگشت
        </button>
      ) : (
        <div className="au-drawer-top">
          <span className="au-kicker">پرونده‌ی کاربر</span>
          <span className="au-drawer-top-actions">
            <Link href={`/admin/users/${u.id}`} className="admin-icon-btn" aria-label="باز کردن صفحه‌ی کامل"><ExternalLink size={15} /></Link>
            <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
          </span>
        </div>
      )}

      <header className="au-head">
        <span className={`au-avatar au-avatar-${status}`}><UserAvatar user={u} size={variant === "page" ? 64 : 56} /></span>
        <div className="au-head-info">
          <strong className="au-name">{displayName(u)}</strong>
          <span className="au-sub admin-ltr">{[u.username && `@${u.username}`].filter(Boolean).join("")}{u.username ? " · " : ""}<span dir="rtl">عضو از {formatAgo(u.createdAt)}</span></span>
          <div className="au-chips">
            <StatusChip status={status} />
            {isAdmin && <span className="au-chip au-chip-warn">{u.isSuperAdmin ? "Owner" : "ادمین"}</span>}
            {x.tags.map((t) => (
              <span key={t} className="au-chip">
                {t}
                {can("users.edit") && canAct && (
                  <button type="button" className="au-chip-x" aria-label={`حذف برچسب ${t}`}
                    onClick={() => act(() => adminFetch(`/api/admin/users/${id}/tags?tag=${encodeURIComponent(t)}`, { method: "DELETE" }), "برچسب حذف شد")}>
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
            {can("users.edit") && canAct && <button type="button" className="au-chip au-chip-add" onClick={() => setDialog("tag")}>+ برچسب</button>}
          </div>
        </div>
      </header>

      <AdminTabBar items={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="au-body">
          <div className="au-tiles">
            <div className="au-tile"><span>روز فعال پیاپی</span><strong>{formatNumber(x.metrics.activeStreak)}</strong></div>
            <div className="au-tile"><span>روز فعال هفته (از 7)</span><strong>{formatNumber(x.metrics.activeDaysWeek)}</strong></div>
            <div className="au-tile"><span>پرداخت‌ها</span><strong>{formatNumber(x.metrics.paymentsCount)}</strong></div>
          </div>
          <div className="au-section">
            <span className="au-section-title">دسترسی به بخش‌ها</span>
            {Object.keys(MODULE_LABELS_FA).map((m) => {
              const row = u.moduleAccess.find((a) => a.module === m);
              const on = !!row && row.active && (!row.expiresAt || new Date(row.expiresAt).getTime() > Date.now());
              return (
                <div key={m} className="au-row">
                  <span className={`au-dot${on ? " on" : ""}`} />
                  <span className="au-grow">{MODULE_LABELS_FA[m]}</span>
                  <span className="au-muted">{!on ? "ندارد" : row?.expiresAt ? `تا ${formatDateShort(row.expiresAt)}` : "بدون انقضا"}</span>
                </div>
              );
            })}
          </div>
          <div className="au-section">
            <span className="au-section-title">آخرین رویدادها</span>
            {x.events.slice(0, 5).map((e, i) => (
              <div key={i} className="au-event"><span>{e.title}</span><span className="au-muted">{formatAgo(e.at)}</span></div>
            ))}
          </div>
          <div className="au-section">
            <span className="au-section-title">اطلاعات</span>
            <div className="au-kv"><span>ایمیل</span><span className="admin-ltr">{u.email || "—"}</span></div>
            <div className="au-kv"><span>شماره</span><span className="admin-ltr">{u.phone || "—"}</span></div>
            <div className="au-kv"><span>ارزش طول عمر</span><span>{ltvText}</span></div>
            <div className="au-kv"><span>آخرین فعالیت</span><span className="admin-ltr">{data.lastActivityAt ? formatDateTime(data.lastActivityAt) : "—"}</span></div>
            <div className="au-kv"><span>نشست‌های فعال</span><span>{formatNumber(data.activeSessions)}</span></div>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="au-body">
          <div className="au-section">
            <span className="au-section-title">پرداخت‌ها</span>
            {x.payments.length === 0 ? <div className="au-muted">پرداختی ثبت نشده</div> : x.payments.map((p) => (
              <div key={p.id} className="au-row">
                <span className="au-grow">{p.plan}<span className="au-muted au-sub-line">{formatDateShort(p.paidAt || p.createdAt)} · {p.provider}</span></span>
                <strong className="admin-ltr">{formatCurrencyAmount(p.amount, p.currency)}</strong>
                <span className={`au-chip ${p.refundedAt ? "au-chip-bad" : p.paidAt ? "au-chip-ok" : ""}`}>{p.refundedAt ? "برگشت‌خورده" : p.paidAt ? "موفق" : "ناموفق"}</span>
              </div>
            ))}
          </div>
          <div className="au-section">
            <span className="au-section-title">اشتراک‌ها</span>
            {u.subscriptions.length === 0 ? <div className="au-muted">اشتراکی نیست</div> : u.subscriptions.map((s) => (
              <div key={s.id} className="au-row">
                <span className="au-grow">{s.plan.nameFa}<span className="au-muted au-sub-line">از {formatDateShort(s.startDate)} تا {formatDateShort(s.currentPeriodEnd)}</span></span>
                <span className="au-chip">{SUB_STATUS_FA[s.status] || s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="au-body">
          <div className="au-section">
            <span className="au-section-title">خط زمانی</span>
            {x.events.map((e, i) => (
              <div key={i} className="au-event"><span>{e.title}</span><span className="au-muted admin-ltr" title={formatDateTime(e.at)}>{formatAgo(e.at)}</span></div>
            ))}
          </div>
          <div className="au-section">
            <span className="au-section-title">حجم داده‌ها</span>
            <div className="au-kv"><span>روزهای ثبت‌شده روتین</span><span>{formatNumber(data.activity.dailyEntries)}</span></div>
            <div className="au-kv"><span>تمرین‌ها</span><span>{formatNumber(data.activity.exerciseLogs)}</span></div>
            <div className="au-kv"><span>وعده‌های غذایی</span><span>{formatNumber(data.activity.foodLogs)}</span></div>
            <div className="au-kv"><span>معامله‌ها</span><span>{formatNumber(data.activity.tradeEntries)}</span></div>
            <div className="au-kv"><span>رودمپ‌ها</span><span>{formatNumber(data.activity.roadmaps)}</span></div>
          </div>
        </div>
      )}

      {tab === "notes" && <NotesPane id={id} notes={x.notes} meId={meId} meSuper={meSuper} canWrite={can("users.edit") && canAct} onChanged={changed} />}

      {tab === "log" && (
        <div className="au-body">
          <div className="au-section">
            <span className="au-section-title">اقدام‌های ادمین روی این کاربر</span>
            {data.adminHistory.length === 0 ? <div className="au-muted">موردی ثبت نشده</div> : data.adminHistory.map((h) => (
              <div key={h.id} className="au-event au-event-col">
                <span>{actionLabel(h.action)}</span>
                {describeMeta(h.meta) && <span className="au-muted">{describeMeta(h.meta)}</span>}
                <span className="au-muted admin-ltr">{formatDateTime(h.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "manage" && (
        <div className="au-body">
          <SegmentedTabs options={manageOpts} active={manageActive} onChange={setManage} ariaLabel="بخش مدیریت" />
          {manageActive === "profile" && <ProfileTab key={profileKey} data={data} disabled={protectedTarget} onSaved={changed} />}
          {manageActive === "access" && <AccessTab key={accessKey} data={data} disabled={protectedTarget} onSaved={changed} />}
          {manageActive === "admin" && <AdminRoleTab key={roleKey} data={data} isSelf={isSelf} onSaved={changed} />}
          {manageActive === "chat" && <ChatTab data={data} disabled={protectedTarget || !can("users.edit")} onChanged={changed} />}
          {manageActive === "security" && <SecurityTab data={data} canRevoke={can("users.edit") && !protectedTarget && !isSelf} onRevoke={() => setConfirm("sessions")} />}
        </div>
      )}

      {canAct && (
        <footer className="au-actions">
          {can("subscriptions") && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDialog("extend")}>تمدید دستی</button>}
          {can("users.access") && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDialog("grant")}>اعطای ماژول</button>}
          {can("users.edit") && !u.deletedAt && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDialog("message")}>ارسال پیام</button>}
          {!isSelf && can("users.edit") && !u.deletedAt && (u.isBlocked
            ? <button type="button" className="admin-btn" disabled={busy} onClick={() => act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { blocked: false } }), "رفع مسدودی انجام شد")}>رفع مسدودی</button>
            : <button type="button" className="admin-btn danger" disabled={busy} onClick={() => setConfirm("block")}>مسدودسازی</button>)}
          {!isSelf && can("users.delete") && (u.deletedAt
            ? <button type="button" className="admin-btn" disabled={busy} onClick={() => act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { restore: true } }), "حساب بازگردانی شد")}>بازگردانی</button>
            : <button type="button" className="admin-btn danger" disabled={busy} onClick={() => setConfirm("soft")}><Trash2 size={13} /> حذف</button>)}
          {!isSelf && can("users.delete") && <button type="button" className="admin-btn danger" disabled={busy} onClick={() => setConfirm("hard")}>حذف دائمی</button>}
        </footer>
      )}

      {dialog === "message" && <MessageDialog ids={[id]} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog === "grant" && <GrantDialog ids={[id]} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog === "extend" && <ExtendDialog id={id} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog === "tag" && <TagDialog ids={[id]} onClose={() => setDialog(null)} onDone={changed} />}

      {confirm === "block" && (
        <ConfirmModal title="مسدودکردن کاربر" message="کاربر دیگه نمی‌تونه وارد بشه و از همه‌ی دستگاه‌ها خارج می‌شه." confirmLabel="مسدود کن"
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { blocked: true } }), "کاربر مسدود شد"); setConfirm(null); }} />
      )}
      {confirm === "soft" && (
        <ConfirmModal title="حذف حساب" message="حساب غیرفعال و از دستگاه‌ها خارج می‌شه. داده‌ها می‌مونن و بعدا قابل بازگردانی‌ان." confirmLabel="حذف"
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}`, { method: "DELETE" }), "حساب حذف شد"); setConfirm(null); }} />
      )}
      {confirm === "hard" && (
        <ConfirmModal title="حذف دائمی حساب" message={<>همه‌ی داده‌های این کاربر <b>برای همیشه</b> پاک می‌شه و برگشت‌پذیر نیست.</>}
          confirmLabel="حذف دائمی" typeToConfirm="حذف" onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await adminFetch(`/api/admin/users/${id}?mode=hard`, { method: "DELETE" });
              toast("حساب برای همیشه حذف شد");
              onChanged?.();
              if (variant === "drawer") onClose?.(); else router.push("/admin/users");
            } catch (e: any) { toast(e.message, "err"); setConfirm(null); }
          }} />
      )}
      {confirm === "sessions" && (
        <ConfirmModal title="خروج از همه‌ی دستگاه‌ها" message="همه‌ی نشست‌های فعال این کاربر باطل می‌شن و باید دوباره وارد بشه." confirmLabel="خارج کن"
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}/sessions`, { method: "DELETE" }), "کاربر از همه‌ی دستگاه‌ها خارج شد"); setConfirm(null); }} />
      )}
    </div>
  );
}

function NotesPane({ id, notes, meId, meSuper, canWrite, onChanged }: {
  id: string; notes: Detail["extras"]["notes"]; meId?: string; meSuper: boolean; canWrite: boolean; onChanged: () => void;
}) {
  const toast = useAdminToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${id}/notes`, { method: "POST", json: { body: text } });
      setText("");
      onChanged();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function del(noteId: string) {
    try { await adminFetch(`/api/admin/users/${id}/notes?noteId=${noteId}`, { method: "DELETE" }); onChanged(); } catch (e: any) { toast(e.message, "err"); }
  }
  return (
    <div className="au-body">
      <span className="au-muted">یادداشت‌ها فقط برای ادمین‌ها دیده می‌شن.</span>
      {canWrite && (
        <div className="au-note-form">
          <textarea className="admin-input" rows={3} maxLength={MAX_NOTE_LEN} value={text} onChange={(e) => setText(e.target.value)} aria-label="یادداشت جدید" />
          <button type="button" className="admin-btn primary" disabled={busy || !text.trim()} onClick={add}>{busy && <Spinner size={14} label={null} />} افزودن یادداشت</button>
        </div>
      )}
      {notes.length === 0 ? <div className="au-muted">یادداشتی نیست</div> : notes.map((n) => (
        <div key={n.id} className="au-note">
          <p>{n.body}</p>
          <div className="au-note-meta">
            <span>{n.authorName} · <span className="admin-ltr" title={formatDateTime(n.createdAt)}>{formatAgo(n.createdAt)}</span></span>
            {canWrite && (n.authorId === meId || meSuper) && <button type="button" className="admin-icon-btn" aria-label="حذف یادداشت" onClick={() => del(n.id)}><Trash2 size={14} /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}
