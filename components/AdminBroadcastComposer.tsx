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
import { tr } from "@/lib/i18n";

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
    if (!title.trim()) return tr("عنوان را بنویس", "Write a title");
    if (!body.trim()) return tr("متن پیام را بنویس", "Write the message");
    if (url.trim() && !isSafeBroadcastPath(url.trim())) return tr("لینک باید مسیر داخل اپ باشد (با / شروع شود)", "The link must be a path inside the app (starting with /)");
    if (channels.length === 0) return tr("حداقل یک کانال انتخاب کن", "Choose at least one channel");
    if (when === "later") {
      const t = sendAtLocal ? new Date(sendAtLocal) : null;
      if (!t || Number.isNaN(t.getTime())) return tr("زمان ارسال را انتخاب کن", "Choose a send time");
      if (t.getTime() <= Date.now() + 60_000) return tr("زمان ارسال باید در آینده باشد", "The send time must be in the future");
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
      toast(when === "later" ? tr("پیام زمان‌بندی شد", "Message scheduled") : tr("ارسال شروع شد", "Sending started"));
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
      <div className="admin-chart-head"><span className="admin-chart-title">{tr("پیام جدید", "New message")}</span></div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} noValidate>
        <div className="admin-form-grid">
          <label className="admin-field admin-field-full">
            <span>{tr("عنوان", "Title")} ({title.length}/{BROADCAST_TITLE_MAX})</span>
            <input className="admin-input" maxLength={BROADCAST_TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="admin-field admin-field-full">
            <span>{tr("متن", "Message")} ({body.length}/{BROADCAST_BODY_MAX})</span>
            <textarea className="admin-input" rows={4} maxLength={BROADCAST_BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <label className="admin-field admin-field-full">
            <span>{tr("لینک داخل اپ (اختیاری)", "In-app link (optional)")}</span>
            <input className="admin-input admin-ltr" dir="ltr" placeholder="/dashboard" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>{tr("مخاطب", "Audience")}</span>
            <select className="admin-input" value={kind} onChange={(e) => setKind(e.target.value as BroadcastSegmentKind)}>
              {BROADCAST_SEGMENTS.map((k) => <option key={k} value={k}>{BROADCAST_SEGMENT_LABEL[k]}</option>)}
            </select>
          </label>
          {kind === "module" && (
            <label className="admin-field">
              <span>{tr("ماژول", "Module")}</span>
              <select className="admin-input" value={module} onChange={(e) => setModule(e.target.value as BroadcastModule)}>
                {BROADCAST_MODULES.map((m) => <option key={m} value={m}>{BROADCAST_MODULE_LABEL[m]}</option>)}
              </select>
            </label>
          )}
          <div className="admin-field">
            <span>{tr("کانال", "Channel")}</span>
            <TickOption checked={inapp} onChange={setInapp}>{tr("اعلان درون‌برنامه‌ای", "In-app notification")}</TickOption>
            <TickOption checked={push} onChange={setPush}>{tr("اعلان پوش مرورگر", "Browser push notification")}</TickOption>
          </div>
          <div className="admin-field">
            <span>{tr("زمان ارسال", "Send time")}</span>
            <SegmentedTabs<"now" | "later">
              ariaLabel={tr(tr("زمان ارسال", "Send time"), "Send time")}
              active={when}
              onChange={setWhen}
              options={[{ value: "now", label: tr("همین الان", "Right now") }, { value: "later", label: tr("زمان‌بندی", "Schedule") }]}
            />
            {when === "later" && (
              <input type="datetime-local" className="admin-input" value={sendAtLocal} onChange={(e) => setSendAtLocal(e.target.value)} />
            )}
          </div>
        </div>

        <div className="admin-section-hint admin-settings-hint" aria-live="polite">
          {estimating && recipients == null ? tr("در حال محاسبه‌ی گیرنده‌ها…", "Calculating recipients…") : recipients == null ? tr("تخمین گیرنده در دسترس نیست", "Recipient estimate unavailable") : (
            <>
              {tr("تعداد گیرنده‌ی تخمینی:", "Estimated recipients:")} <b>{formatNumber(recipients)}</b> {tr("نفر", "people")}
              {push && estimate ? <> · {tr("دستگاه پوش‌دار:", "devices with push:")} {formatNumber(estimate.withPush)} {tr("نفر", "people")}</> : null}
            </>
          )}
        </div>

        {error && <div className="admin-form-error" role="alert">{error}</div>}
        <div className="admin-modal-actions">
          <button type="submit" className="admin-btn primary" disabled={busy}>
            {busy ? tr("در حال ارسال…", "Sending…") : confirming && recipients != null
              ? tr(`تایید ارسال به ${formatNumber(recipients)} نفر`, `Confirm sending to ${formatNumber(recipients)} ${(recipients) === 1 ? "person" : "people"}`)
              : when === "later" ? tr("زمان‌بندی پیام", "Schedule message") : kind === "admins" ? tr("ارسال آزمایشی", "Test send") : tr("ارسال پیام", "Send message")}
          </button>
          {confirming && !busy && <button type="button" className="admin-btn" onClick={() => setConfirming(false)}>{tr("انصراف", "Cancel")}</button>}
        </div>
      </form>
    </div>
  );
}
