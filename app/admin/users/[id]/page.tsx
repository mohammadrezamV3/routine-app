"use client";

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

type ModuleRow = { module: string; active: boolean; expiresAt: string | null };
type Detail = {
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
};

// کپی کلاینتیِ MODULE_LABELS_FA (lib/modules.ts) — اون فایل از @prisma/client
// import داره و نباید وارد باندل کلاینت بشه. با enum ModuleKey هماهنگ بمونه.
const MODULE_LABELS_FA: Record<string, string> = {
  ROUTINE: "روتین روزانه", SLEEP: "خواب", TASKS: "کارهای روزمره", EXERCISE: "برنامه تمرینی",
  CALORIE: "کالری‌شمار", TRADE: "ژورنال ترید", ROADMAP: "رودمپ آموزشی هوشمند", AI_INSIGHT: "تحلیل هوشمند (AI Insight)",
};
const ALL_MODULES = Object.keys(MODULE_LABELS_FA);


type Tab = "overview" | "profile" | "access" | "admin" | "billing" | "chat" | "security" | "history";

// ISOِ UTC → YYYY-MM-DDِ *محلی* برای <input type="date">. قبلا
// iso.slice(0,10) بود که تاریخِ UTC رو برمی‌گردوند؛ چون ذخیره با
// «۲۳:۵۹:۵۹ به وقتِ محلی» انجام می‌شه، توی منطقه‌های زمانیِ منفی (مثلا
// آمریکا) تاریخِ نمایش‌داده‌شده یک روز جلوتر از تاریخِ انتخاب‌شده بود.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// پایانِ روزِ انتخاب‌شده به وقتِ محلیِ ادمین → ISOِ UTC
function fromLocalInput(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T23:59:59`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const SUB_STATUS_FA: Record<string, string> = {
  ACTIVE: "فعال", TRIAL: "آزمایشی", CANCELED: "لغوشده", EXPIRED: "منقضی", PAST_DUE: "معوق",
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useAdminToast();
  const { can, isSuperAdmin: meSuper } = useAdminAccess();
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id as string | undefined;
  const id = params?.id as string;
  const [data, setData] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<null | "notfound" | "error">(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [confirm, setConfirm] = useState<null | "block" | "soft" | "hard" | "sessions">(null);
  const [heroBusy, setHeroBusy] = useState(false);
  const reqSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++reqSeq.current;
    fetch(`/api/admin/users/${id}`)
      .then(async (r) => {
        if (seq !== reqSeq.current) return;
        if (r.status === 404) { setLoadError("notfound"); return; }
        if (!r.ok) throw new Error(String(r.status));
        setData(await r.json());
        setLoadError(null);
      })
      .catch(() => { if (seq === reqSeq.current) setLoadError("error"); });
  }, [id]);
  useEffect(load, [load]);

  function goBack() {
    // از لیست اومده باشه، back فیلتر/صفحه‌ی لیست رو نگه می‌داره؛ لینکِ مستقیم → لیست
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/admin/users");
  }

  if (loadError === "notfound") {
    return (
      <section>
        <button type="button" className="admin-btn admin-detail-back" onClick={() => router.push("/admin/users")}><ArrowRight size={14} /> لیست کاربران</button>
        <EmptyState message="کاربر پیدا نشد" />
      </section>
    );
  }
  if (!data) {
    return loadError === "error" ? (
      <div className="admin-empty">
        <span>خطا در دریافت اطلاعات</span>
        <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
      </div>
    ) : <div className="admin-empty is-loading">در حال بارگذاری…</div>;
  }

  const u = data.user;
  const isAdmin = u.isSuperAdmin || u.adminPermissions.length > 0;
  const isSelf = !!meId && meId === u.id;
  const protectedTarget = u.isSuperAdmin && !meSuper;

  async function act(fn: () => Promise<unknown>, okMsg: string) {
    setHeroBusy(true);
    try { await fn(); toast(okMsg); load(); } catch (e: any) { toast(e.message, "err"); } finally { setHeroBusy(false); }
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(u.id);
      toast("آیدی کپی شد");
    } catch {
      toast("کپی ممکن نشد", "err");
    }
  }

  // کلیدِ هر تب ویرایشی از داده‌ی سرور — بعد از ذخیره/بارگذاریِ دوباره، فرم
  // با مقدارِ واقعیِ سرور (مثلا دسترسی‌هایی که سرور نگه داشت) از نو ساخته می‌شه
  const profileKey = JSON.stringify([u.name, u.lastName, u.username, u.email, u.phone, u.bio]);
  const accessKey = JSON.stringify(u.moduleAccess.map((m) => [m.module, m.active, m.expiresAt]));
  const roleKey = JSON.stringify([u.isSuperAdmin, u.adminPermissions]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "نمای کلی" },
    ...(can("users.edit") ? [{ key: "profile" as Tab, label: "پروفایل" }] : []),
    ...(can("users.access") ? [{ key: "access" as Tab, label: "دسترسی ماژول‌ها" }] : []),
    ...(can("admins.manage") ? [{ key: "admin" as Tab, label: "نقش ادمین" }] : []),
    { key: "billing", label: "اشتراک و پرداخت" },
    { key: "chat", label: "چت ترید" },
    { key: "security", label: "امنیت و ورودها" },
    { key: "history", label: "تاریخچه" },
  ];

  return (
    <section>
      <button type="button" className="admin-btn admin-detail-back" onClick={goBack}>
        <ArrowRight size={14} /> بازگشت
      </button>

      <div className="admin-card admin-user-hero">
        <UserAvatar user={u} size={58} />
        <div className="admin-user-hero-info">
          <div className="admin-user-hero-name">
            {displayName(u)}
            {u.isSuperAdmin ? <span className="admin-badge amber">Owner</span> : isAdmin ? <span className="admin-badge amber">ادمین</span> : null}
            {u.deletedAt ? <span className="admin-badge red">حذف‌شده</span> : u.isBlocked ? <span className="admin-badge red">مسدود</span> : <span className="admin-badge green">فعال</span>}
          </div>
          <div className="admin-user-hero-sub admin-ltr">{[u.username && `@${u.username}`, u.email, u.phone].filter(Boolean).join(" · ") || "—"}</div>
          <button type="button" className="admin-id-chip" onClick={copyId} aria-label="کپی آیدی">
            <Copy size={12} /> <span className="admin-ltr">{u.id}</span>
          </button>
        </div>
        {/* اقدام مخرب روی حساب خودت سمت سرور رد می‌شه — دکمه‌اش هم نشون داده نمی‌شه */}
        {!protectedTarget && !isSelf && (can("users.edit") || can("users.delete")) && (
          <div className="admin-head-actions">
            {can("users.edit") && !u.deletedAt && (u.isBlocked
              ? <button type="button" className="admin-btn" disabled={heroBusy} onClick={() => act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { blocked: false } }), "رفع مسدودی انجام شد")}>رفع مسدودی</button>
              : <button type="button" className="admin-btn danger" disabled={heroBusy} onClick={() => setConfirm("block")}><Ban size={14} /> مسدود</button>)}
            {can("users.delete") && (u.deletedAt
              ? <button type="button" className="admin-btn" disabled={heroBusy} onClick={() => act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { restore: true } }), "حساب بازگردانی شد")}><RotateCcw size={14} /> بازگردانی</button>
              : <button type="button" className="admin-btn danger" disabled={heroBusy} onClick={() => setConfirm("soft")}><Trash2 size={14} /> حذف</button>)}
            {can("users.delete") && <button type="button" className="admin-btn danger" disabled={heroBusy} onClick={() => setConfirm("hard")}><Trash2 size={14} /> حذف دائمی</button>}
          </div>
        )}
      </div>

      <AdminTabBar items={tabs} active={tab} onChange={setTab} />

      {tab === "overview" && <OverviewTab data={data} />}
      {tab === "profile" && <ProfileTab key={profileKey} data={data} disabled={protectedTarget} onSaved={load} />}
      {tab === "access" && <AccessTab key={accessKey} data={data} disabled={protectedTarget} onSaved={load} />}
      {tab === "admin" && <AdminRoleTab key={roleKey} data={data} isSelf={isSelf} onSaved={load} />}
      {tab === "billing" && <BillingTab data={data} />}
      {tab === "chat" && <ChatTab data={data} disabled={protectedTarget || isSelf || !can("users.edit")} onChanged={load} />}
      {tab === "security" && (
        <SecurityTab data={data} canRevoke={can("users.edit") && !protectedTarget && !isSelf} onRevoke={() => setConfirm("sessions")} />
      )}
      {tab === "history" && <HistoryTab data={data} />}

      {confirm === "block" && (
        <ConfirmModal
          title="مسدودکردن کاربر" message="کاربر دیگه نمی‌تونه وارد بشه و از همه‌ی دستگاه‌ها خارج می‌شه." confirmLabel="مسدود کن"
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}`, { method: "PATCH", json: { blocked: true } }), "کاربر مسدود شد"); setConfirm(null); }}
        />
      )}
      {confirm === "soft" && (
        <ConfirmModal
          title="حذف حساب" message="حساب غیرفعال و از دستگاه‌ها خارج می‌شه. داده‌ها (پرداخت، رفرال، ...) می‌مونن و بعدا قابل بازگردانیه." confirmLabel="حذف کن"
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}`, { method: "DELETE" }), "حساب حذف شد"); setConfirm(null); }}
        />
      )}
      {confirm === "hard" && (
        <ConfirmModal
          title="حذف دائمی حساب"
          message={<>همه‌ی داده‌های این کاربر (روتین، ترید، ورزش، اشتراک‌ها، …) <b>برای همیشه</b> پاک می‌شه و برگشت‌پذیر نیست.</>}
          confirmLabel="حذف دائمی" typeToConfirm="حذف"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            try {
              await adminFetch(`/api/admin/users/${id}?mode=hard`, { method: "DELETE" });
              toast("حساب برای همیشه حذف شد");
              router.push("/admin/users");
            } catch (e: any) { toast(e.message, "err"); setConfirm(null); }
          }}
        />
      )}
      {confirm === "sessions" && (
        <ConfirmModal
          title="خروج از همه‌ی دستگاه‌ها" message="همه‌ی نشست‌های فعال این کاربر باطل می‌شن و باید دوباره وارد بشه." confirmLabel="خروج اجباری"
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await act(() => adminFetch(`/api/admin/users/${id}/sessions`, { method: "DELETE" }), "کاربر از همه‌ی دستگاه‌ها خارج شد"); setConfirm(null); }}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- tabs

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="admin-kpi-tile"><span className="admin-kpi-label">{label}</span><span className="admin-kpi-value admin-kpi-value-sm">{value}</span></div>;
}

function OverviewTab({ data }: { data: Detail }) {
  const u = data.user;
  const activeSub = u.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIAL");
  return (
    <>
      <div className="admin-kpi-grid">
        <Kpi label="بازار" value={u.market === "IRAN" ? "ایران" : "بین‌المللی"} />
        <Kpi label="ثبت‌نام" value={formatDateShort(u.createdAt)} />
        <Kpi label="پلن فعلی" value={activeSub?.plan.nameFa || "رایگان"} />
        <Kpi label="نشست‌های فعال" value={formatNumber(data.activeSessions)} />
        <Kpi label="درخواست‌های AI" value={formatNumber(data.aiUsage.requests)} />
        <Kpi label="هزینه AI" value={formatUsdMicros(data.aiUsage.costUsdMicros)} />
      </div>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><Activity size={15} className="admin-title-icon" />فعالیت در محصولات</span></div>
        <div className="admin-kpi-grid admin-kpi-grid-flush">
          <Kpi label="روتین" value={formatNumber(data.activity.dailyEntries)} />
          <Kpi label="بدنسازی" value={formatNumber(data.activity.exerciseLogs)} />
          <Kpi label="کالری" value={formatNumber(data.activity.foodLogs)} />
          <Kpi label="ترید" value={formatNumber(data.activity.tradeEntries)} />
          <Kpi label="رودمپ" value={formatNumber(data.activity.roadmaps)} />
        </div>
      </div>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><UserRound size={15} className="admin-title-icon" />اطلاعات حساب</span></div>
        <div className="admin-info-grid">
          <InfoRow k="ایمیل" ltr v={u.email} extra={u.email ? (u.emailVerifiedAt ? "تاییدشده" : "تاییدنشده") : undefined} />
          <InfoRow k="شماره" ltr v={u.phone} extra={u.phone ? (u.phoneVerifiedAt ? "تاییدشده" : "تاییدنشده") : undefined} />
          <InfoRow k="جنسیت" v={u.gender === "male" ? "مرد" : u.gender === "female" ? "زن" : null} />
          <InfoRow k="تاریخ تولد" v={u.birthDate ? formatDateShort(u.birthDate) : null} />
          <InfoRow k="زبان" v={u.locale} />
          <InfoRow k="ورود دومرحله‌ای" v={u.twoFactorEnabled ? "روشن" : "خاموش"} />
          <InfoRow k="آخرین تغییر" v={formatDateTime(u.updatedAt)} />
          {u.bio && <InfoRow k="بیو" v={u.bio} />}
        </div>
      </div>
    </>
  );
}

function InfoRow({ k, v, extra, ltr }: { k: string; v: string | null | undefined; extra?: string; ltr?: boolean }) {
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

function ProfileTab({ data, disabled, onSaved }: { data: Detail; disabled: boolean; onSaved: () => void }) {
  const toast = useAdminToast();
  const u = data.user;
  const [form, setForm] = useState({ name: u.name || "", lastName: u.lastName || "", username: u.username || "", email: u.email || "", phone: u.phone || "", bio: u.bio || "" });
  const [busy, setBusy] = useState(false);
  const fields: { key: keyof typeof form; label: string; ltr?: boolean }[] = [
    { key: "name", label: "نام" }, { key: "lastName", label: "نام خانوادگی" }, { key: "username", label: "یوزرنیم", ltr: true },
    { key: "email", label: "ایمیل", ltr: true }, { key: "phone", label: "شماره موبایل", ltr: true },
  ];
  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${u.id}`, { method: "PATCH", json: { profile: form } });
      toast("پروفایل ذخیره شد");
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
          <span>بیو</span>
          <textarea className="admin-input" rows={3} maxLength={300} value={form.bio} disabled={disabled} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </label>
      </div>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn primary" disabled={busy || disabled} onClick={save}><Save size={14} /> {busy ? "در حال ذخیره…" : "ذخیره"}</button>
      </div>
    </div>
  );
}

