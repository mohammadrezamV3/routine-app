"use client";

import { CSSProperties, useEffect, useState } from "react";
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

  // بخش‌بندیِ کارت دقیقا همان بخش‌هایی‌ست که کاربر موقعِ «افزودن» پر می‌کند
  // (تب‌های TradeFormModal): اطلاعات / دلایل / چک‌لیست / عکس‌ها / برچسب‌ها /
  // احساسات — تا خواندنِ معامله همان نقشه‌ی ذهنیِ نوشتنش را داشته باشد.
  const row = (k: string, v: string | null | undefined): [string, string][] =>
    v === null || v === undefined || v === "" ? [] : [[k, v]];

  const coreRows: [string, string][] = entry
    ? [
        ["جهت", DIRECTION_LABELS[entry.direction]],
        ["وضعیت", STATUS_LABELS[entry.status]],
        ["نتیجه", RESULT_LABELS[entry.result]],
        ["حجم", `${faNum(entry.volume)} ${entry.volumeUnit === "LOT" ? "لات" : "دلار"}`],
        ["زمان ورود", formatTradeDateTime(entry.openedAt, calSystem)],
        ...row("زمان خروج", entry.closedAt ? formatTradeDateTime(entry.closedAt, calSystem) : null),
        ...row("تایم فریم", entry.timeframe),
        ...row("قیمت ورود", entry.entryPrice !== null ? faNum(entry.entryPrice) : null),
        ...row("قیمت خروج", entry.exitPrice !== null ? faNum(entry.exitPrice) : null),
        ...row("حد ضرر", entry.stopLoss !== null ? faNum(entry.stopLoss) : null),
        ...row("حد سود", entry.takeProfit !== null ? faNum(entry.takeProfit) : null),
        ...row("کمیسیون", entry.commission !== null ? faNum(entry.commission) : null),
        ...row("سواپ", entry.swap !== null ? faNum(entry.swap) : null),
        ...row("ریسک اولیه", entry.riskAmount !== null ? `${faNum(entry.riskAmount)} ${currency}` : null),
        ...row("R", entry.rMultiple !== null ? `${entry.rMultiple > 0 ? "+" : ""}${faNum(entry.rMultiple)}` : null),
        ...row("جلسه", entry.sessions.length ? entry.sessions.map((s) => SESSION_LABELS[s]).join("، ") : null),
        ...row("ستاپ", entry.setup),
        ...row("ریسک‌فری", entry.riskFree ? "بله" : null),
      ]
    : [];

  const emotionRows: [string, string][] = entry
    ? [
        ...row("میزان اطمینان", entry.confidence !== null ? `${faNum(entry.confidence)} از ۱۰` : null),
        ...row("حال قبل از معامله", entry.emotionBefore ? EMOTION_BEFORE_LABELS[entry.emotionBefore] : null),
        ...row("حال بعد از معامله", entry.emotionAfter ? EMOTION_AFTER_LABELS[entry.emotionAfter] : null),
        ...row("طبق پلن", entry.followedPlan !== null ? (entry.followedPlan ? "بله" : "خیر") : null),
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
            <Section title="اطلاعات">
              <div className="trade-detail-grid">
                {coreRows.map(([k, v]) => (
                  <div key={k} className="trade-detail-cell">
                    <span>{k}</span>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
            </Section>

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

            {!!entry.images.length && (
              <Section title="عکس‌ها">
                <div className="trade-image-grid">
                  {entry.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={img.dataUrl} alt="تصویر معامله" className="trade-image-thumb" onClick={() => setLightbox(img.dataUrl)} />
                  ))}
                </div>
              </Section>
            )}

            {!!entry.tags.length && (
              <Section title="برچسب‌ها">
                <div className="trade-tag-row">
                  {entry.tags.map((t) => (
                    <span key={t.id} className="trade-tag-chip active" style={{ "--tag-c": t.color } as CSSProperties}>
                      <span className="trade-tag-dot" style={{ background: t.color }} />{t.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {!!emotionRows.length && (
              <Section title="احساسات">
                <div className="trade-detail-grid">
                  {emotionRows.map(([k, v]) => (
                    <div key={k} className="trade-detail-cell">
                      <span>{k}</span>
                      <b>{v}</b>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {entry.note && <Section title="نکات معامله"><p className="trade-detail-note">{entry.note}</p></Section>}
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
