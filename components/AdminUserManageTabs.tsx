"use client";

// تب‌های مدیریتی قدیمی پرونده‌ی کاربر (ویرایش پروفایل، دسترسی ماژول، نقش ادمین، چت، امنیت) که بدون تغییر رفتار از صفحه‌ی قبلی منتقل شدن.

import { localizedRecord } from "@/lib/localizedRecord";
import { tr } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight, Ban, Copy, LogOut, MessageCircleWarning, RotateCcw, Save, ShieldCheck, Trash2, UserRound, KeyRound, CreditCard, Activity, History,
} from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { AdminTabBar } from "@/components/admin/TabBar";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { PermissionEditor } from "@/components/admin/PermissionEditor";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatCurrencyAmount, formatDateShort, formatDateTime, formatNumber, formatUsdMicros } from "@/lib/adminFormat";
import { CHAT_MODERATION_ACTIONS, ChatModerationAction } from "@/lib/tradeChat";
import { AdminPermission, PERMISSION_META, sanitizePermissions } from "@/lib/adminPermissions";
import { auditLabel } from "@/lib/adminAuditLabels";

export type ModuleRow = { module: string; active: boolean; expiresAt: string | null };
export type Detail = {
  user: {
    id: string; name: string | null; lastName: string | null; email: string | null; phone: string | null; username: string | null; bio: string | null;
    avatarUrl: string | null; market: string; locale: string; isSuperAdmin: boolean; adminPermissions: string[]; isBlocked: boolean; blockedAt: string | null;
    deletedAt: string | null; createdAt: string; updatedAt: string; gender: string | null; birthDate: string | null;
    emailVerifiedAt: string | null; phoneVerifiedAt: string | null; twoFactorEnabled: boolean;
    chatBanUntil: string | null; chatDisabled: boolean; chatWarnAt: string | null; chatWarnNote: string | null; chatWarnSeenAt: string | null;
    subscriptions: { id: string; status: string; interval: string; startDate: string; currentPeriodEnd: string; canceledAt: string | null; plan: { nameFa: string; currency: string; priceMonthly: number }; payments: { id: string; amount: number; currency: string; paidAt: string | null; refundedAt: string | null; provider: string }[] }[];
    moduleAccess: ModuleRow[];
    loginEvents: { id: string; provider: string; ip: string | null; userAgent?: string | null; createdAt: string }[];
  };
  activity: { dailyEntries: number; exerciseLogs: number; foodLogs: number; tradeEntries: number; roadmaps: number };
  aiUsage: { requests: number; inputTokens: number; outputTokens: number; costUsdMicros: number };
  chatModerationHistory: { id: string; action: string; meta: any; createdAt: string }[];
  adminHistory: { id: string; action: string; meta: any; createdAt: string; actorUserId: string }[];
  activeSessions: number;
  lastActivityAt: string | null;
  extras: {
    tags: string[];
    notes: { id: string; body: string; createdAt: string; authorId: string; authorName: string }[];
    metrics: { activeStreak: number; activeDaysWeek: number; paymentsCount: number; ltv: { currency: string; amount: number }[] };
    payments: { id: string; amount: number; currency: string; provider: string; plan: string; paidAt: string | null; refundedAt: string | null; createdAt: string }[];
    events: { kind: string; title: string; at: string }[];
  };
};

// کپی کلاینتی MODULE_LABELS_FA (lib/modules.ts) — اون فایل از @prisma/client
// import داره و نباید وارد باندل کلاینت بشه. با enum ModuleKey هماهنگ بمونه.
export const MODULE_LABELS_FA: Record<string, string> = localizedRecord<string>({
  ROUTINE: ["روتین روزانه", "Daily routine"], SLEEP: ["خواب", "Sleep"], TASKS: ["کارهای روزمره", "Daily tasks"], EXERCISE: ["برنامه تمرینی", "Workout plan"],
  CALORIE: ["کالری‌شمار", "Calorie tracker"], TRADE: ["ژورنال ترید", "Trading journal"], ROADMAP: ["رودمپ آموزشی هوشمند", "Smart learning roadmap"], AI_INSIGHT: ["تحلیل هوشمند (AI Insight)", "Smart analysis (AI Insight)"],
});
export const ALL_MODULES = Object.keys(MODULE_LABELS_FA);


