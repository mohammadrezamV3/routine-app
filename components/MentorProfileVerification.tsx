"use client";

import { useRef, useState } from "react";
import {
  Award, BadgeCheck, CircleSlash, Download, FileText, Hourglass, IdCard, Image as ImageIcon, Trash2, Upload, XCircle,
} from "lucide-react";
import { Spinner } from "./Spinner";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { fa, formatBytes, mentorApi, statusMessage } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorEmpty, MentorNotice, MentorRow, MentorSection } from "./MentorUI";
import { fmtDate } from "@/lib/mentorFormat";
import { MENTOR_CATEGORY_META, VERIFICATION_LABELS, isMentorCategory } from "@/lib/mentorCategories";
import type { MentorDocumentMeta, MentorSelf, VerificationStatus } from "@/lib/mentorTypes";

// همان محدودیت‌های lib/mentorUpload.ts (تصمیم نهایی با سرور و magic bytes است؛
// این‌جا فقط پیش‌بررسی تا فایل آشکارا نامعتبر آپلود نشود).
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXT = /\.(jpe?g|png|webp|pdf)$/i;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

const ic = (Icon: typeof Award, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Target = { kind: "IDENTITY" | "CERTIFICATE"; category: string | null };

/** آپلود با XHR تا درصد پیشرفت واقعی داشته باشیم (fetch پیشرفت آپلود نمی‌دهد) */
function uploadWithProgress(form: FormData, onProgress: (p: number) => void): Promise<{ ok: boolean; status: number; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/mentors/me/documents");
    xhr.responseType = "text";
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let msg: string | undefined;
      try { const j = JSON.parse(xhr.responseText || "null"); if (j && typeof j.error === "string") msg = j.error; } catch { /* پاسخ غیر JSON */ }
      const ok = xhr.status >= 200 && xhr.status < 300;
      resolve({ ok, status: xhr.status, error: ok ? undefined : msg || statusMessage(xhr.status) });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, error: statusMessage(0) });
    xhr.ontimeout = () => resolve({ ok: false, status: 0, error: statusMessage(0) });
    xhr.send(form);
  });
}

/** چیپ وضعیت یک مدرک — یک خط، فرم بلند برچسب (چیپ ردیف را برای خودش دارد) */
function StatusChip({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "PENDING": return <MentorChip tone="info" icon={ic(Hourglass, MI.chip)}>{VERIFICATION_LABELS.PENDING}</MentorChip>;
    case "VERIFIED": return <MentorChip tone="accent" icon={ic(BadgeCheck, MI.chip)}>{VERIFICATION_LABELS.VERIFIED}</MentorChip>;
    case "REJECTED": return <MentorChip tone="danger" icon={ic(XCircle, MI.chip)}>{VERIFICATION_LABELS.REJECTED}</MentorChip>;
    default: return <MentorChip tone="neutral" icon={ic(CircleSlash, MI.chip)}>{VERIFICATION_LABELS.NOT_PROVIDED}</MentorChip>;
  }
}

/**
 * احراز هویت و مدارک: یک بخش، یک ردیف برای هر مدرک (شناسایی + یک مدرک
 * تخصصی برای هر حوزه) با چیپ وضعیت، فهرست فایل‌ها و دکمه‌ی ارسال.
 */
export function MentorProfileVerification({ profile, onChanged }: { profile: MentorSelf | null; onChanged: () => void }) {
  const title = "احراز هویت و مدارک";
  const icon = ic(BadgeCheck, MI.section);

  if (!profile) {
    return (
      <MentorSection id="verification" title={title} icon={icon}>
        <MentorEmpty>پس از ساخت پروفایل، می‌توانی مدرک بفرستی</MentorEmpty>
      </MentorSection>
    );
  }

  const cats = profile.categories.filter(isMentorCategory);
  return (
    <MentorSection id="verification" title={title} icon={icon}>
      <MentorDocRow
        title="مدرک شناسایی"
        hint="کارت ملی یا گذرنامه؛ برای نمایش در فهرست مربی‌ها لازم است"
        icon={ic(IdCard, MI.row)}
        status={profile.identityStatus}
        rejectReason={profile.identityRejectReason}
        target={{ kind: "IDENTITY", category: null }}
        docs={profile.documents.filter((d) => d.kind === "IDENTITY")}
        onChanged={onChanged}
      />
      {cats.length === 0 ? (
        <MentorEmpty>برای ارسال مدرک تخصصی، یک حوزه انتخاب و ذخیره کن</MentorEmpty>
      ) : cats.map((c) => {
        const cred = profile.credentials.find((x) => x.category === c);
        return (
          <MentorDocRow
            key={c}
            title={MENTOR_CATEGORY_META[c].certLabel}
            hint={`${MENTOR_CATEGORY_META[c].label}؛ اختیاری`}
            icon={ic(Award, MI.row)}
            status={cred?.status ?? "NOT_PROVIDED"}
            rejectReason={cred?.rejectReason ?? null}
            target={{ kind: "CERTIFICATE", category: c }}
            docs={profile.documents.filter((d) => d.kind === "CERTIFICATE" && d.category === c)}
            onChanged={onChanged}
          />
        );
      })}
      <p className="mentor-field-hint mentor-doc-rules">JPG، PNG، WebP یا PDF تا 5 مگابایت؛ فقط تو و ادمین‌های آریون فایل‌ها را می‌بینید</p>
    </MentorSection>
  );
}

