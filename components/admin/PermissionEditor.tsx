"use client";

import { ToggleSwitch } from "@/components/ToggleSwitch";
import { ADMIN_PERMISSIONS, AdminPermission, PERMISSION_GROUPS, PERMISSION_META, ROLE_PRESETS } from "@/lib/adminPermissions";
import { useAdminAccess } from "@/components/admin/AdminAccess";

// ویرایشگر دسترسی‌های ادمین — نقش‌های آماده (میان‌بر) + سوییچ جدا برای هر
// کلید، گروه‌بندی‌شده. کلیدهایی که خود ادمینِ فعلی نداره قفلن (سرور هم
// همین رو اجبار می‌کنه).
export function PermissionEditor({
  value, onChange, disabled = false,
}: { value: AdminPermission[]; onChange: (next: AdminPermission[]) => void; disabled?: boolean }) {
  const { isSuperAdmin, can } = useAdminAccess();
  const set = new Set(value);
  const editable = (p: AdminPermission) => !disabled && (isSuperAdmin || can(p));

  function toggle(p: AdminPermission, on: boolean) {
    const n = new Set(set);
    if (on) n.add(p); else n.delete(p);
    // بدون «مشاهده کاربران»، بقیه‌ی دسترسی‌های کاربران معنایی ندارن
    if (on && p.startsWith("users.") && p !== "users.view") n.add("users.view");
    onChange(ADMIN_PERMISSIONS.filter((k) => n.has(k)));
  }

  return (
    <div className="admin-perm-editor">
      <div className="admin-perm-presets">
        {ROLE_PRESETS.map((r) => {
          const usable = r.permissions.every(editable);
          const active = r.permissions.length === value.length && r.permissions.every((p) => set.has(p));
          return (
            <button
              key={r.key} type="button" disabled={!usable}
              className={`admin-tab${active ? " active" : ""}`}
              onClick={() => onChange([...r.permissions])}
            >
              {r.label}
            </button>
          );
        })}
        <button type="button" className="admin-tab" disabled={disabled} onClick={() => onChange(value.filter((p) => !editable(p)))}>پاک‌کردن</button>
      </div>

      {PERMISSION_GROUPS.map((g) => (
        <div key={g} className="admin-perm-group">
          <div className="admin-perm-group-title">{g}</div>
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