function AccessTab({ data, disabled, onSaved }: { data: Detail; disabled: boolean; onSaved: () => void }) {
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
      toast("دسترسی‌ها ذخیره شد");
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
        <span className="admin-chart-title"><KeyRound size={15} className="admin-title-icon" />دسترسی به ماژول‌ها</span>
        <div className="admin-head-actions">
          <button type="button" className="admin-btn sm" disabled={disabled || busy} onClick={() => grantAll(30)}>همه — 30 روز</button>
          <button type="button" className="admin-btn sm" disabled={disabled || busy} onClick={() => grantAll(null)}>همه — دائمی</button>
          <button type="button" className="admin-btn sm danger" disabled={disabled || busy} onClick={() => setRows((rs) => rs.map((r) => ({ ...r, active: false })))}>قطع همه</button>
        </div>
      </div>
      <div className="admin-section-hint">{data.user.isSuperAdmin ? "Owner همیشه به همه‌چیز دسترسی داره؛ این تنظیمات براش اثری نداره." : "تاریخ انقضای خالی یعنی دسترسی دائمی."}</div>
      <div className="admin-perm-group">
        {rows.map((r) => {
          const expired = r.active && r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();
          return (
            <div key={r.module} className="admin-perm-row admin-access-row">
              <div>
                <div className="admin-perm-label">{MODULE_LABELS_FA[r.module]}</div>
                <div className="admin-perm-hint">
                  {!r.active ? "غیرفعال" : r.expiresAt ? `تا ${formatDateShort(r.expiresAt)}` : "دائمی"}
                  {expired && <span className="admin-access-expired"> · منقضی‌شده</span>}
                </div>
              </div>
              <div className="admin-access-controls">
                <input
                  type="date" className="admin-input" dir="ltr" disabled={disabled || !r.active} value={toLocalInput(r.expiresAt)}
                  onChange={(e) => update(r.module, { expiresAt: fromLocalInput(e.target.value) })}
                  aria-label="تاریخ انقضا"
                />
                <ToggleSwitch checked={r.active} onChange={(v) => update(r.module, { active: v })} disabled={disabled} label={MODULE_LABELS_FA[r.module]} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" disabled={busy || disabled} onClick={() => setRows(initial())}>بازنشانی</button>
        <button type="button" className="admin-btn primary" disabled={busy || disabled} onClick={save}><Save size={14} /> {busy ? "در حال ذخیره…" : "ذخیره دسترسی‌ها"}</button>
      </div>
    </div>
  );
}

function AdminRoleTab({ data, isSelf, onSaved }: { data: Detail; isSelf: boolean; onSaved: () => void }) {
  const toast = useAdminToast();
  const { isSuperAdmin: meSuper } = useAdminAccess();
  const u = data.user;
  const [perms, setPerms] = useState<AdminPermission[]>(sanitizePermissions(u.adminPermissions));
  const [superAdmin, setSuperAdmin] = useState(u.isSuperAdmin);
  const [busy, setBusy] = useState(false);
  // Owner فقط با Owner؛ حسابِ حذف‌شده نقش نمی‌گیره؛ ادمینِ محدود دسترسی‌های
  // خودش رو عوض نمی‌کنه (همه سمت سرور هم رد می‌شن — lib/adminUsers.ts)
  const lockReason = u.isSuperAdmin && !meSuper ? "نقش Owner فقط توسط Owner قابل تغییره."
    : u.deletedAt ? "این حساب حذف شده؛ اول بازگردانیش کن."
    : isSelf && !meSuper ? "دسترسی‌های خودت رو نمی‌تونی تغییر بدی."
    : null;
  const locked = !!lockReason;
  const savedPerms = sanitizePermissions(u.adminPermissions);
  const dirty = superAdmin !== u.isSuperAdmin || perms.length !== savedPerms.length || perms.some((p) => !savedPerms.includes(p));

  async function save() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/admins/${u.id}`, { method: "PATCH", json: { permissions: perms, superAdmin } });
      toast("نقش ادمین ذخیره شد");
      onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title"><ShieldCheck size={15} className="admin-title-icon" />نقش و دسترسی‌های پنل</span></div>
      {lockReason && <div className="admin-section-hint">{lockReason}</div>}
      {meSuper && (
        <div className="admin-perm-row admin-owner-row">
          <div>
            <div className="admin-perm-label">Owner (دسترسی کامل)</div>
            <div className="admin-perm-hint">{isSelf ? "نقش Owner رو از خودت نمی‌تونی بگیری" : "همه‌ی بخش‌ها + همه‌ی ماژول‌های اپ، بدون محدودیت"}</div>
          </div>
          <ToggleSwitch checked={superAdmin} onChange={setSuperAdmin} disabled={locked || isSelf} label="Owner" />
        </div>
      )}
      {superAdmin ? (
        <div className="admin-section-hint">Owner همه‌ی دسترسی‌ها رو داره.</div>
      ) : (
        <PermissionEditor value={perms} onChange={setPerms} disabled={locked} />
      )}
      <div className="admin-modal-actions">
        <button type="button" className="admin-btn" disabled={busy || locked || !dirty} onClick={() => { setPerms(sanitizePermissions(u.adminPermissions)); setSuperAdmin(u.isSuperAdmin); }}>بازنشانی</button>
        <button type="button" className="admin-btn primary" disabled={busy || locked || !dirty} onClick={save}><Save size={14} /> {busy ? "در حال ذخیره…" : "ذخیره نقش"}</button>
      </div>
    </div>
  );
}

function BillingTab({ data }: { data: Detail }) {
  const u = data.user;
  const payments = u.subscriptions.flatMap((s) => s.payments.map((p) => ({ ...p, plan: s.plan.nameFa })));
  return (
    <>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><CreditCard size={15} className="admin-title-icon" />اشتراک‌ها</span></div>
        {u.subscriptions.length === 0 ? <EmptyState /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>پلن</th><th>وضعیت</th><th>دوره</th><th>شروع</th><th>پایان دوره</th><th>لغو</th></tr></thead>
              <tbody>
                {u.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.plan.nameFa}</td>
                    <td><span className={`admin-badge ${s.status === "ACTIVE" ? "green" : s.status === "TRIAL" ? "amber" : "gray"}`}>{SUB_STATUS_FA[s.status] || s.status}</span></td>
                    <td>{s.interval === "YEARLY" ? "سالانه" : "ماهانه"}</td>
                    <td className="admin-ltr">{formatDateShort(s.startDate)}</td>
                    <td className="admin-ltr">{formatDateShort(s.currentPeriodEnd)}</td>
                    <td className="admin-ltr">{s.canceledAt ? formatDateShort(s.canceledAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title"><CreditCard size={15} className="admin-title-icon" />پرداخت‌ها</span></div>
        {payments.length === 0 ? <EmptyState /> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>مبلغ</th><th>پلن</th><th>درگاه</th><th>تاریخ</th><th>وضعیت</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatCurrencyAmount(p.amount, p.currency)}</td>
                    <td>{p.plan}</td>
                    <td>{p.provider}</td>
                    <td className="admin-ltr">{p.paidAt ? formatDateShort(p.paidAt) : "—"}</td>
                    <td>{p.refundedAt ? <span className="admin-badge red">بازپرداخت</span> : p.paidAt ? <span className="admin-badge green">موفق</span> : <span className="admin-badge gray">در انتظار</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function ChatTab({ data, disabled, onChanged }: { data: Detail; disabled: boolean; onChanged: () => void }) {
  const toast = useAdminToast();
  const u = data.user;
  const [pending, setPending] = useState<ChatModerationAction | null>(null);
  const [note, setNote] = useState("");

  async function apply(action: ChatModerationAction) {
    setPending(action);
    try {
      await adminFetch("/api/admin/chat-moderation", { method: "POST", json: { userId: u.id, action, note: action === "WARNING" && note.trim() ? note.trim() : undefined } });
      toast("اعمال شد");
      setNote("");
      onChanged();
    } catch (e: any) { toast(e.message, "err"); } finally { setPending(null); }
  }

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title"><MessageCircleWarning size={15} className="admin-title-icon" />وضعیت چت ترید</span></div>
      <div className="admin-badge-row admin-chat-status">
        {u.chatDisabled ? <span className="admin-badge red">چت غیرفعال</span>
          : u.chatBanUntil && new Date(u.chatBanUntil).getTime() > Date.now() ? <span className="admin-badge amber">بن تا {formatDateTime(u.chatBanUntil)}</span>
          : <span className="admin-badge green">آزاد</span>}
        {u.chatWarnAt && (!u.chatWarnSeenAt || u.chatWarnSeenAt < u.chatWarnAt) && <span className="admin-badge amber">اخطار دیده‌نشده</span>}
      </div>
      {!disabled && (
        <>
          <label className="admin-field admin-chat-note">
            <span>متن اخطار (اختیاری، فقط برای «اخطار»)</span>
            <input className="admin-input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="admin-head-actions">
            {CHAT_MODERATION_ACTIONS.filter((a) => a.value !== "ENABLE_CHAT").map((a) => (
              <button key={a.value} type="button" className="admin-btn sm danger" disabled={!!pending} onClick={() => apply(a.value)}>
                {pending === a.value ? "در حال اعمال…" : a.label}
              </button>
            ))}
            {(u.chatBanUntil || u.chatDisabled) && (
              <button type="button" className="admin-btn sm" disabled={!!pending} onClick={() => apply("ENABLE_CHAT")}>رفع محدودیت</button>
            )}
          </div>
        </>
      )}
      {data.chatModerationHistory.length > 0 && (
        <div className="admin-table-wrap admin-chat-history">
          <table className="admin-table">
            <thead><tr><th>اقدام</th><th>یادداشت</th><th>زمان</th></tr></thead>
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

function SecurityTab({ data, canRevoke, onRevoke }: { data: Detail; canRevoke: boolean; onRevoke: () => void }) {
  const u = data.user;
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head">
        <span className="admin-chart-title">ورودهای اخیر · {formatNumber(data.activeSessions)} نشست فعال</span>
        {canRevoke && data.activeSessions > 0 && <button type="button" className="admin-btn sm danger" onClick={onRevoke}><LogOut size={14} /> خروج از همه‌ی دستگاه‌ها</button>}
      </div>
      {u.loginEvents.length === 0 ? <EmptyState /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>روش ورود</th><th>IP</th><th>زمان</th></tr></thead>
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

function HistoryTab({ data }: { data: Detail }) {
  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title"><History size={15} className="admin-title-icon" />اقدامات ادمین روی این حساب</span></div>
      {data.adminHistory.length === 0 ? <EmptyState /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>اقدام</th><th>جزئیات</th><th>زمان</th></tr></thead>
            <tbody>
              {data.adminHistory.map((h) => (
                <tr key={h.id}>
                  <td>{auditLabel(h.action)}</td>
                  <td className="admin-muted admin-hist-wrap">{describeMeta(h.meta)}</td>
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

function describeMeta(meta: any): string {
  if (!meta) return "—";
  if (Array.isArray(meta.fields)) return `فیلدها: ${meta.fields.join("، ")}`;
  if (meta.after) {
    if (meta.after.superAdmin) return "Owner";
    const p = (meta.after.permissions || []) as AdminPermission[];
    return p.length ? p.map((k) => PERMISSION_META[k]?.label || k).join("، ") : "بدون دسترسی";
  }
  if (Array.isArray(meta.modules)) return meta.modules.map((m: any) => `${MODULE_LABELS_FA[m.module] || m.module}: ${m.active ? "فعال" : "غیرفعال"}`).join("، ");
  if (typeof meta.count === "number") return `${meta.count} نشست`;
  return "—";
}
