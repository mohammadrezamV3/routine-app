"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Download, FileText, IdCard, Image as ImageIcon, Lock, Trash2, Upload, Award } from "lucide-react";
import { AccountBlock } from "./AccountUI";
import { Spinner } from "./Spinner";
import { MentorDashEmpty, formatBytes, fa, mentorApi, statusMessage } from "./MentorDashKit";
import { fmtDate } from "@/lib/mentorFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, isMentorCategory } from "@/lib/mentorCategories";
import type { MentorDocumentMeta, MentorSelf, VerificationStatus } from "@/lib/mentorTypes";

// همون محدودیت‌های lib/mentorUpload.ts (سرور با magic bytes تصمیم نهایی رو
// می‌گیره؛ این‌جا فقط پیش‌بررسی تا فایلِ آشکارا نامعتبر اصلا آپلود نشه).
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXT = /\.(jpe?g|png|webp|pdf)$/i;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

const STATUS_COLOR: Record<VerificationStatus, string> = {
  NOT_PROVIDED: "var(--muted)",
  PENDING: "#e0a636",
  VERIFIED: "var(--accent)",
  REJECTED: "#E05252",
};

type Target = { key: string; kind: "IDENTITY" | "CERTIFICATE"; category: string | null };

/** آپلود با XHR تا درصد پیشرفت واقعی داشته باشیم (fetch پیشرفتِ آپلود نمی‌ده) */
function uploadWithProgress(form: FormData, onProgress: (p: number) => void): Promise<{ ok: boolean; status: number; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/mentors/me/documents");
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let msg: string | undefined;
      try { const j = JSON.parse(xhr.responseText || "null"); if (j && typeof j.error === "string") msg = j.error; } catch { /* پاسخِ غیرِJSON */ }
      const ok = xhr.status >= 200 && xhr.status < 300;
      resolve({ ok, status: xhr.status, error: ok ? undefined : msg || statusMessage(xhr.status) });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, error: statusMessage(0) });
    xhr.ontimeout = () => resolve({ ok: false, status: 0, error: statusMessage(0) });
    xhr.send(form);
  });
}

export function MentorProfileVerification({ profile, onChanged }: { profile: MentorSelf | null; onChanged: () => void }) {
  if (!profile) {
    return (
      <div id="verification">
        <AccountBlock title="احراز هویت و مدارک" icon={<BadgeCheck size={15} />} index={3}>
          <MentorDashEmpty>اول پروفایل رو ذخیره کن؛ بعد می‌تونی مدرک شناسایی و مدارک تخصصی‌ات رو بفرستی.</MentorDashEmpty>
        </AccountBlock>
      </div>
    );
  }

  const cats = profile.categories.filter(isMentorCategory);
  return (
    <div id="verification" style={{ scrollMarginTop: 80 }}>
      <AccountBlock
        title="احراز هویت و مدارک" icon={<BadgeCheck size={15} />} index={3}
        desc="فقط JPG، PNG، WebP یا PDF تا ۵ مگابایت. ارسال مدرک جدید، وضعیت رو دوباره «در انتظار بررسی» می‌کنه."
      >
        <p className="m-0 flex items-start gap-1.5 text-[11.5px] leading-6 text-dash-muted">
          <Lock size={13} className="mt-1 shrink-0 text-dash-green" />
          مدارک فقط برای خودت و ادمین‌های آریون قابل مشاهده‌ست؛ شاگردها و کاربرهای دیگه فقط نشانِ «تأییدشده» رو می‌بینن.
        </p>
      </AccountBlock>

      <MentorProfileDocCard
        title="مدرک شناسایی"
        hint="کارت ملی یا گذرنامه — عکس واضح و خوانا"
        icon={<IdCard size={15} />}
        status={profile.identityStatus}
        rejectReason={profile.identityRejectReason}
        target={{ key: "IDENTITY", kind: "IDENTITY", category: null }}
        docs={profile.documents.filter((d) => d.kind === "IDENTITY")}
        onChanged={onChanged}
      />

      {cats.length === 0 ? (
        <AccountBlock title="مدارک تخصصی" icon={<Award size={15} />} index={5}>
          <MentorDashEmpty>برای ارسال مدرک تخصصی، اول در بالا حداقل یک دسته انتخاب و ذخیره کن.</MentorDashEmpty>
        </AccountBlock>
      ) : cats.map((c) => {
        const cred = profile.credentials.find((x) => x.category === c);
        return (
          <MentorProfileDocCard
            key={c}
            title={MENTOR_CATEGORY_META[c].certLabel}
            hint={`برای دسته‌ی «${MENTOR_CATEGORY_META[c].label}»`}
            icon={<Award size={15} />}
            status={cred?.status ?? "NOT_PROVIDED"}
            rejectReason={cred?.rejectReason ?? null}
            target={{ key: "CERT:" + c, kind: "CERTIFICATE", category: c }}
            docs={profile.documents.filter((d) => d.kind === "CERTIFICATE" && d.category === c)}
            onChanged={onChanged}
          />
        );
      })}
    </div>
  );
}

