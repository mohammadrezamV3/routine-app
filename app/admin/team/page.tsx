"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { AdminModal, ConfirmModal } from "@/components/admin/AdminModal";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Spinner } from "@/components/Spinner";
import { TeamMemberAvatar } from "@/components/AboutTeam";
import {
  TEAM_BIO_MAX, TEAM_LINK_KINDS, TEAM_MAX_MEMBERS, TEAM_NAME_MAX, TEAM_ROLES_MAX, TEAM_ROLE_MAX,
  type TeamLinkKind, type TeamMember,
} from "@/lib/teamMembers";

// مدیریت اعضای تیم Arion Group (نمایش در /about پس از زدن روی «Arion Group»).
// ترتیب این فهرست همون ترتیب نمایشه. هر تغییر کل فهرست رو ذخیره می‌کنه.

const LINK_LABELS: Record<TeamLinkKind, { label: string; ph: string }> = {
  telegram: { label: "تلگرام", ph: "@username" },
  instagram: { label: "اینستاگرام", ph: "@username" },
  linkedin: { label: "لینکدین", ph: "linkedin.com/in/..." },
  website: { label: "وب‌سایت", ph: "example.com" },
};

type Draft = { id: string | null; name: string; roles: string[]; roleInput: string; bio: string; photo: string | null; links: Record<TeamLinkKind, string> };

const emptyDraft = (): Draft => ({ id: null, name: "", roles: [], roleInput: "", bio: "", photo: null, links: { telegram: "", instagram: "", linkedin: "", website: "" } });

function toDraft(m: TeamMember): Draft {
  return {
    id: m.id, name: m.name, roles: m.roles, roleInput: "", bio: m.bio, photo: m.photo,
    links: { telegram: m.links.telegram ?? "", instagram: m.links.instagram ?? "", linkedin: m.links.linkedin ?? "", website: m.links.website ?? "" },
  };
}

