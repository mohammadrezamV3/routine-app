"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, ExternalLink, Trash2, X } from "lucide-react";
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
import { localizedRecord } from "@/lib/localizedRecord";
import { tr } from "@/lib/i18n";
import { useIsEn } from "@/components/I18nProvider";
import { MAX_NOTE_LEN, STATUS_LABELS, UserStatus } from "@/lib/adminUsersView";
import {
  AccessTab, AdminRoleTab, ChatTab, Detail, MODULE_LABELS_FA, ProfileTab, SecurityTab, describeMeta,
} from "@/components/AdminUserManageTabs";
import { ExtendDialog, GrantDialog, MessageDialog, TagDialog } from "@/components/AdminUserDialogs";
import "@/components/admin-users.css";

const SUB_STATUS_FA: Record<string, string> = localizedRecord<string>({
  ACTIVE: ["فعال", "Active"], TRIAL: ["آزمایشی", "Trial"], CANCELED: ["لغوشده", "Canceled"], EXPIRED: ["منقضی", "Expired"], PAST_DUE: ["معوق", "Past due"],
});
const EXTRA_AUDIT_LABELS: Record<string, string> = localizedRecord<string>({
  "user.message": ["ارسال پیام", "Sent message"], "user.tag_add": ["افزودن برچسب", "Added tag"], "user.tag_remove": ["حذف برچسب", "Removed tag"], "user.note_add": ["افزودن یادداشت", "Added note"],
  "user.note_delete": ["حذف یادداشت", "Deleted note"], "user.module_grant": ["اعطای ماژول", "Granted module"], "user.subscription_extend": ["تمدید دستی اشتراک", "Manually extended subscription"],
});
const actionLabel = (a: string) => (auditLabel(a) !== a ? auditLabel(a) : EXTRA_AUDIT_LABELS[a] || a);