function MentorProfileDocCard({
  title, hint, icon, status, rejectReason, target, docs, onChanged,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  status: VerificationStatus;
  rejectReason: string | null;
  target: Target;
  docs: MentorDocumentMeta[];
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const uploading = progress !== null;
  const canDelete = status !== "VERIFIED";

  async function pick(file: File) {
    setError(null);
    setOkMsg(null);
    if (file.size === 0) { setError("فایل خالیه"); return; }
    if (file.size > MAX_BYTES) { setError(`حجم فایل حداکثر ۵ مگابایته (این فایل ${formatBytes(file.size)} است)`); return; }
    const typeOk = file.type ? ALLOWED_MIME.includes(file.type) : ALLOWED_EXT.test(file.name);
    if (!typeOk) { setError("فقط تصویر (JPG/PNG/WebP) یا PDF قابل قبوله"); return; }

    const form = new FormData();
    form.append("file", file, file.name);
    form.append("kind", target.kind);
    if (target.category) form.append("category", target.category);
    setProgress(0);
    const r = await uploadWithProgress(form, setProgress);
    setProgress(null);
    if (!r.ok) { setError(r.error || statusMessage(r.status)); return; }
    setOkMsg("مدرک ارسال شد و در صف بررسی قرار گرفت");
    onChanged();
  }

  async function download(doc: MentorDocumentMeta) {
    if (busyDoc) return;
    setError(null);
    setBusyDoc(doc.id + ":get");
    try {
      const res = await fetch(`/api/mentors/me/documents/${doc.id}`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error || statusMessage(res.status));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setError(statusMessage(0));
    } finally {
      setBusyDoc(null);
    }
  }

  async function remove(doc: MentorDocumentMeta) {
    if (busyDoc) return;
    setError(null);
    setOkMsg(null);
    setBusyDoc(doc.id + ":del");
    const r = await mentorApi<unknown>(`/api/mentors/me/documents/${doc.id}`, { method: "DELETE" });
    setBusyDoc(null);
    setConfirmDel(null);
    if (!r.ok) { setError(r.error); return; }
    onChanged();
  }

  return (
    <AccountBlock title={title} icon={icon} index={4}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11.5px] text-dash-muted">{hint}</span>
        <span className="text-[12px] font-bold" style={{ color: STATUS_COLOR[status] }}>{VERIFICATION_LABELS[status]}</span>
      </div>
      {status === "REJECTED" && (
        <div className="mt-2 rounded-[12px] border px-3 py-2 text-[11.5px] leading-6" style={{ borderColor: "rgba(224,82,82,.35)", color: "#E05252" }}>
          {rejectReason ? `دلیل رد: ${rejectReason}` : "مدرک رد شد"} — لطفا مدرک اصلاح‌شده رو دوباره بفرست.
        </div>
      )}
      {status === "VERIFIED" && (
        <p className="mb-0 mt-2 text-[11px] leading-6 text-dash-muted">تأییدشده. مدارکِ تأییدشده قابل حذف نیستن؛ ارسال مدرک جدید وضعیت رو دوباره به «در انتظار بررسی» برمی‌گردونه.</p>
      )}

      <div className="mt-3">
        {docs.length === 0 ? (
          <MentorDashEmpty>هنوز فایلی نفرستادی.</MentorDashEmpty>
        ) : docs.map((d) => (
          <div key={d.id} className="flex items-center gap-2.5 border-b border-dash-border py-2.5 last:border-b-0">
            <span className="shrink-0 text-dash-green">{d.mimeType === "application/pdf" ? <FileText size={17} /> : <ImageIcon size={17} />}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-bold text-dash-text" dir="auto">{d.fileName}</div>
              <div className="text-[10.5px] text-dash-muted">{formatBytes(d.sizeBytes)} · {fmtDate(d.createdAt)}</div>
            </div>
            {confirmDel === d.id ? (
              <>
                <button type="button" className="account-outline-btn" style={{ padding: "5px 10px", fontSize: 11.5, borderColor: "rgba(224,82,82,.55)", color: "#E05252" }} disabled={!!busyDoc} onClick={() => remove(d)}>
                  {busyDoc === d.id + ":del" ? <Spinner size={12} /> : "حذف شود"}
                </button>
                <button type="button" className="account-outline-btn muted" style={{ padding: "5px 10px", fontSize: 11.5 }} disabled={!!busyDoc} onClick={() => setConfirmDel(null)}>انصراف</button>
              </>
            ) : (
              <>
                <button type="button" className="account-outline-btn muted" style={{ padding: "5px 9px" }} disabled={!!busyDoc} onClick={() => download(d)} aria-label={`دریافت ${d.fileName}`}>
                  {busyDoc === d.id + ":get" ? <Spinner size={12} /> : <Download size={14} />}
                </button>
                {canDelete && (
                  <button type="button" className="account-outline-btn muted" style={{ padding: "5px 9px" }} disabled={!!busyDoc || uploading} onClick={() => setConfirmDel(d.id)} aria-label={`حذف ${d.fileName}`}>
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {uploading && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="mb-1 flex justify-between text-[11px] text-dash-muted">
            <span>در حال آپلود…</span>
            <span>{fa(Math.round((progress ?? 0) * 100))}٪</span>
          </div>
          <div className="rp-bar"><span style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} /></div>
        </div>
      )}
      {error && <div className="form-inline-error" role="alert">{error}</div>}
      {okMsg && !error && <div className="mt-2.5 text-center text-[12px] font-bold text-dash-green" role="status">{okMsg}</div>}

      <div className="mt-3 flex justify-end">
        <button type="button" className="account-outline-btn" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Spinner size={14} /> : <><Upload size={14} /> {docs.length ? "ارسال فایل دیگر" : "ارسال مدرک"}</>}
        </button>
        <input
          ref={inputRef} type="file" accept={ACCEPT} style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }}
        />
      </div>
    </AccountBlock>
  );
}
