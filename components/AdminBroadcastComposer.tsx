"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TickOption } from "@/components/TickOption";
import { formatNumber } from "@/lib/adminFormat";
import {
  BROADCAST_BODY_MAX, BROADCAST_MODULES, BROADCAST_MODULE_LABEL, BROADCAST_SEGMENTS, BROADCAST_SEGMENT_LABEL, BROADCAST_TITLE_MAX,
  isSafeBroadcastPath, type BroadcastChannel, type BroadcastModule, type BroadcastRecord, type BroadcastSegment, type BroadcastSegmentKind,
} from "@/lib/broadcast";

type Estimate = { total: number; withPush: number };

export function AdminBroadcastComposer({ onSent }: { onSent: (b: Omit<BroadcastRecord, "cursor" | "leaseUntil" | "runs">) => void }) {
  const toast = useAdminToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [inapp, setInapp] = useState(true);
  const [push, setPush] = useState(false);
  const [kind, setKind] = useState<BroadcastSegmentKind>("all");
  const [module, setModule] = useState<BroadcastModule>("EXERCISE");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [sendAtLocal, setSendAtLocal] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segment: BroadcastSegment = useMemo(() => (kind === "module" ? { kind, module } : { kind }), [kind, module]);
  const channels = useMemo<BroadcastChannel[]>(() => [...(inapp ? (["inapp"] as const) : []), ...(push ? (["push"] as const) : [])], [inapp, push]);

  useEffect(() => {
    let cancelled = false;
    setEstimating(true);
    const t = setTimeout(() => {
      adminFetch<Estimate>("/api/admin/broadcast/estimate", { method: "POST", json: { segment } })
        .then((d) => { if (!cancelled) setEstimate(d); })
        .catch(() => { if (!cancelled) setEstimate(null); })
        .finally(() => { if (!cancelled) setEstimating(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [segment]);

  // هر تغییری در فرم، تایید دومرحله‌ای را لغو می‌کند
  useEffect(() => { setConfirming(false); }, [title, body, url, inapp, push, kind, module, when, sendAtLocal]);

  function validate(): string | null {
    if (!title.trim()) return "عنوان را بنویس";
    if (!body.trim()) return "متن پیام را بنویس";
    if (url.trim() && !isSafeBroadcastPath(url.trim())) return "لینک باید مسیر داخل اپ باشد (با / شروع شود)";
    if (channels.length === 0) return "حداقل یک کانال انتخاب کن";
    if (when === "later") {
      const t = sendAtLocal ? new Date(sendAtLocal) : null;
      if (!t || Number.isNaN(t.getTime())) return "زمان ارسال را انتخاب کن";
      if (t.getTime() <= Date.now() + 60_000) return "زمان ارسال باید در آینده باشد";
    }
    return null;
  }

  async function send() {
    if (busy) return;
    const v = validate();
    setError(v);
    if (v) return;
    // ارسال به جمع بزرگ یا غیرآزمایشی: تایید دوم
    if (!confirming && kind !== "admins") { setConfirming(true); return; }
    setBusy(true);
    try {
      const res = await adminFetch<{ broadcast: Omit<BroadcastRecord, "cursor" | "leaseUntil" | "runs"> }>("/api/admin/broadcast", {
        method: "POST",
        json: {
          title: title.trim(), body: body.trim(), url: url.trim() || null, channels, segment,
          sendAt: when === "later" ? new Date(sendAtLocal).toISOString() : null,
        },
      });
      toast(when === "later" ? "پیام زمان‌بندی شد" : "ارسال شروع شد");
      onSent(res.broadcast);
      setTitle(""); setBody(""); setUrl(""); setConfirming(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const recipients = estimate ? (push && !inapp ? estimate.withPush : estimate.total) : null;

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-head"><span className="admin-chart-title">پیام جدید</span></div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} noValidate>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-full">
            <span>عنوان ({title.length}/{BROADCAST_TITLE_MAX})</span>
            <input className="admin-input" maxLength={BROADCAST_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="admin-field admin-field-full">
            <span>متن ({body.length}/{BROADCAST_BODY_MAX})</span>
            <textarea className="admin-input" rows={4} maxLength={BROADCAST_BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <label className="admin-field admin-field-full">
            <span>لینک داخل اپ (اختیاری)</span>
            <input className="admin-input admin-ltr" dir="ltr" placeholder="/dashboard" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>مخاطب</span>
            <select className="admin-input" value={kind} onChange={(e) => setKind(e.target.value as BroadcastSegmentKind)}>
              {BROADCAST_SEGMENTS.map((k) => <option key={k} value={k}>{BROADCAST_SEGMENT_LABEL[k]}</option>)}
            </select>
          </label>
          {kind === "module" && (
            <label className="admin-field">
              <span>ماژول</span>
              <select className="admin-input" value={module} onChange={(e) => setModule(e.target.value as BroadcastModule)}>
                {BROADCAST_MODULES.map((m) => <option key={m} value={m}>{BROADCAST_MODULE_LABEL[m]}</option>)}
              </select>
            </label>
          )}
          <div className="admin-field">
            <span>کانال</span>
            <TickOption checked={inapp} onChange={setInapp}>اعلان درون‌برنامه‌ای</TickOption>
            <TickOption checked={push} onChange={setPush}>اعلان پوش مرورگر</TickOption>
          </div>
          <div className="admin-field">
            <span>زمان ارسال</span>
            <SegmentedTabs<"now" | "later">
              ariaLabel="زمان ارسال"
              active={when}
              onChange={setWhen}
              options={[{ value: "now", label: "همین الان" }, { value: "later", label: "زمان‌بندی" }]}
            />
            {when === "later" && (
              <input type="datetime-local" className="admin-input" value={sendAtLocal} onChange={(e) => setSendAtLocal(e.target.value)} />
            )}
          </div>
        </div>

        <div className="admin-section-hint admin-settings-hint" aria-live="polite">
          {estimating && recipients == null ? "در حال محاسبه‌ی گیرنده‌ها…" : recipients == null ? "تخمین گیرنده در دسترس نیست" : (
            <>
              تعداد گیرنده‌ی تخمینی: <b>{formatNumber(recipients)}</b> نفر
              {push && estimate ? <> · دستگاه پوش‌دار: {formatNumber(estimate.withPush)} نفر</> : null}
            </>
          )}
        </div>

        {error && <div className="admin-form-error" role="alert">{error}</div>}
        <div className="admin-modal-actions">
          <button type="submit" className="admin-btn primary" disabled={busy}>
            {busy ? "در حال ارسال…" : confirming && recipients != null
              ? `تایید ارسال به ${formatNumber(recipients)} نفر`
              : when === "later" ? "زمان‌بندی پیام" : kind === "admins" ? "ارسال آزمایشی" : "ارسال پیام"}
          </button>
          {confirming && !busy && <button type="button" className="admin-btn" onClick={() => setConfirming(false)}>انصراف</button>}
        </div>
      </form>
    </div>
  );
}
