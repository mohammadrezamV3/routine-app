"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, ShieldPlus, UserMinus, Pencil, Crown } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { KpiTile } from "@/components/admin/KpiTile";
import { AdminModal, ConfirmModal } from "@/components/admin/AdminModal";
import { PermissionEditor } from "@/components/admin/PermissionEditor";
import { UserAvatar, displayName } from "@/components/admin/UserAvatar";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { AdminPermission, PERMISSION_META, sanitizePermissions } from "@/lib/adminPermissions";
import { formatNumber } from "@/lib/adminFormat";

type AdminUser = {
  id: string; name: string | null; lastName: string | null; username: string | null; email: string | null; phone: string | null;
  avatarUrl: string | null; isSuperAdmin: boolean; adminPermissions: string[]; isBlocked?: boolean;
};

export default function AdminAdminsPage() {
  const toast = useAdminToast();
  const [list, setList] = useState<{ admins: AdminUser[]; me: { id: string } } | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [revoking, setRevoking] = useState<AdminUser | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    adminFetch<{ admins: AdminUser[]; me: { id: string } }>("/api/admin/admins")
      .then(setList)
      .catch((e: Error) => { setFailed(true); toast(e.message, "err"); });
  }, [toast]);
  useEffect(load, [load]);

  const owners = list?.admins.filter((a) => a.isSuperAdmin) || [];
  const admins = list?.admins.filter((a) => !a.isSuperAdmin) || [];

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">ادمین‌ها و دسترسی‌ها</div>
          <div className="admin-section-hint admin-page-sub">
            با آیدی، یوزرنیم، ایمیل یا شماره هر کاربری رو ادمین کن و دقیقا مشخص کن به کدوم بخش‌ها دسترسی داشته باشه.
          </div>
        </div>
        <button type="button" className="admin-btn primary" onClick={() => setEditing("new")}><ShieldPlus size={15} /> افزودن ادمین</button>
      </div>

      {!list ? (
        failed ? (
          <div className="admin-empty">
            <span>خطا در دریافت اطلاعات</span>
            <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
          </div>
        ) : <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <KpiTile label="Owner" value={formatNumber(owners.length)} />
            <KpiTile label="ادمین‌ها" value={formatNumber(admins.length)} index={1} />
          </div>

          {owners.length + admins.length === 0 ? <EmptyState message="هنوز ادمینی ثبت نشده" /> : (
            <div className="admin-admin-grid">
              {[...owners, ...admins].map((a) => (
                <AdminCard key={a.id} admin={a} isMe={a.id === list.me.id} onEdit={() => setEditing(a)} onRevoke={() => setRevoking(a)} />
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <AdminEditorModal
          target={editing === "new" ? null : editing}
          meId={list?.me.id || null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {revoking && (
        <ConfirmModal
          title="گرفتن نقش ادمین"
          message={<>«{displayName(revoking)}» دیگه به پنل مدیریت دسترسی نداره. حساب کاربریش دست نمی‌خوره.</>}
          confirmLabel="گرفتن نقش"
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            try {
              const r = await adminFetch<{ user: { isSuperAdmin: boolean; adminPermissions: string[] } }>(`/api/admin/admins/${revoking.id}`, { method: "DELETE" });
              // ادمینِ محدود فقط دسترسی‌هایی رو می‌گیره که خودش داره — بقیه سرِ جاشون می‌مونن
              const left = sanitizePermissions(r.user?.adminPermissions);
              if (left.length) toast(`دسترسی‌های قابل‌گرفتن حذف شد؛ ${formatNumber(left.length)} دسترسی که خودت نداری باقی موند`, "err");
              else toast("نقش ادمین گرفته شد");
              load();
            } catch (e: any) { toast(e.message, "err"); }
            setRevoking(null);
          }}
        />
      )}
    </section>
  );
}

function AdminCard({ admin, isMe, onEdit, onRevoke }: { admin: AdminUser; isMe: boolean; onEdit: () => void; onRevoke: () => void }) {
  const { isSuperAdmin: meSuper } = useAdminAccess();
  const perms = sanitizePermissions(admin.adminPermissions);
  const canTouch = !isMe && (meSuper || !admin.isSuperAdmin);
  return (
    <div className="admin-card admin-admin-card">
      <div className="admin-admin-card-head">
        <UserAvatar user={admin} size={42} />
        <div className="admin-admin-card-who">
          <Link href={`/admin/users/${admin.id}`} className="admin-user-cell-name">{displayName(admin)}</Link>
          <div className="admin-user-cell-sub admin-ltr">{admin.username ? `@${admin.username}` : admin.email || admin.phone || admin.id}</div>
        </div>
        <span className="admin-badge-row">
          {admin.isSuperAdmin ? <span className="admin-badge amber"><Crown size={11} /> Owner</span> : <span className="admin-badge green">ادمین</span>}
          {admin.isBlocked && <span className="admin-badge red">مسدود</span>}
          {isMe && <span className="admin-badge gray">خودت</span>}
        </span>
      </div>
      <div className="admin-badge-row admin-admin-perms">
        {admin.isSuperAdmin
          ? <span className="admin-muted">دسترسی کامل به همه‌ی بخش‌ها</span>
          : perms.map((p) => <span key={p} className="admin-badge gray">{PERMISSION_META[p].label}</span>)}
      </div>
      {canTouch && (
        <div className="admin-head-actions">
          <button type="button" className="admin-btn sm" onClick={onEdit}><Pencil size={13} /> ویرایش دسترسی‌ها</button>
          <button type="button" className="admin-btn sm danger" onClick={onRevoke}><UserMinus size={13} /> گرفتن نقش</button>
        </div>
      )}
    </div>
  );
}

type Found = AdminUser & { deletedAt?: string | null };

function AdminEditorModal({ target, meId, onClose, onSaved }: { target: AdminUser | null; meId: string | null; onClose: () => void; onSaved: () => void }) {
  const toast = useAdminToast();
  const { isSuperAdmin: meSuper } = useAdminAccess();
  const [identifier, setIdentifier] = useState("");
  const [found, setFound] = useState<Found | null>(target);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [perms, setPerms] = useState<AdminPermission[]>(target ? sanitizePermissions(target.adminPermissions) : ["users.view"]);
  const [superAdmin, setSuperAdmin] = useState(!!target?.isSuperAdmin);
  const [busy, setBusy] = useState(false);
  const lookupSeq = useRef(0);

  async function lookup() {
    const q = identifier.trim();
    if (!q || looking) return;
    const seq = ++lookupSeq.current;
    setLookupErr(null);
    setLooking(true);
    try {
      const r = await adminFetch<{ user: Found }>(`/api/admin/admins?lookup=${encodeURIComponent(q)}`);
      if (seq !== lookupSeq.current) return;
      setFound(r.user);
      setPerms(r.user.adminPermissions.length ? sanitizePermissions(r.user.adminPermissions) : ["users.view"]);
      setSuperAdmin(r.user.isSuperAdmin);
    } catch (e: any) {
      if (seq !== lookupSeq.current) return;
      setFound(null);
      setLookupErr(e.message);
    } finally {
      if (seq === lookupSeq.current) setLooking(false);
    }
  }

  // عوض‌شدنِ شناسه بعد از پیدا‌کردن → کاربرِ قبلی دیگه معتبر نیست
  // (وگرنه «ادمین کن» روی کاربرِ قبلی اعمال می‌شد)
  function onIdentifierChange(v: string) {
    setIdentifier(v);
    if (!target && found) { lookupSeq.current++; setFound(null); setLooking(false); }
    setLookupErr(null);
  }

  const isSelf = !!found && found.id === meId;
  const ownerLocked = !!found && found.isSuperAdmin && !meSuper;
  const blockedReason = isSelf ? "دسترسی‌های خودت رو از این‌جا نمی‌تونی تغییر بدی." : ownerLocked ? "روی حساب Owner اقدامی نمی‌تونی بکنی." : null;

  async function save() {
    if (!found || blockedReason) return;
    setBusy(true);
    try {
      if (target) await adminFetch(`/api/admin/admins/${found.id}`, { method: "PATCH", json: { permissions: perms, superAdmin } });
      else await adminFetch("/api/admin/admins", { method: "POST", json: { identifier: found.id, permissions: perms, superAdmin } });
      toast(target ? "دسترسی‌ها ذخیره شد" : "ادمین اضافه شد");
      onSaved();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }

  return (
    <AdminModal title={target ? "ویرایش دسترسی‌ها" : "افزودن ادمین"} eyebrow="نقش ادمین" onClose={onClose} wide>
      {!target && (
        <div className="admin-lookup">
          <div className="admin-search">
            <Search size={15} />
            <input
              className="admin-input" dir="ltr" placeholder="آیدی / یوزرنیم / ایمیل / شماره" aria-label="شناسه‌ی کاربر"
              value={identifier} onChange={(e) => onIdentifierChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }} autoFocus
            />
          </div>
          <button type="button" className="admin-btn" disabled={!identifier.trim() || looking} onClick={lookup}>
            {looking ? "در حال جست‌وجو…" : "پیدا کن"}
          </button>
        </div>
      )}
      {lookupErr && <div className="admin-form-error">{lookupErr}</div>}

      {found && (
        <>
          <div className="admin-found-user">
            <UserAvatar user={found} size={38} />
            <div className="admin-admin-card-who">
              <div className="admin-user-cell-name">{displayName(found)}</div>
              <div className="admin-user-cell-sub admin-ltr">{found.id}</div>
            </div>
            {(found.isSuperAdmin || found.adminPermissions.length > 0) && <span className="admin-badge amber">الان ادمینه</span>}
          </div>

          {blockedReason ? (
            <div className="admin-form-error">{blockedReason}</div>
          ) : (
            <>
              {meSuper && (
                <div className="admin-perm-row admin-owner-row">
                  <div>
                    <div className="admin-perm-label"><Crown size={13} className="admin-title-icon" />Owner (دسترسی کامل)</div>
                    <div className="admin-perm-hint">همه‌ی بخش‌های پنل + همه‌ی ماژول‌های اپ</div>
                  </div>
                  <ToggleSwitch checked={superAdmin} onChange={setSuperAdmin} label="Owner" />
                </div>
              )}

              {!superAdmin && <PermissionEditor value={perms} onChange={setPerms} />}
            </>
          )}

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn" onClick={onClose}>انصراف</button>
            <button type="button" className="admin-btn primary" disabled={busy || !!blockedReason || (!superAdmin && perms.length === 0)} onClick={save}>
              <ShieldCheck size={14} /> {busy ? "در حال ذخیره…" : target ? "ذخیره" : "ادمین کن"}
            </button>
          </div>
        </>
      )}
    </AdminModal>
  );
}
