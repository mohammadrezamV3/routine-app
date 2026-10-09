"use client";

import { CSSProperties, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
import { TickButton } from "./TickButton";
import { tr } from "@/lib/i18n";

// جزئیات کامل یک معامله. عمدا کشویی (نه صفحه‌ی جدا): کاربر معمولا چند
// معامله را پشت‌سرهم مرور می‌کند و برگشتن به لیست نباید هربار یک ناوبری
// کامل باشد. تصاویر و اسنپ‌شات چک‌لیست فقط همین‌جا (نه در لیست) لود می‌شوند.
//
// حالت فقط‌خواندنی (مثلا داشبورد): بدون onEdit/onDelete. داشبورد حق نوشتن
// مستقیم روی ماژول ترید را ندارد، پس به‌جای ویرایش درجا، `editHref` کاربر
// را به صفحه‌ی همان حساب می‌برد و دکمه‌ی حذف اصلا نشان داده نمی‌شود.
export function TradeDetailDrawer({
  entryId,
  calSystem,
  currency,
  onClose,
  onEdit,
  onDelete,
  editHref,
}: {
  entryId: string;
  calSystem: CalSystem;
  currency: string;
  onClose: () => void;
  onEdit?: (entry: TradeEntryDetail) => void;
  onDelete?: () => void;
  /** فقط وقتی onEdit نیست: لینک ویرایش در صفحه‌ی حساب */
  editHref?: string;
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

  // بستن با Esc — ردیف‌ها با کیبورد باز می‌شوند، پس باید با کیبورد هم بسته شوند
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, onClose]);

  if (typeof document === "undefined") return null;

  // بخش‌بندی کارت دقیقا همان بخش‌هایی‌ست که کاربر موقع «افزودن» پر می‌کند
  // (تب‌های TradeFormModal): اطلاعات / دلایل / چک‌لیست / عکس‌ها / برچسب‌ها /
  // احساسات — تا خواندن معامله همان نقشه‌ی ذهنی نوشتنش را داشته باشد.
  const row = (k: string, v: string | null | undefined): [string, string][] =>
    v === null || v === undefined || v === "" ? [] : [[k, v]];

  const coreRows: [string, string][] = entry
    ? [
        [tr("جهت", "Direction"), DIRECTION_LABELS[entry.direction]],
        [tr("وضعیت", "Status"), STATUS_LABELS[entry.status]],
        [tr("نتیجه", "Result"), RESULT_LABELS[entry.result]],
        [tr("حجم", "Volume"), `${faNum(entry.volume)} ${entry.volumeUnit === "LOT" ? tr("لات", "lots") : tr("دلار", "USD")}`],
        [tr("زمان ورود", "Entry time"), formatTradeDateTime(entry.openedAt, calSystem)],
        ...row(tr("زمان خروج", "Exit time"), entry.closedAt ? formatTradeDateTime(entry.closedAt, calSystem) : null),
        ...row(tr("تایم فریم", "Timeframe"), entry.timeframe),
        ...row(tr("قیمت ورود", "Entry price"), entry.entryPrice !== null ? faNum(entry.entryPrice) : null),
        ...row(tr("قیمت خروج", "Exit price"), entry.exitPrice !== null ? faNum(entry.exitPrice) : null),
        ...row(tr("حد ضرر", "Stop loss"), entry.stopLoss !== null ? faNum(entry.stopLoss) : null),
        ...row(tr("حد سود", "Take profit"), entry.takeProfit !== null ? faNum(entry.takeProfit) : null),
        ...row(tr("کمیسیون", "Commission"), entry.commission !== null ? faNum(entry.commission) : null),
        ...row(tr("سواپ", "Swap"), entry.swap !== null ? faNum(entry.swap) : null),
        ...row(tr("ریسک اولیه", "Initial risk"), entry.riskAmount !== null ? `${faNum(entry.riskAmount)} ${currency}` : null),
        ...row("R", entry.rMultiple !== null ? `${entry.rMultiple > 0 ? "+" : ""}${faNum(entry.rMultiple)}` : null),
        ...row(tr("جلسه", "Session"), entry.sessions.length ? entry.sessions.map((s) => SESSION_LABELS[s]).join(tr("، ", ", ")) : null),
        ...row(tr("ستاپ", "Setup"), entry.setup),
        ...row(tr("ریسک‌فری", "Risk-free"), entry.riskFree ? tr("بله", "Yes") : null),
      ]
    : [];

  const emotionRows: [string, string][] = entry
    ? [
        ...row(tr("میزان اطمینان", "Confidence"), entry.confidence !== null ? tr(`${faNum(entry.confidence)} از 10`, `${faNum(entry.confidence)} out of 10`) : null),
        ...row(tr("حال قبل از معامله", "Mood before the trade"), entry.emotionBefore ? EMOTION_BEFORE_LABELS[entry.emotionBefore] : null),
        ...row(tr("حال بعد از معامله", "Mood after the trade"), entry.emotionAfter ? EMOTION_AFTER_LABELS[entry.emotionAfter] : null),
        ...row(tr("طبق پلن", "Followed plan"), entry.followedPlan !== null ? (entry.followedPlan ? tr("بله", "Yes") : tr("خیر", "No")) : null),
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
            {onEdit ? (
              <button type="button" className="trade-icon-btn" disabled={!entry}
                onClick={() => entry && onEdit(entry)} aria-label={tr("ویرایش", "Edit")}><Pencil size={16} /></button>
            ) : editHref ? (
              <Link href={editHref} prefetch className="trade-icon-btn" aria-label={tr("ویرایش در صفحه‌ی حساب", "Edit on the account page")} title={tr("ویرایش در صفحه‌ی حساب", "Edit on the account page")}><Pencil size={16} /></Link>
            ) : null}
            {onDelete && (
              <button type="button" className="trade-icon-btn danger" onClick={() => setConfirmDelete(true)} aria-label={tr("حذف", "Delete")}><Trash2 size={16} /></button>
            )}
            <button type="button" className="trade-icon-btn" onClick={onClose} aria-label={tr("بستن", "Close")} autoFocus><X size={16} /></button>
          </div>
        </div>

        {loading && <div className="item-line is-loading">{tr("در حال بارگذاری...", "Loading...")}</div>}
        {!loading && !entry && <div className="item-line empty">{tr("معامله پیدا نشد", "Trade not found")}</div>}

        {entry && (
          <>
            <Section title={tr("اطلاعات", "Information")}>
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
              <Section title={tr("دلایل ورود", "Entry reasons")}>
                <div className="trade-choice-grid readonly">
                  {entry.entryReasons.map((r) => <span key={r} className="trade-choice active">{ENTRY_REASON_LABELS[r]}</span>)}
                </div>
                {entry.entryReasonNote && <p className="trade-detail-note">{entry.entryReasonNote}</p>}
              </Section>
            )}

            {!!entry.exitReasons.length && (
              <Section title={tr("دلایل خروج", "Exit reasons")}>
                <div className="trade-choice-grid readonly">
                  {entry.exitReasons.map((r) => <span key={r} className="trade-choice active">{EXIT_REASON_LABELS[r]}</span>)}
                </div>
                {entry.exitReasonNote && <p className="trade-detail-note">{entry.exitReasonNote}</p>}
              </Section>
            )}

            {entry.checklistSnapshot && entry.checklistSnapshot.length > 0 && (
              <Section title={tr(`چک‌لیست: ${entry.checklistName || ""}`, `Checklist: ${entry.checklistName || ""}`)}>
                <div className="trade-checklist-progress">
                  <b className="mono">{faNum(entry.checklistDone ?? 0)} / {faNum(entry.checklistTotal ?? 0)}</b>
                  <span>{tr("وضعیت در لحظه‌ی ثبت", "Status when the trade was logged")}</span>
                </div>
                <div className="trade-checklist-items">
                  {entry.checklistSnapshot.map((i, idx) => (
                    <div key={idx} className={`trade-check-row readonly${i.checked ? " done" : ""}`}>
                      <TickButton as="span" size={20} checked={!!i.checked} />
                      <span>{i.text}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {!!entry.images.length && (
              <Section title={tr("عکس‌ها", "Images")}>
                <div className="trade-image-grid">
                  {entry.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img.id} src={img.dataUrl} alt={tr("تصویر معامله", "Trade image")} className="trade-image-thumb" onClick={() => setLightbox(img.dataUrl)} />
                  ))}
                </div>
              </Section>
            )}

            {!!entry.tags.length && (
              <Section title={tr("برچسب‌ها", "Tags")}>
                <div className="trade-tag-row">
                  {entry.tags.map((t) => (
                    <span key={t.id} className="trade-tag-chip active" style={{ "--tag-c": t.color } as CSSProperties}>
                      {/* توپ برچسب سمت چپ نامش (در RTL یعنی بعد از متن) */}
                      {t.name}<span className="trade-tag-dot" style={{ background: t.color }} />
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {!!emotionRows.length && (
              <Section title={tr("احساسات", "Emotions")}>
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

            {entry.note && <Section title={tr("نکات معامله", "Trade notes")}><p className="trade-detail-note">{entry.note}</p></Section>}
          </>
        )}

        {confirmDelete && onDelete && (
          <div className="trade-inline-confirm">
            <span>{tr("این معامله برای همیشه حذف شود؟", "Delete this trade permanently?")}</span>
            <div className="trade-modal-actions">
              <button type="button" className="account-outline-btn" onClick={() => setConfirmDelete(false)}>{tr("لغو", "Cancel")}</button>
              <button type="button" className="trade-danger-btn" onClick={onDelete}>{tr("حذف", "Delete")}</button>
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="trade-lightbox" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt={tr("تصویر معامله", "Trade image")} />
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