export function formatAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const m = Math.floor(ms / 60000);
  if (m < 1) return tr("همین الان", "Just now");
  if (m < 60) return tr(`${m} دقیقه پیش`, `${m} min ago`);
  const h = Math.floor(m / 60);
  if (h < 24) return tr(`${h} ساعت پیش`, `${h} h ago`);
  const d = Math.floor(h / 24);
  if (d < 30) return tr(`${d} روز پیش`, `${d} ${d === 1 ? "day" : "days"} ago`);
  const mo = Math.floor(d / 30);
  if (mo < 12) return tr(`${mo} ماه پیش`, `${mo} ${mo === 1 ? "month" : "months"} ago`);
  const y = Math.floor(mo / 12);
  return tr(`${y} سال پیش`, `${y} ${y === 1 ? "year" : "years"} ago`);
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
  const en = useIsEn();
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

  if (loadError === "notfound") return <EmptyState message={tr("کاربر پیدا نشد", "User not found")} />;
  if (!data) {
    return loadError === "error" ? (
      <div className="admin-empty"><span>{tr("خطا در دریافت اطلاعات", "Couldn't load data")}</span><button type="button" className="admin-btn sm" onClick={load}>{tr("تلاش دوباره", "Try again")}</button></div>
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
    { key: "overview", label: tr("نمای کلی", "Overview") },
    { key: "payments", label: tr("پرداخت‌ها", "Payments") },
    { key: "activity", label: tr("فعالیت", "Activity") },
    { key: "notes", label: tr("یادداشت‌ها", "Notes") },
    { key: "log", label: tr("لاگ", "Log") },
    ...(can("users.edit") || can("users.access") || can("admins.manage") ? [{ key: "manage" as Tab, label: tr("مدیریت", "Manage") }] : []),
  ];
  const manageOpts: { value: Manage; label: string }[] = [
    ...(can("users.edit") ? [{ value: "profile" as Manage, label: tr("پروفایل", "Profile") }] : []),
    ...(can("users.access") ? [{ value: "access" as Manage, label: tr("دسترسی", "Access") }] : []),
    ...(can("admins.manage") ? [{ value: "admin" as Manage, label: tr("نقش ادمین", "Admin role") }] : []),
    { value: "chat", label: tr("چت", "Chat") },
    { value: "security", label: tr("امنیت", "Security") },
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
          {en ? <ArrowLeft size={14} /> : <ArrowRight size={14} />} {tr("بازگشت", "Back")}
        </button>
      ) : (
        <div className="au-drawer-top">
          <span className="au-kicker">{tr("پرونده‌ی کاربر", "User profile")}</span>
          <span className="au-drawer-top-actions">
            <Link href={`/admin/users/${u.id}`} className="admin-icon-btn" aria-label={tr("باز کردن صفحه‌ی کامل", "Open full page")}><ExternalLink size={15} /></Link>
            <button type="button" className="admin-icon-btn" onClick={onClose} aria-label={tr("بستن", "Close")}><X size={16} /></button>
          </span>
        </div>
      )}

      <header className="au-head">
        <span className={`au-avatar au-avatar-${status}`}><UserAvatar user={u} size={variant === "page" ? 64 : 56} /></span>
        <div className="au-head-info">
          <strong className="au-name">{displayName(u)}</strong>
          <span className="au-sub admin-ltr">{[u.username && `@${u.username}`].filter(Boolean).join("")}{u.username ? " · " : ""}<span dir={en ? "ltr" : "rtl"}>{tr("عضو از", "Joined")} {formatAgo(u.createdAt)}</span></span>
          <div className="au-chips">
            <StatusChip status={status} />
            {isAdmin && <span className="au-chip au-chip-warn">{u.isSuperAdmin ? "Owner" : tr("ادمین", "Admin")}</span>}
            {x.tags.map((t) => (
              <span key={t} className="au-chip">
                {t}
                {can("users.edit") && canAct && (
                  <button type="button" className="au-chip-x" aria-label={tr(`حذف برچسب ${t}`, `Remove tag ${t}`)}
                    onClick={() => act(() => adminFetch(`/api/admin/users/${id}/tags?tag=${encodeURIComponent(t)}`, { method: "DELETE" }), tr("برچسب حذف شد", "Tag removed"))}>
                    <X size={11} />
                  </button>
                )}
              </span>
            ))}
            {can("users.edit") && canAct && <button type="button" className="au-chip au-chip-add" onClick={() => setDialog("tag")}>{tr("+ برچسب", "+ Tag")}</button>}
          </div>
        </div>
      </header>

      <AdminTabBar items={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="au-body">
          <div className="au-tiles">
            <div className="au-tile"><span>{tr("روز فعال پیاپی", "Active days in a row")}</span><strong>{formatNumber(x.metrics.activeStreak)}</strong></div>
            <div className="au-tile"><span>{tr("روز فعال هفته (از 7)", "Active days this week (of 7)")}</span><strong>{formatNumber(x.metrics.activeDaysWeek)}</strong></div>
            <div className="au-tile"><span>{tr("پرداخت‌ها", "Payments")}</span><strong>{formatNumber(x.metrics.paymentsCount)}</strong></div>
          </div>
          <div className="au-section">
            <span className="au-section-title">{tr("دسترسی به بخش‌ها", "Module access")}</span>
            {Object.keys(MODULE_LABELS_FA).map((m) => {
              const row = u.moduleAccess.find((a) => a.module === m);
              const on = !!row && row.active && (!row.expiresAt || new Date(row.expiresAt).getTime() > Date.now());
              return (
                <div key={m} className="au-row">
                  <span className={`au-dot${on ? " on" : ""}`} />
                  <span className="au-grow">{MODULE_LABELS_FA[m]}</span>
                  <span className="au-muted">{!on ? tr("ندارد", "None") : row?.expiresAt ? tr(`تا ${formatDateShort(row.expiresAt)}`, `Until ${formatDateShort(row.expiresAt)}`) : tr("بدون انقضا", "No expiry")}</span>
                </div>
              );
            })}
          </div>
          <div className="au-section">
            <span className="au-section-title">{tr("آخرین رویدادها", "Latest events")}</span>
            {x.events.slice(0, 5).map((e, i) => (
              <div key={i} className="au-event"><span>{e.title}</span><span className="au-muted">{formatAgo(e.at)}</span></div>
            ))}
          </div>
          <div className="au-section">
            <span className="au-section-title">{tr("اطلاعات", "Details")}</span>
            <div className="au-kv"><span>{tr("ایمیل", "Email")}</span><span className="admin-ltr">{u.email || "—"}</span></div>
            <div className="au-kv"><span>{tr("شماره", "Phone")}</span><span className="admin-ltr">{u.phone || "—"}</span></div>
            <div className="au-kv"><span>{tr("ارزش طول عمر", "Lifetime value")}</span><span>{ltvText}</span></div>
            <div className="au-kv"><span>{tr("آخرین فعالیت", "Last activity")}</span><span className="admin-ltr">{data.lastActivityAt ? formatDateTime(data.lastActivityAt) : "—"}</span></div>
            <div className="au-kv"><span>{tr("نشست‌های فعال", "Active sessions")}</span><span>{formatNumber(data.activeSessions)}</span></div>
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="au-body">
          <div className="au-section">
            <span className="au-section-title">{tr("پرداخت‌ها", "Payments")}</span>
            {x.payments.length === 0 ? <div className="au-muted">{tr("پرداختی ثبت نشده", "No payments recorded")}</div> : x.payments.map((p) => (
              <div key={p.id} className="au-row">
                <span className="au-grow">{p.plan}<span className="au-muted au-sub-line">{formatDateShort(p.paidAt || p.createdAt)} · {p.provider}</span></span>
                <strong className="admin-ltr">{formatCurrencyAmount(p.amount, p.currency)}</strong>
                <span className={`au-chip ${p.refundedAt ? "au-chip-bad" : p.paidAt ? "au-chip-ok" : ""}`}>{p.refundedAt ? tr("برگشت‌خورده", "Refunded") : p.paidAt ? tr("موفق", "Paid") : tr("ناموفق", "Failed")}</span>
              </div>
            ))}
          </div>
          <div className="au-section">
            <span className="au-section-title">{tr("اشتراک‌ها", "Subscriptions")}</span>
            {u.subscriptions.length === 0 ? <div className="au-muted">{tr("اشتراکی نیست", "No subscriptions")}</div> : u.subscriptions.map((s) => (
              <div key={s.id} className="au-row">
                <span className="au-grow">{s.plan.nameFa}<span className="au-muted au-sub-line">{tr("از", "From")} {formatDateShort(s.startDate)} {tr("تا", "to")} {formatDateShort(s.currentPeriodEnd)}</span></span>
                <span className="au-chip">{SUB_STATUS_FA[s.status] || s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="au-body">
          <div className="au-section">
            <span className="au-section-title">{tr("خط زمانی", "Timeline")}</span>
            {x.events.map((e, i) => (
              <div key={i} className="au-event"><span>{e.title}</span><span className="au-muted admin-ltr" title={formatDateTime(e.at)}>{formatAgo(e.at)}</span></div>
            ))}
          </div>
          <div className="au-section">
            <span className="au-section-title">{tr("حجم داده‌ها", "Data volume")}</span>
            <div className="au-kv"><span>{tr("روزهای ثبت‌شده روتین", "Logged routine days")}</span><span>{formatNumber(data.activity.dailyEntries)}</span></div>
            <div className="au-kv"><span>{tr("تمرین‌ها", "Workouts")}</span><span>{formatNumber(data.activity.exerciseLogs)}</span></div>
            <div className="au-kv"><span>{tr("وعده‌های غذایی", "Meals")}</span><span>{formatNumber(data.activity.foodLogs)}</span></div>
            <div className="au-kv"><span>{tr("معامله‌ها", "Trades")}</span><span>{formatNumber(data.activity.tradeEntries)}</span></div>
            <div className="au-kv"><span>{tr("رودمپ‌ها", "Roadmaps")}</span><span>{formatNumber(data.activity.roadmaps)}</span></div>
          </div>
        </div>
      )}

      {tab === "notes" && <NotesPane id={id} notes={x.notes} meId={meId} meSuper={meSuper} canWrite={can("users.edit") && canAct} onChanged={changed} />}

      {tab === "log" && (
        <div className="au-body">
          <div className="au-section">
            <span className="au-section-title">{tr("اقدام‌های ادمین روی این کاربر", "Admin actions on this user")}</span>
            {data.adminHistory.length === 0 ? <div className="au-muted">{tr("موردی ثبت نشده", "Nothing recorded")}</div> : data.adminHistory.map((h) => (
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
          <SegmentedTabs options={manageOpts} active={manageActive} onChange={setManage} ariaLabel={tr("بخش مدیریت", "Manage section")} />
          {manageActive === "profile" && <ProfileTab key={profileKey} data={data} disabled={protectedTarget} onSaved={changed} />}
          {manageActive === "access" && <AccessTab key={accessKey} data={data} disabled={protectedTarget} onSaved={changed} />}
          {manageActive === "admin" && <AdminRoleTab key={roleKey} data={data} isSelf={isSelf} onSaved={changed} />}
          {manageActive === "chat" && <ChatTab data={data} disabled={protectedTarget || !can("users.edit")} onChanged={changed} />}
          {manageActive === "security" && <SecurityTab data={data} canRevoke={can("users.edit") && !protectedTarget && !isSelf} onRevoke={() => setConfirm("sessions")} />}
        </div>
      )}

      {canAct && (
        <footer className="au-actions">
          {can("subscriptions") && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDialog("extend")}>{tr("تمدید دستی", "Manual extension")}</button>}
          {can("users.access") && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDialog("grant")}>{tr("اعطای ماژول", "Grant module")}</button>}
          {can("users.edit") && !u.deletedAt && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDialog("message")}>{tr("ارسال پیام", "Send message")}</button>}
          {!isSelf && can("users.edit") && !u.deletedAt && (u.isBlocked
            ? <button type="button" className="admin-btn" disabled={busy} onClick={() => act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { blocked: false } }), tr("رفع مسدودی انجام شد", "Unblocked"))}>{tr("رفع مسدودی", "Unblock")}</button>
            : <button type="button" className="admin-btn danger" disabled={busy} onClick={() => setConfirm("block")}>{tr("مسدودسازی", "Block")}</button>)}
          {!isSelf && can("users.delete") && (u.deletedAt
            ? <button type="button" className="admin-btn" disabled={busy} onClick={() => act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { restore: true } }), tr("حساب بازگردانی شد", "Account restored"))}>{tr("بازگردانی", "Restore")}</button>
            : <button type="button" className="admin-btn danger" disabled={busy} onClick={() => setConfirm("soft")}><Trash2 size={13} /> {tr("حذف", "Delete")}</button>)}
          {!isSelf && can("users.delete") && <button type="button" className="admin-btn danger" disabled={busy} onClick={() => setConfirm("hard")}>{tr("حذف دائمی", "Delete permanently")}</button>}
        </footer>
      )}

      {dialog === "message" && <MessageDialog ids={[id]} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog === "grant" && <GrantDialog ids={[id]} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog === "extend" && <ExtendDialog id={id} onClose={() => setDialog(null)} onDone={changed} />}
      {dialog === "tag" && <TagDialog ids={[id]} onClose={() => setDialog(null)} onDone={changed} />}

      {confirm === "block" && (
        <ConfirmModal title={tr("مسدودکردن کاربر", "Block user")} message={tr("کاربر دیگه نمی‌تونه وارد بشه و از همه‌ی دستگاه‌ها خارج می‌شه.", "The user can't sign in anymore and will be signed out of all devices.")} confirmLabel={tr("مسدود کن", "Block")}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { blocked: true } }), tr("کاربر مسدود شد", "User blocked")); setConfirm(null); }} />
      )}
      {confirm === "soft" && (
        <ConfirmModal title={tr("حذف حساب", "Delete account")} message={tr("حساب غیرفعال و از دستگاه‌ها خارج می‌شه. داده‌ها می‌مونن و بعدا قابل بازگردانی‌ان.", "The account is deactivated and signed out of devices. Data is kept and can be restored later.")} confirmLabel={tr("حذف", "Delete")}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}`, { method: "DELETE" }), tr("حساب حذف شد", "Account deleted")); setConfirm(null); }} />
      )}
      {confirm === "hard" && (
        <ConfirmModal title={tr("حذف دائمی حساب", "Permanently delete account")} message={<>{tr("همه‌ی داده‌های این کاربر", "All of this user's data will be erased")} <b>{tr("برای همیشه", "permanently")}</b> {tr("پاک می‌شه و برگشت‌پذیر نیست.", "and can't be undone.")}</>}
          confirmLabel={tr("حذف دائمی", "Delete permanently")} typeToConfirm={tr("حذف", "Delete")} onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await adminFetch(`/api/admin/users/${id}?mode=hard`, { method: "DELETE" });
              toast(tr("حساب برای همیشه حذف شد", "Account permanently deleted"));
              onChanged?.();
              if (variant === "drawer") onClose?.(); else router.push("/admin/users");
            } catch (e: any) { toast(e.message, "err"); setConfirm(null); }
          }} />
      )}
      {confirm === "sessions" && (
        <ConfirmModal title={tr("خروج از همه‌ی دستگاه‌ها", "Sign out of all devices")} message={tr("همه‌ی نشست‌های فعال این کاربر باطل می‌شن و باید دوباره وارد بشه.", "All active sessions of this user will be revoked and they'll need to sign in again.")} confirmLabel={tr("خارج کن", "Sign out")}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}/sessions`, { method: "DELETE" }), tr("کاربر از همه‌ی دستگاه‌ها خارج شد", "User signed out of all devices")); setConfirm(null); }} />
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
      <span className="au-muted">{tr("یادداشت‌ها فقط برای ادمین‌ها دیده می‌شن.", "Notes are only visible to admins.")}</span>
      {canWrite && (
        <div className="au-note-form">
          <textarea className="admin-input" rows={3} maxLength={MAX_NOTE_LEN} value={text} onChange={(e) => setText(e.target.value)} aria-label={tr("یادداشت جدید", "New note")} />
          <button type="button" className="admin-btn primary" disabled={busy || !text.trim()} onClick={add}>{busy && <Spinner size={14} label={null} />} {tr("افزودن یادداشت", "Add note")}</button>
        </div>
      )}
      {notes.length === 0 ? <div className="au-muted">{tr("یادداشتی نیست", "No notes")}</div> : notes.map((n) => (
        <div key={n.id} className="au-note">
          <p>{n.body}</p>
          <div className="au-note-meta">
            <span>{n.authorName} · <span className="admin-ltr" title={formatDateTime(n.createdAt)}>{formatAgo(n.createdAt)}</span></span>
            {canWrite && (n.authorId === meId || meSuper) && <button type="button" className="admin-icon-btn" aria-label={tr("حذف یادداشت", "Delete note")} onClick={() => del(n.id)}><Trash2 size={14} /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}
