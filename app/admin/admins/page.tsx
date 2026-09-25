"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, ShieldPlus, UserMinus, Pencil, Crown } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
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
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [revoking, setRevoking] = useState<AdminUser | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/admins").then((r) => (r.ok ? r.json() : null)).then(setList);
  }, []);
  useEffect(load, [load]);

  const owners = list?.admins.filter((a) => a.isSuperAdmin) || [];
  const admins = list?.admins.filter((a) => !a.isSuperAdmin) || [];

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">ادمین‌ها و دسترسی‌ها</div>
          <div className="admin-section-hint" style={{ margin: 0 }}>
            با آیدی، یوزرنیم، ایمیل یا شماره هر کاربری رو ادمین کن و دقیقا مشخص کن به کدوم بخش‌ها دسترسی داشته باشه.
          </div>
        </div>
        <button type="button" className="admin-btn primary" onClick={() => setEditing("new")}><ShieldPlus size={15} /> افزودن ادمین</button>
      </div>

      {!list ? (
        <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-tile"><span className="admin-kpi-label">Owner</span><span className="admin-kpi-value">{formatNumber(owners.length)}</span></div>
            <div className="admin-kpi-tile"><span className="admin-kpi-label">ادمین‌ها</span><span className="admin-kpi-value">{formatNumber(admins.length)}</span></div>
          </div>

          <div className="admin-admin-grid">
            {[...owners, ...admins].map((a) => (
              <AdminCard key={a.id} admin={a} isMe={a.id === list.me.id} onEdit={() => setEditing(a)} onRevoke={() => setRevoking(a)} />
            ))}
          </div>
          {owners.length + admins.length === 0 && <EmptyState />}
        </>
      )}

      {editing && (
        <AdminEditorModal
          target={editing === "new" ? null : editing}
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
              await adminFetch(`/api/admin/admins/${revoking.id}`, { method: "DELETE" });
              toast("نقش ادمین گرفته شد");
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={`/admin/users/${admin.id}`} className="admin-user-cell-name">{displayName(admin)}</Link>
          <div className="admin-user-cell-sub admin-ltr">{admin.username ? `@${admin.username}` : admin.email || admin.phone || admin.id}</div>
        </div>
        {admin.isSuperAdmin ? <span className="admin-badge amber"><Crown size={11} /> Owner</span> : <span className="admin-badge green">ادمین</span>}
        {isMe && <span className="admin-badge gray">خودت</span>}
      </div>
      <div className="admin-badge-row admin-admin-perms">
        {admin.isSuperAdmin
          ? <span className="admin-muted">دسترسی کامل به همه‌ی بخش‌ها</span>
          : perms.map((p) => <span key={p} className="admin-badge gray">{PERMISSION_META[p].label}</span>)}
      </div>
      {canTouch && (
        <div className="admin-head-actions">
          <button type="button" className="admin-btn" onClick={onEdit}><Pencil size={13} /> ویرایش دسترسی‌ها</button>
          <button type="button" className="admin-btn danger" onClick={onRevoke}><UserMinus size={13} /> گرفتن نقش</button>
        </div>
      )}
    </div>
  );
}

type Found = AdminUser & { deletedAt?: string | null };

function AdminEditorModal({ target, onClose, onSaved }: { target: AdminUser | null; onClose: () => void; onSaved: () => void }) {
  const toast = useAdminToast();
  const { isSuperAdmin: meSuper } = useAdminAccess();
  const [identifier, setIdentifier] = useState("");
  const [found, setFound] = useState<Found | null>(target);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [perms, setPerms] = useState<AdminPermission[]>(target ? sanitizePermissions(target.adminPermissions) : ["users.view"]);
  const [superAdmin, setSuperAdmin] = useState(!!target?.isSuperAdmin);
  const [busy, setBusy] = useState(false);

  async function lookup() {
    if (!identifier.trim()) return;
    setLookupErr(null);
    try {
      const r = await adminFetch<{ user: Found }>(`/api/admin/admins?lookup=${encodeURIComponent(identifier.trim())}`);
      setFound(r.user);
      setPerms(r.user.adminPermissions.length ? sanitizePermissions(r.user.adminPermissions) : ["users.view"]);
      setSuperAdmin(r.user.isSuperAdmin);
    } catch (e: any) {
      setFound(null);
      setLookupErr(e.message);
    }
  }

  async function save() {
    if (!found) return;
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
          <div className="admin-search" style={{ flex: 1 }}>
            <Search size={15} />
            <input
              className="admin-input" dir="ltr" placeholder="آیدی / یوزرنیم / ایمیل / شماره"
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookup()} autoFocus
            />
          </div>
          <button type="button" className="admin-btn" onClick={lookup}>پیدا کن</button>
        </div>
      )}
      {lookupErr && <div className="admin-form-error">{lookupErr}</div>}

      {found && (
        <>
          <div className="admin-found-user">
            <UserAvatar user={found} size={38} />
            <div style={{ minWidth: 0 }}>
              <div className="admin-user-cell-name">{displayName(found)}</div>
              <div className="admin-user-cell-sub admin-ltr">{found.id}</div>
            </div>
            {(found.isSuperAdmin || found.adminPermissions.length > 0) && <span className="admin-badge amber" style={{ marginInlineStart: "auto" }}>الان ادمینه</span>}
          </div>

          {meSuper && (
            <div className="admin-perm-row" style={{ margin: "12px 0" }}>
              <div>
                <div className="admin-perm-label"><Crown size={13} style={{ verticalAlign: "-2px" }} /> Owner (دسترسی کامل)</div>
                <div className="admin-perm-hint">همه‌ی بخش‌های پنل + همه‌ی ماژول‌های اپ</div>
              </div>
              <ToggleSwitch checked={superAdmin} onChange={setSuperAdmin} label="Owner" />
            </div>
          )}

          {!superAdmin && <PermissionEditor value={perms} onChange={setPerms} />}

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn" onClick={onClose}>انصراف</button>
            <button type="button" className="admin-btn primary" disabled={busy || (!superAdmin && perms.length === 0)} onClick={save}>
              <ShieldCheck size={14} /> {busy ? "در حال ذخیره…" : target ? "ذخیره" : "ادمین کن"}
            </button>
          </div>
        </>
      )}
    </AdminModal>
  );
}