function MentorDocRow({
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
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<MentorDocumentMeta | null>(null);
  const [delError, setDelError] = useState<string | null>(null);

  const uploading = progress !== null;
  const canDelete = status !== "VERIFIED";

  async function pick(file: File) {
    setError(null);
    if (file.size === 0) { setError("فایل خالی است"); return; }
    if (file.size > MAX_BYTES) { setError(`حجم فایل حداکثر 5 مگابایت است؛ این فایل ${formatBytes(file.size)} است`); return; }
    const typeOk = file.type ? ALLOWED_MIME.includes(file.type) : ALLOWED_EXT.test(file.name);
    if (!typeOk) { setError("فقط تصویر (JPG، PNG، WebP) یا PDF پذیرفته می‌شود"); return; }

    const form = new FormData();
    form.append("file", file, file.name);
    form.append("kind", target.kind);
    if (target.category) form.append("category", target.category);
    setProgress(0);
    const r = await uploadWithProgress(form, setProgress);
    setProgress(null);
    if (!r.ok) { setError(r.error || statusMessage(r.status)); return; }
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
    setDelError(null);
    setBusyDoc(doc.id + ":del");
    const r = await mentorApi<unknown>(`/api/mentors/me/documents/${doc.id}`, { method: "DELETE" });
    setBusyDoc(null);
    if (!r.ok) { setDelError(r.error); return; }
    setConfirmDel(null);
    onChanged();
  }

  const pctNow = Math.round((progress ?? 0) * 100);

  return (
    <MentorRow
      lead={icon}
      title={title}
      sub={<span>{status === "VERIFIED" ? "مدرک تاییدشده حذف نمی‌شود؛ فایل تازه آن را به صف بررسی برمی‌گرداند" : hint}</span>}
      end={<StatusChip status={status} />}
      below={
        <>
          {status === "REJECTED" && (
            <MentorNotice tone="danger" icon={ic(XCircle, MI.row)} title="مدرک رد شد">
              {rejectReason || "فایل اصلاح‌شده را دوباره بفرست"}
            </MentorNotice>
          )}

          {docs.length > 0 && (
            <div className="mentor-list">
              {docs.map((d) => (
                <MentorRow
                  key={d.id}
                  lead={d.mimeType === "application/pdf" ? ic(FileText, MI.row) : ic(ImageIcon, MI.row)}
                  title={<span className="mentor-file-name" dir="auto">{d.fileName}</span>}
                  sub={<><span>{formatBytes(d.sizeBytes)}</span><span>{fmtDate(d.createdAt)}</span></>}
                  end={
                    <>
                      <button
                        type="button" className="trade-icon-btn" disabled={!!busyDoc}
                        onClick={() => download(d)} aria-label={`دریافت ${d.fileName}`}
                      >
                        {busyDoc === d.id + ":get" ? <Spinner size={14} /> : <Download size={MI.btnSm} strokeWidth={MI_STROKE} />}
                      </button>
                      {canDelete && (
                        <button
                          type="button" className="trade-icon-btn danger" disabled={!!busyDoc || uploading}
                          onClick={() => { setDelError(null); setConfirmDel(d); }} aria-label={`حذف ${d.fileName}`}
                        >
                          <Trash2 size={MI.btnSm} strokeWidth={MI_STROKE} />
                        </button>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}

          {error && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{error}</div>}

          <div className="mentor-btn-group is-end">
            <button
              type="button" className="account-outline-btn mentor-btn is-sm" disabled={uploading}
              onClick={() => inputRef.current?.click()}
              aria-label={uploading ? `در حال ارسال، ${fa(pctNow)} درصد` : undefined}
            >
              {uploading
                ? <><Spinner size={14} /> {fa(pctNow)}٪</>
                : <>{ic(Upload, MI.btnSm)} {docs.length ? "افزودن فایل" : "ارسال مدرک"}</>}
            </button>
            <input
              ref={inputRef} type="file" accept={ACCEPT} hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }}
            />
          </div>

          {confirmDel && (
            <MentorConfirmDialog
              message={`«${confirmDel.fileName}» حذف شود؟`}
              hint="فایل حذف‌شده برای بررسی ادمین در دسترس نیست"
              confirmLabel="حذف فایل"
              busy={busyDoc === confirmDel.id + ":del"}
              error={delError}
              onConfirm={() => remove(confirmDel)}
              onCancel={() => { setConfirmDel(null); setDelError(null); }}
            />
          )}
        </>
      }
    />
  );
}
