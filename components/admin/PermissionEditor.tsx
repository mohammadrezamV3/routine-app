"use client";

import { ToggleSwitch } from "@/components/ToggleSwitch";
import { ADMIN_PERMISSIONS, AdminPermission, PERMISSION_GROUPS, PERMISSION_META, ROLE_PRESETS, permissionGroupLabel } from "@/lib/adminPermissions";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { tr } from "@/lib/i18n";

// کلیدهای «کاربران» که بدون «مشاهده کاربران» معنایی ندارن (صفحه‌ی کاربران
// با users.view باز می‌شه)
const USERS_DEPENDENTS: AdminPermission[] = ["users.edit", "users.access", "users.delete"];

// ویرایشگر دسترسی‌های ادمین — نقش‌های آماده (میان‌بر) + سوییچ جدا برای هر
// کلید، گروه‌بندی‌شده. کلیدهایی که خود ادمین فعلی نداره قفلن و دست
// نمی‌خورن — نه با سوییچ، نه با نقش آماده، نه با «پاک‌کردن» (سرور هم
// همین رو اجبار می‌کنه: lib/adminUsers.ts → setAdminRole).
export function PermissionEditor({
  value, onChange, disabled = false,
}: { value: AdminPermission[]; onChange: (next: AdminPermission[]) => void; disabled?: boolean }) {
  const { isSuperAdmin, can } = useAdminAccess();
  const set = new Set(value);
  const editable = (p: AdminPermission) => !disabled && (isSuperAdmin || can(p));
  // دسترسی‌هایی که هدف داره ولی ادمین فعلی نمی‌تونه عوضشون کنه — همیشه حفظ می‌شن
  const lockedHeld = value.filter((p) => !editable(p));

  function emit(next: Set<AdminPermission>) {
    onChange(ADMIN_PERMISSIONS.filter((k) => next.has(k)));
  }

  function toggle(p: AdminPermission, on: boolean) {
    if (!editable(p)) return;
    const n = new Set(set);
    if (on) n.add(p); else n.delete(p);
    if (on && USERS_DEPENDENTS.includes(p) && editable("users.view")) n.add("users.view");
    if (!on && p === "users.view") USERS_DEPENDENTS.forEach((d) => { if (editable(d)) n.delete(d); });
    emit(n);
  }

  function applyPreset(perms: AdminPermission[]) {
    emit(new Set([...lockedHeld, ...perms]));
  }

  return (
    <div className="admin-perm-editor">
      <div className="admin-perm-presets">
        {ROLE_PRESETS.map((r) => {
          const usable = r.permissions.every(editable);
          const editableHeld = value.filter(editable);
          const active = editableHeld.length === r.permissions.length && r.permissions.every((p) => set.has(p));
          return (
            <button
              key={r.key} type="button" disabled={!usable} aria-pressed={active}
              className={`admin-tab${active ? " active" : ""}`}
              onClick={() => applyPreset(r.permissions)}
            >
              {r.label}
            </button>
          );
        })}
        <button type="button" className="admin-tab" disabled={disabled || value.every((p) => !editable(p))} onClick={() => emit(new Set(lockedHeld))}>
          {tr("پاک‌کردن", "Clear")}
        </button>
      </div>
      {!isSuperAdmin && !disabled && (
        <div className="admin-perm-hint">{tr("فقط دسترسی‌هایی رو می‌تونی بدی یا بگیری که خودت داری؛ بقیه قفلن و دست نمی‌خورن.", "You can only grant or remove permissions you have yourself; the rest are locked and stay unchanged.")}</div>
      )}

      {PERMISSION_GROUPS.map((g) => (
        <div key={g} className="admin-perm-group">
          <div className="admin-perm-group-title">{permissionGroupLabel(g)}</div>
          {ADMIN_PERMISSIONS.filter((p) => PERMISSION_META[p].group === g).map((p) => (
            <div key={p} className={`admin-perm-row${editable(p) ? "" : " is-locked"}`}>
              <div>
                <div className="admin-perm-label">{PERMISSION_META[p].label}</div>
                <div className="admin-perm-hint">{PERMISSION_META[p].hint}</div>
              </div>
              <ToggleSwitch checked={set.has(p)} onChange={(v) => toggle(p, v)} disabled={!editable(p)} label={PERMISSION_META[p].label} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