type Tab = "overview" | "profile" | "access" | "admin" | "billing" | "chat" | "security" | "history";

// ISO UTC → YYYY-MM-DD *محلی* برای <input type="date">. قبلا
// iso.slice(0,10) بود که تاریخ UTC رو برمی‌گردوند؛ چون ذخیره با
// «۲۳:۵۹:۵۹ به وقت محلی» انجام می‌شه، توی منطقه‌های زمانی منفی (مثلا
// آمریکا) تاریخ نمایش‌داده‌شده یک روز جلوتر از تاریخ انتخاب‌شده بود.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// پایان روز انتخاب‌شده به وقت محلی ادمین → ISO UTC
function fromLocalInput(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T23:59:59`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const SUB_STATUS_FA: Record<string, string> = localizedRecord<string>({
  ACTIVE: ["فعال", "Active"], TRIAL: ["آزمایشی", "Trial"], CANCELED: ["لغوشده", "Canceled"], EXPIRED: ["منقضی", "Expired"], PAST_DUE: ["معوق", "Past due"],
});


export function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="admin-kpi-tile"><span className="admin-kpi-label">{label}</span><span className="admin-kpi-value admin-kpi-value-sm">{value}</span></div>;
}

export function InfoRow({ k, v, extra, ltr }: { k: string; v: string | null | undefined; extra?: string; ltr?: boolean }) {
  return (
    <div className="admin-info-row">
      <span className="admin-muted">{k}</span>
      <span className="admin-info-value">
        {ltr && v ? <bdi dir="ltr">{v}</bdi> : v || "—"}
        {extra && <span className="admin-info-extra">({extra})</span>}
      </span>
    </div>
  );
}

export function ProfileTab({ data, disabled, onSaved }: { data: Detail; disabled: boolean; onSaved: () => void }) {
  const toast = useAdminToast();
  const u = data.user;
  const [form, setForm] = useState({ name: u.name || "", lastName: u.lastName || "", username: u.username || "", email: u.email || "", phone: u.phone || "", bio: u.bio || "" });
  const [busy, setBusy] = useState(false);
  const fields: { key: keyof typeof form; label: string; ltr?: boolean }[] = [
    { key: "name", label: tr("نام", "Name") }, { key: "lastName", label: tr("نام خانوادگی", "Last name") }, { key: "username", label: tr("یوزرنیم", "Username"), ltr: true },
    { key: "email", label: tr("ایمیل", "Email"), ltr: true }, { key: "phone", label: tr("شماره موبایل", "Mobile number"), ltr: true },
  ];
  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", json: { profile: form } });
      toast(tr("پروفایل ذخیره شد", "Profile saved"));
      onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  return (
    <div className="admin-chart-card">
      <div className="admin-form-grid">
        {fields.map((f) => (
          <label key={f.key} className="admin-field">
            <span>{f.label}</span>
            <input className="admin-input" dir={f.ltr ? "ltr" : undefined} value={form[f.key]} disabled={disabled} maxLength={120} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </label>
        ))}
        <label className="admin-field admin-field-full">
          <span>{tr("بیو", "Bio")}</span>
          <textarea className="admin-input" rows={3} maxLength={300} value={form.bio} disabled={disabled} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </label>
      </div>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn primary" disabled={busy || disabled} onClick={save}><Save size={14} /> {busy ? tr("در حال ذخیره…", "Saving…") : tr("ذخیره", "Save")}</button>
      </div>
    </div>
  );
}

export function AccessTab({ data, disabled, onSaved }: { data: Detail; disabled: boolean; onSaved: () => void }) {
  const toast = useAdminToast();
  const initial = (): ModuleRow[] => ALL_MODULES.map((m) => {
    const row = data.user.moduleAccess.find((a) => a.module === m);
    return { module: m, active: !!row?.active, expiresAt: row?.expiresAt || null };
  });
  const [rows, setRows] = useState<ModuleRow[]>(initial);
  const [busy, setBusy] = useState(false);
  const update = (m: string, patch: Partial<ModuleRow>) => setRows((rs) => rs.map((r) => (r.module === m ? { ...r, ...patch } : r)));

  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${data.user.id}/access`, { method: "PUT", json: { modules: rows } });
      toast(tr("دسترسی‌ها ذخیره شد", "Access saved"));
      onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  function grantAll(days: number | null) {
    const exp = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    setRows((rs) => rs.map((r) => ({ ...r, active: true, expiresAt: exp })));
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span className="admin-chart-title"><KeyRound size={15} className="admin-title-icon" />{tr("دسترسی به ماژول‌ها", "Module access")}</span>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn sm" disabled={disabled || busy} onClick={() => grantAll(30)}>{tr("همه — 30 روز", "All — 30 days")}</button>
          <button type="button" className="admin-btn sm" disabled={disabled || busy} onClick={() => grantAll(null)}>{tr("همه — دائمی", "All — permanent")}</button>
          <button type="button" className="admin-btn sm danger" disabled={disabled || busy} onClick={() => setRows((rs) => rs.map((r) => ({ ...r, active: false })))}>{tr("قطع همه", "Turn off all")}</button>
        </div>
      </div>
      <div className="admin-section-hint">{data.user.isSuperAdmin ? tr("Owner همیشه به همه‌چیز دسترسی داره؛ این تنظیمات براش اثری نداره.", "The Owner always has access to everything; these settings don't apply to them.") : tr("تاریخ انقضای خالی یعنی دسترسی دائمی.", "An empty expiry date means permanent access.")}</div>
      <div className="admin-perm-group">
        {rows.map((r) => {
          const expired = r.active && r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();
          return (
            <div key={r.module} className="admin-perm-row admin-access-row">
              <div>
                <div className="admin-perm-label">{MODULE_LABELS_FA[r.module]}</div>
                <div className="admin-perm-hint">
                  {!r.active ? tr("غیرفعال", "Inactive") : r.expiresAt ? tr(`تا ${formatDateShort(r.expiresAt)}`, `Until ${formatDateShort(r.expiresAt)}`) : tr("دائمی", "Permanent")}
                  {expired && <span className="admin-access-expired"> {tr("· منقضی‌شده", "· expired")}</span>}
                </div>
              </div>
              <div className="admin-access-controls">
                <input
                  type="date" className="admin-input" dir="ltr" disabled={disabled || !r.active} value={toLocalInput(r.expiresAt)}
                  onChange={(e) => update(r.module, { expiresAt: fromLocalInput(e.target.value) })}
                  aria-label={tr(tr("تاریخ انقضا", "Expiry date"), "Expiry date")}
                />
                <ToggleSwitch checked={r.active} onChange={(v) => update(r.module, { active: v })} disabled={disabled} label={MODULE_LABELS_FA[r.module]} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" disabled={busy || disabled} onClick={() => setRows(initial())}>{tr("بازنشانی", "Reset")}</button>
        <button type="button" className="admin-btn primary" disabled={busy || disabled} onClick={save}><Save size={14} /> {busy ? tr("در حال ذخیره…", "Saving…") : tr("ذخیره دسترسی‌ها", "Save access")}</button>
      </div>
    </div>
  );
}

export function AdminRoleTab({ data, isSelf, onSaved }: { data: Detail; isSelf: boolean; onSaved: () => void }) {
  const toast = useAdminToast();
  const { isSuperAdmin: meSuper } = useAdminAccess();
  const u = data.user;
  const [perms, setPerms] = useState<AdminPermission[]>(sanitizePermissions(u.adminPermissions));
  const [superAdmin, setSuperAdmin] = useState(u.isSuperAdmin);
  const [busy, setBusy] = useState(false);
  // Owner فقط با Owner؛ حساب حذف‌شده نقش نمی‌گیره؛ ادمین محدود دسترسی‌های
  // خودش رو عوض نمی‌کنه (همه سمت سرور هم رد می‌شن — lib/adminUsers.ts)
  const lockReason = u.isSuperAdmin && !meSuper ? tr("نقش Owner فقط توسط Owner قابل تغییره.", "The Owner role can only be changed by the Owner.")
    : u.deletedAt ? tr("این حساب حذف شده؛ اول بازگردانیش کن.", "This account is deleted; restore it first.")
    : isSelf && !meSuper ? tr("دسترسی‌های خودت رو نمی‌تونی تغییر بدی.", "You can't change your own permissions.")
    : null;
  const locked = !!lockReason;
  const savedPerms = sanitizePermissions(u.adminPermissions);
  const dirty = superAdmin !== u.isSuperAdmin || perms.length !== savedPerms.length || perms.some((p) => !savedPerms.includes(p));

  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/admins/${u.id}`, { method: "PATCH", json: { permissions: perms, superAdmin } });
      toast(tr("نقش ادمین ذخیره شد", "Admin role saved"));
      onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title"><ShieldCheck size={15} className="admin-title-icon" />{tr("نقش و دسترسی‌های پنل", "Panel role and permissions")}</span></div>
      {lockReason && <div className="admin-section-hint">{lockReason}</div>}
      {meSuper && (
        <div className="admin-perm-row admin-owner-row">
          <div>
            <div className="admin-perm-label">{tr("Owner (دسترسی کامل)", "Owner (full access)")}</div>
            <div className="admin-perm-hint">{isSelf ? tr("نقش Owner رو از خودت نمی‌تونی بگیری", "You can't remove the Owner role from yourself.") : tr("همه‌ی بخش‌ها + همه‌ی ماژول‌های اپ، بدون محدودیت", "All sections + all app modules, no limits")}</div>
          </div>
          <ToggleSwitch checked={superAdmin} onChange={setSuperAdmin} disabled={locked || isSelf} label="Owner" />
        </div>
      )}
      {superAdmin ? (
        <div className="admin-section-hint">{tr("Owner همه‌ی دسترسی‌ها رو داره.", "The Owner has all permissions.")}</div>
      ) : (
        <PermissionEditor value={perms} onChange={setPerms} disabled={locked} />
      )}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" disabled={busy || locked || !dirty} onClick={() => { setPerms(sanitizePermissions(u.adminPermissions)); setSuperAdmin(u.isSuperAdmin); }}>{tr("بازنشانی", "Reset")}</button>
        <button type="button" className="admin-btn primary" disabled={busy || locked || !dirty} onClick={save}><Save size={14} /> {busy ? tr("در حال ذخیره…", "Saving…") : tr("ذخیره نقش", "Save role")}</button>
      </div>
    </div>
  );
}

export function ChatTab({ data, disabled, onChanged }: { data: Detail; disabled: boolean; onChanged: () => void }) {
  const toast = useAdminToast();
  const u = data.user;
  const [pending, setPending] = useState<ChatModerationAction | null>(null);
  const [note, setNote] = useState("");

  async function apply(action: ChatModerationAction) {
    setPending(action);
    try {
      await adminFetch("/api/admin/chat-moderation", { method: "POST", json: { userId: u.id, action, note: action === "WARNING" && note.trim() ? note.trim() : undefined } });
      toast(tr("اعمال شد", "Applied"));
      setNote("");
      onChanged();
    } catch (e: any) { toast(e.message, "err"); } finally { setPending(null); }
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title"><MessageCircleWarning size={15} className="admin-title-icon" />{tr("وضعیت چت ترید", "Trading chat status")}</span></div>
      <div className="admin-badge-row admin-chat-status">
        {u.chatDisabled ? <span className="admin-badge red">{tr("چت غیرفعال", "Chat disabled")}</span>
          : u.chatBanUntil && new Date(u.chatBanUntil).getTime() > Date.now() ? <span className="admin-badge amber">{tr("بن تا", "Banned until")} {formatDateTime(u.chatBanUntil)}</span>
          : <span className="admin-badge green">{tr("آزاد", "Free")}</span>}
        {u.chatWarnAt && (!u.chatWarnSeenAt || u.chatWarnSeenAt < u.chatWarnAt) && <span className="admin-badge amber">{tr("اخطار دیده‌نشده", "Unseen warning")}</span>}
      </div>
      {!disabled && (
        <>
          <label className="admin-field admin-chat-note">
            <span>{tr("متن اخطار (اختیاری، فقط برای «اخطار»)", "Warning text (optional, for «Warning» only)")}</span>
            <input className="admin-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="admin-head-actions">
            {CHAT_MODERATION_ACTIONS.filter((a) => a.value !== "ENABLE_CHAT").map((a) => (
              <button key={a.value} type="button" className="admin-btn sm danger" disabled={!!pending} onClick={() => apply(a.value)}>
                {pending === a.value ? tr("در حال اعمال…", "Applying…") : a.label}
              </button>
            ))}
            {(u.chatBanUntil || u.chatDisabled) && (
              <button type="button" className="admin-btn sm" disabled={!!pending} onClick={() => apply("ENABLE_CHAT")}>{tr("رفع محدودیت", "Remove restriction")}</button>
            )}
          </div>
        </>
      )}
      {data.chatModerationHistory.length > 0 && (
        <div className="admin-table-wrap admin-chat-history">
          <table className="admin-table">
            <thead><tr><th>{tr("اقدام", "Action")}</th><th>{tr("یادداشت", "Note")}</th><th>{tr("زمان", "Time")}</th></tr></thead>
            <tbody>
              {data.chatModerationHistory.map((h) => (
                <tr key={h.id}>
                  <td>{CHAT_MODERATION_ACTIONS.find((a) => `chat.${a.value.toLowerCase()}` === h.action)?.label || h.action}</td>
                  <td className="admin-hist-wrap">{h.meta?.note || "—"}</td>
                  <td className="admin-ltr">{formatDateTime(h.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SecurityTab({ data, canRevoke, onRevoke }: { data: Detail; canRevoke: boolean; onRevoke: () => void }) {
  const u = data.user;
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span className="admin-chart-title">{tr("ورودهای اخیر", "Recent sign-ins")} · {formatNumber(data.activeSessions)} {tr("نشست فعال", "active sessions")}</span>
        {canRevoke && data.activeSessions > 0 && <button type="button" className="admin-btn sm danger" onClick={onRevoke}><LogOut size={14} /> {tr("خروج از همه‌ی دستگاه‌ها", "Sign out of all devices")}</button>}
      </div>
      {u.loginEvents.length === 0 ? <EmptyState /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>{tr("روش ورود", "Sign-in method")}</th><th>IP</th><th>{tr("زمان", "Time")}</th></tr></thead>
            <tbody>
              {u.loginEvents.map((l) => (
                <tr key={l.id}><td>{l.provider}</td><td className="admin-ltr">{l.ip || "—"}</td><td className="admin-ltr">{formatDateTime(l.createdAt)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function describeMeta(meta: any): string {
  if (!meta) return "—";
  if (Array.isArray(meta.fields)) return tr(`فیلدها: ${meta.fields.join("، ")}`, `Fields: ${meta.fields.join("، ")}`);
  if (meta.after) {
    if (meta.after.superAdmin) return "Owner";
    const p = (meta.after.permissions || []) as AdminPermission[];
    return p.length ? p.map((k) => PERMISSION_META[k]?.label || k).join(tr("، ", ", ")) : tr("بدون دسترسی", "No access");
  }
  if (Array.isArray(meta.modules)) return meta.modules.map((m: any) => `${MODULE_LABELS_FA[m.module] || m.module}: ${m.active ? tr("فعال", "Active") : tr("غیرفعال", "Inactive")}`).join(tr("، ", ", "));
  if (typeof meta.count === "number") return tr(`${meta.count} نشست`, `${meta.count} sessions`);
  return "—";
}