export default function AdminTeamPage() {
  const toast = useAdminToast();
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    adminFetch<{ members: TeamMember[] }>("/api/admin/team")
      .then((d) => setMembers(d.members))
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  // ذخیره‌ی کل فهرست؛ خطای سرور به صدازننده برمی‌گرده
  async function persist(next: TeamMember[]) {
    setBusy(true);
    try {
      const d = await adminFetch<{ members: TeamMember[] }>("/api/admin/team", { method: "PUT", json: { members: next } });
      setMembers(d.members);
    } finally {
      setBusy(false);
    }
  }

  async function move(i: number, dir: -1 | 1) {
    if (!members) return;
    const j = i + dir;
    if (j < 0 || j >= members.length) return;
    const next = members.slice();
    [next[i], next[j]] = [next[j], next[i]];
    try { await persist(next); } catch (e) { toast(e instanceof Error ? e.message : "خطا", "err"); }
  }

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">تیم Arion Group</div>
          <div className="admin-section-hint admin-page-sub">
            اعضای این فهرست با زدن روی «Arion Group» در صفحه‌ی درباره‌ما نمایش داده می‌شن، به همین ترتیب. تا وقتی عضوی نباشه، اون کارت قابل‌زدن نیست.
          </div>
        </div>
        <button
          type="button" className="admin-btn primary" onClick={() => setEditing(emptyDraft())}
          disabled={!members || members.length >= TEAM_MAX_MEMBERS}
        >
          <Plus size={15} /> عضو جدید
        </button>
      </div>

      {!members ? (
        failed ? (
          <div className="admin-empty">
            <span>خطا در دریافت اطلاعات</span>
            <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
          </div>
        ) : <div className="admin-empty"><Spinner size={22} /></div>
      ) : members.length === 0 ? (
        <div className="admin-empty"><span>هنوز عضوی اضافه نشده</span></div>
      ) : (
        <div className="admin-chart-card">
          {members.map((m, i) => (
            <div key={m.id} className="admin-perm-row" style={{ flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 200 }}>
                <TeamMemberAvatar member={m} size={44} className="admin-team-thumb" />
                <div>
                  <div className="admin-perm-label">{m.name}</div>
                  <div className="admin-perm-hint">{m.roles.length ? m.roles.join(" / ") : "بدون عنوان"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="admin-icon-btn" aria-label="بالاتر" disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
                <button type="button" className="admin-icon-btn" aria-label="پایین‌تر" disabled={busy || i === members.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
                <button type="button" className="admin-icon-btn" aria-label="ویرایش" onClick={() => setEditing(toDraft(m))}><Pencil size={15} /></button>
                <button type="button" className="admin-icon-btn" aria-label="حذف" onClick={() => setRemoving(m)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && members && (
        <MemberForm
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={async (d) => {
            const links: TeamMember["links"] = {};
            for (const k of TEAM_LINK_KINDS) if (d.links[k].trim()) links[k] = d.links[k].trim();
            const member = { id: d.id ?? "", name: d.name, roles: d.roles, bio: d.bio, photo: d.photo, links } as TeamMember;
            const next = d.id ? members.map((m) => (m.id === d.id ? member : m)) : [...members, member];
            await persist(next);
            toast(d.id ? "عضو ویرایش شد" : "عضو اضافه شد", "ok");
            setEditing(null);
          }}
        />
      )}

      {removing && members && (
        <ConfirmModal
          title="حذف عضو"
          message={<>«{removing.name}» از فهرست تیم حذف بشه؟</>}
          confirmLabel="حذف"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await persist(members.filter((m) => m.id !== removing.id));
            toast("عضو حذف شد", "ok");
            setRemoving(null);
          }}
        />
      )}
    </section>
  );
}

function MemberForm({ draft, onClose, onSave }: { draft: Draft; onClose: () => void; onSave: (d: Draft) => Promise<void> }) {
  const toast = useAdminToast();
  const [d, setD] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast("فایل انتخاب‌شده عکس نیست", "err"); return; }
    setCropFile(f);
  }

  function addRole() {
    const t = d.roleInput.trim();
    if (!t || d.roles.length >= TEAM_ROLES_MAX) return;
    if (d.roles.some((r) => r.toLowerCase() === t.toLowerCase())) { setD({ ...d, roleInput: "" }); return; }
    setD({ ...d, roles: [...d.roles, t], roleInput: "" });
  }

  async function submit() {
    if (!d.name.trim()) { toast("نام عضو رو وارد کن", "err"); return; }
    // متنی که تایپ شده ولی هنوز «افزودن» نخورده هم به عنوان‌ها اضافه می‌شه
    const pending = d.roleInput.trim();
    const roles = pending && !d.roles.some((r) => r.toLowerCase() === pending.toLowerCase()) ? [...d.roles, pending] : d.roles;
    if (roles.length > TEAM_ROLES_MAX) { toast(`حداکثر ${TEAM_ROLES_MAX} عنوان`, "err"); return; }
    setSaving(true);
    try { await onSave({ ...d, roles, roleInput: "" }); }
    catch (e) { toast(e instanceof Error && e.message ? e.message : "خطا در ذخیره", "err"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <AdminModal title={d.id ? "ویرایش عضو" : "عضو جدید"} eyebrow="تیم Arion Group" onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <TeamMemberAvatar member={{ name: d.name, photo: d.photo }} size={64} className="admin-team-thumb" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="admin-btn sm" onClick={() => fileRef.current?.click()}>{d.photo ? "تغییر عکس" : "انتخاب عکس"}</button>
            {d.photo && <button type="button" className="admin-btn sm danger" onClick={() => setD({ ...d, photo: null })}>حذف عکس</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <label className="admin-field">
          <span>نام و نام خانوادگی</span>
          <input className="admin-input" value={d.name} maxLength={TEAM_NAME_MAX} onChange={(e) => setD({ ...d, name: e.target.value })} autoFocus />
        </label>
        <div className="admin-field">
          <span>عنوان‌ها (هر عضو می‌تونه چندتا داشته باشه)</span>
          {d.roles.length > 0 && (
            <div className="admin-team-roles">
              {d.roles.map((r) => (
                <span key={r} className="admin-team-role-chip">
                  {r}
                  <button type="button" className="admin-team-role-x" aria-label={`حذف ${r}`} onClick={() => setD({ ...d, roles: d.roles.filter((x) => x !== r) })}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="admin-input" style={{ flex: 1, minWidth: 0 }} value={d.roleInput} maxLength={TEAM_ROLE_MAX}
              placeholder="Developer" disabled={d.roles.length >= TEAM_ROLES_MAX}
              onChange={(e) => setD({ ...d, roleInput: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }}
            />
            <button type="button" className="admin-btn sm" onClick={addRole} disabled={!d.roleInput.trim() || d.roles.length >= TEAM_ROLES_MAX}>افزودن</button>
          </div>
        </div>
        <label className="admin-field">
          <span>معرفی کوتاه (اختیاری)</span>
          <textarea className="admin-input" rows={3} value={d.bio} maxLength={TEAM_BIO_MAX} onChange={(e) => setD({ ...d, bio: e.target.value })} />
        </label>
        {TEAM_LINK_KINDS.map((k) => (
          <label key={k} className="admin-field">
            <span>{LINK_LABELS[k].label} (اختیاری)</span>
            <input
              className="admin-input" dir="ltr" placeholder={LINK_LABELS[k].ph} value={d.links[k]}
              onChange={(e) => setD({ ...d, links: { ...d.links, [k]: e.target.value } })}
            />
          </label>
        ))}
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn" onClick={onClose} disabled={saving}>انصراف</button>
          <button type="button" className="admin-btn primary" onClick={submit} disabled={saving}>
            {saving ? <Spinner size={14} /> : "ذخیره"}
          </button>
        </div>
      </AdminModal>
      {cropFile && (
        <ImageCropModal
          file={cropFile} outputW={256} outputH={256} shape="circle" title="عکس عضو"
          onCancel={() => setCropFile(null)}
          onConfirm={(dataUrl) => { setCropFile(null); setD((p) => ({ ...p, photo: dataUrl })); }}
        />
      )}
    </>
  );
}
