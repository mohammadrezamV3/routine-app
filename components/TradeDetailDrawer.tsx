"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { faNum } from "@/lib/jalali";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import { SESSION_LABELS } from "@/lib/forexSessions";
import {
  CalSystem, DIRECTION_LABELS, EMOTION_AFTER_LABELS, EMOTION_BEFORE_LABELS,
  ENTRY_REASON_LABELS, EXIT_REASON_LABELS, RESULT_LABELS, STATUS_LABELS,
  TradeEntryDetail,
} from "@/lib/tradeTypes";

// جزئیات کامل یک معامله. عمدا کشویی (نه صفحه‌ی جدا): کاربر معمولا چند
// معامله را پشت‌سرهم مرور می‌کند و برگشتن به لیست نباید هربار یک ناوبری
// کامل باشد. تصاویر و اسنپ‌شات چک‌لیست فقط همین‌جا (نه در لیست) لود می‌شوند.
export function TradeDetailDrawer({
  entryId,
  calSystem,
  currency,
  onClose,
  onEdit,
  onDelete,
}: {
  entryId: string;
  calSystem: CalSystem;
  currency: string;
  onClose: () => void;
  onEdit: (entry: TradeEntryDetail) => void;
  onDelete: () => void;
}) {
  const [entry, setEntry] = useState<TradeEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/trade/entries/${entryId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setEntry(d?.entry || null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entryId]);

  if (typeof document === "undefined") return null;

  const rows: [string, string][] = entry
    ? [
        ["جهت", DIRECTION_LABELS[entry.direction]],
        ["وضعیت", STATUS_LABELS[entry.status]],
        ["نتیجه", RESULT_LABELS[entry.result]],
        ["حجم", `${faNum(entry.volume)} ${entry.volumeUnit === "LOT" ? "لات" : "دلار"}`],
        ["زمان ورود", formatTradeDateTime(entry.openedAt, calSystem)],
        ...(entry.closedAt ? ([["زمان خروج", formatTradeDateTime(entry.closedAt, calSystem)]] as [string, string][]) : []),
        ...(entry.timeframe ? ([["تایم فریم", entry.timeframe]] as [string, string][]) : []),
        ...(entry.entryPrice !== null ? ([["قیمت ورود", faNum(entry.entryPrice)]] as [string, string][]) : []),
        ...(entry.exitPrice !== null ? ([["قیمت خروج", faNum(entry.exitPrice)]] as [string, string][]) : []),
        ...(entry.stopLoss !== null ? ([["حد ضرر", faNum(entry.stopLoss)]] as [string, string][]) : []),
        ...(entry.takeProfit !== null ? ([["حد سود", faNum(entry.takeProfit)]] as [string, string][]) : []),
        ...(entry.commission !== null ? ([["کمیسیون", faNum(entry.commission)]] as [string, string][]) : []),
        ...(entry.swap !== null ? ([["سواپ", faNum(entry.swap)]] as [string, string][]) : []),
        ...(entry.riskAmount !== null ? ([["ریسک اولیه", `${faNum(entry.riskAmount)} ${currency}`]] as [string, string][]) : []),
        ...(entry.rMultiple !== null ? ([["R", `${entry.rMultiple > 0 ? "+" : ""}${faNum(entry.rMultiple)}`]] as [string, string][]) : []),
        ...(entry.sessions.length ? ([["جلسه", entry.sessions.map((s) => SESSION_LABELS[s]).join("، ")]] as [string, string][]) : []),
        ...(entry.setup ? ([["ستاپ", entry.setup]] as [string, string][]) : []),
        ...(entry.riskFree ? ([["ریسک‌فری", "بله"]] as [string, string][]) : []),
        ...(entry.confidence !== null ? ([["میزان اطمینان", `${faNum(entry.confidence)} از ۱۰`]] as [string, string][]) : []),
        ...(entry.emotionBefore ? ([["حال قبل از معامله", EMOTION_BEFORE_LABELS[entry.emotionBefore]]] as [string, string][]) : []),
        ...(entry.emotionAfter ? ([["حال بعد از معامله", EMOTION_AFTER_LABELS[entry.emotionAfter]]] as [string, string][]) : []),
        ...(entry.followedPlan !== null ? ([["طبق پلن", entry.followedPlan ? "بله" : "خیر"]] as [string, string][]) : []),
      ]
    : [];

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="trade-drawer open" role="dialog" aria-modal="true">
        <div className="trade-drawer-head">
          <div>
            <div className="modal-eyebrow mono">{entry?.symbol || "..."}</div>
            <div className="modal-title">
              {entry
                ? entry.status === "CLOSED"
                  ? `${entry.pnl >= 0 ? "+" : ""}${faNum(entry.pnl.toFixed(2))} ${currency}`
                  : STATUS_LABELS[entry.status]
                : ""}
            </div>
          </div>
          <div className="trade-drawer-actions">
            <button type="button" className="trade-icon-btn" disabled={!entry}
              onClick={() => entry && onEdit(entry)} aria-label="ویرایش"><Pencil size={16} /></button>
            <button type="button" className="trade-icon-btn danger" onClick={() => setConfirmDelete(true)} aria-label="حذف"><Trash2 size={16} /></button>
            <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
          </div>
        </div>

        {loading && <div className="item-line is-loading">در حال بارگذاری...</div>}
        {!loading && !entry && <div className="item-line empty">معامله پیدا نشد</div>}

        {entry && (
          <>
            {!!entry.tags.length && (
              <div className="trade-tag-row">
                {entry.tags.map((t) => (
                  <span key={t.id} className="trade-tag-chip active" style={{ borderColor: t.color, color: t.color }}>
                    <span className="trade-tag-dot" style={{ background: t.color }} />{t.name}
                  </span>
                ))}
              </div>
            )}

            <div className="trade-detail-grid">
              {rows.map(([k, v]) => (
                <div key={k} className="trade-detail-cell">
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>

            {!!entry.entryReasons.length && (
              <Section title="دلایل ورود">
                <div className="trade-choice-grid readonly">
                  {entry.entryReasons.map((r) => <span key={r} className="trade-choice active">{ENTRY_REASON_LABELS[r]}</span>)}
                </div>
                {entry.entryReasonNote && <p className="trade-detail-note">{entry.entryReasonNote}</p>}
              </Section>
            )}

            {!!entry.exitReasons.length && (
              <Section title="دلایل خروج">
                <div className="trade-choice-grid readonly">
                  {entry.exitReasons.map((r) => <span key={r} className="trade-choice active">{EXIT_REASON_LABELS[r]}</span>)}
                </div>
                {entry.exitReasonNote && <p className="trade-detail-note">{entry.exitReasonNote}</p>}
              </Section>
            )}

            {entry.checklistSnapshot && entry.checklistSnapshot.length > 0 && (
              <Section title={`چک‌لیست: ${entry.checklistName || ""}`}>
                <div className="trade-checklist-progress">
                  <b className="mono">{faNum(entry.checklistDone ?? 0)} / {faNum(entry.checklistTotal ?? 0)}</b>
                  <span>وضعیت در لحظه‌ی ثبت</span>
                </div>
                <div className="trade-checklist-items">
                  {entry.checklistSnapshot.map((i, idx) => (
                    <div key={idx} className={`trade-check-row readonly${i.checked ? " done" : ""}`}>
                      <span className="trade-check-box" />
                      <span>{i.text}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {entry.note && <Section title="نکات معامله"><p className="trade-detail-note">{entry.note}</p></Section>}

            {!!entry.images.length && (
              <Section title="تصاویر">
                <div className="trade-image-grid">
                  {entry.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={img.dataUrl} alt="تصویر معامله" className="trade-image-thumb" onClick={() => setLightbox(img.dataUrl)} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        {confirmDelete && (
          <div className="trade-inline-confirm">
            <span>این معامله برای همیشه حذف شود؟</span>
            <div className="trade-modal-actions">
              <button type="button" className="account-outline-btn" onClick={() => setConfirmDelete(false)}>لغو</button>
              <button type="button" className="trade-danger-btn" onClick={onDelete}>حذف</button>
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="trade-lightbox" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="تصویر معامله" />
        </div>
      )}
    </>,
    document.body
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="trade-detail-section">
      <div className="trade-detail-section-title">{title}</div>
      {children}
    </div>
  );
}
