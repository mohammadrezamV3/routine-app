"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Camera, ChevronDown, Info, Smile, Tags, Trash2, Wand2, X } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";
import { SegmentedTabs } from "./SegmentedTabs";
import { TradeTagField } from "./TradeTagField";
import { TradeDateTimeField } from "./TradeDateTimeField";
import { compressImageToDataUrl } from "@/lib/image";
import { faNum } from "@/lib/jalali";
import { searchSymbols, suggestPnl, suggestRiskAmount, TIMEFRAMES } from "@/lib/tradeSymbols";
import {
  CalSystem, EMOTION_AFTER_LABELS, EMOTION_AFTER_ORDER, EMOTION_BEFORE_LABELS, EMOTION_BEFORE_ORDER,
  ENTRY_REASON_LABELS, ENTRY_REASON_ORDER, EXIT_REASON_LABELS, EXIT_REASON_ORDER,
  MAX_IMAGES_PER_TRADE, TradeAccount, TradeEmotionAfter, TradeEmotionBefore,
  TradeEntryDetail, TradeEntryReason, TradeExitReason, TradeFormState, TradeTag,
  emptyTradeForm, formStateToBody, tradeToFormState,
} from "@/lib/tradeTypes";
import { localInputToIso, toLocalInputValue } from "@/lib/tradeDateTime";

type ChecklistItem = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; items: ChecklistItem[] };

type TabKey = "core" | "reasons" | "checklist" | "images" | "tags" | "emotions";

const TABS: { key: TabKey; label: string; icon: JSX.Element }[] = [
  { key: "core", label: "اطلاعات ضروری", icon: <Info size={14} /> },
  { key: "reasons", label: "دلایل ورود و خروج", icon: <Wand2 size={14} /> },
  { key: "checklist", label: "چک‌لیست", icon: <AlertTriangle size={14} /> },
  { key: "images", label: "عکس‌ها", icon: <Camera size={14} /> },
  { key: "tags", label: "برچسب‌ها", icon: <Tags size={14} /> },
  { key: "emotions", label: "احساسات", icon: <Smile size={14} /> },
];

/**
 * فرمِ ثبت/ویرایشِ معامله.
 *
 * دو قانونِ محصولی که در کدِ این فرم رعایت شده و نباید شکسته شود:
 *   ۱) ناقص‌بودنِ چک‌لیست هیچ‌وقت جلوی ثبتِ معامله را نمی‌گیرد — حتی وقتی
 *      چک‌لیست «الزامی» علامت خورده باشد. در آن حالت فقط هشدار می‌بینی و
 *      معامله با برچسبِ «خارج از پلن» ثبت می‌شود.
 *   ۲) وضعیتِ تیک‌های چک‌لیست در همان لحظه‌ی ثبت اسنپ‌شات می‌شود (سمتِ سرور)،
 *      نه اینکه بعداً از خودِ چک‌لیست خوانده شود.
 */
export function TradeFormModal({
  account,
  entry,
  tags,
  calSystem,
  presetChecklistId,
  onTagCreated,
  onClose,
  onSaved,
}: {
  account: TradeAccount;
  entry: TradeEntryDetail | null;
  tags: TradeTag[];
  calSystem: CalSystem;
  presetChecklistId?: string | null;
  onTagCreated: (t: TradeTag) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("core");
  const [form, setForm] = useState<TradeFormState>(() =>
    entry ? tradeToFormState(entry, toLocalInputValue) : emptyTradeForm(account.id, toLocalInputValue(new Date()))
  );
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolSuggestOpen, setSymbolSuggestOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  function patch(p: Partial<TradeFormState>) { setForm((f) => ({ ...f, ...p })); }

  useEffect(() => {
    fetch("/api/trade/checklists")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: Checklist[] = d?.checklists || [];
        setChecklists(list);
        if (presetChecklistId && !entry) patch({ checklistId: presetChecklistId });
      })
      .catch(() => setChecklists([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeChecklist = checklists.find((c) => c.id === form.checklistId) || null;
  const checkedCount = activeChecklist ? activeChecklist.items.filter((i) => form.checklistState[i.id]).length : 0;
  const checklistIncomplete = !!activeChecklist && checkedCount < activeChecklist.items.length;

  const symbolSuggestions = symbolSuggestOpen ? searchSymbols(form.symbol) : [];

  const pnlSuggestion = useMemo(
    () =>
      suggestPnl({
        symbol: form.symbol,
        direction: form.direction,
        entryPrice: form.entryPrice ? +form.entryPrice : null,
        exitPrice: form.exitPrice ? +form.exitPrice : null,
        volume: form.volume ? +form.volume : null,
        volumeUnit: form.volumeUnit,
        commission: form.commission ? +form.commission : null,
        swap: form.swap ? +form.swap : null,
      }),
    [form.symbol, form.direction, form.entryPrice, form.exitPrice, form.volume, form.volumeUnit, form.commission, form.swap]
  );

  const riskSuggestion = useMemo(
    () =>
      suggestRiskAmount({
        symbol: form.symbol,
        entryPrice: form.entryPrice ? +form.entryPrice : null,
        stopLoss: form.stopLoss ? +form.stopLoss : null,
        volume: form.volume ? +form.volume : null,
        volumeUnit: form.volumeUnit,
      }),
    [form.symbol, form.entryPrice, form.stopLoss, form.volume, form.volumeUnit]
  );

  function applyPnlSuggestion() {
    if (pnlSuggestion === null) return;
    patch({
      result: pnlSuggestion > 0 ? "PROFIT" : pnlSuggestion < 0 ? "LOSS" : "BREAKEVEN",
      pnlAmount: String(Math.abs(pnlSuggestion)),
    });
  }

  async function addImages(files: FileList | File[]) {
    const remaining = MAX_IMAGES_PER_TRADE - form.images.length;
    if (remaining <= 0) { setImageError(`حداکثر ${MAX_IMAGES_PER_TRADE} تصویر`); return; }
    setImageError(null);
    setCompressing(true);
    const added: { dataUrl: string }[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      try {
        added.push({ dataUrl: await compressImageToDataUrl(file) });
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "خطا در پردازش تصویر");
      }
    }
    setCompressing(false);
    if (added.length) setForm((f) => ({ ...f, images: [...f.images, ...added] }));
  }

  // چسباندنِ مستقیمِ اسکرین‌شات با Ctrl+V — رایج‌ترین کاری که تریدر بعد از
  // گرفتنِ عکس از چارت انجام می‌دهد
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith("image/"));
      if (files.length) { e.preventDefault(); addImages(files); }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.images.length]);

  async function save() {
    if (saving) return;
    if (!form.symbol.trim()) { setTab("core"); setError("نماد معاملاتی را وارد کن"); return; }
    if (!form.volume.trim()) { setTab("core"); setError("حجم معامله را وارد کن"); return; }

    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = { ...formStateToBody(form) };
    body.openedAt = localInputToIso(form.openedAt);
    body.closedAt = form.closedAt ? localInputToIso(form.closedAt) : null;
    if (entry) body.id = entry.id;

    const res = await fetch("/api/trade/entries", {
      method: entry ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { setError(data?.error || "خطا در ثبت معامله"); return; }
    onSaved();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel open trade-form-panel" role="dialog" aria-modal="true" ref={panelRef}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">{account.name}</div>
            <div className="modal-title">{entry ? "ویرایش معامله" : "ثبت معامله"}</div>
          </div>
          <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={16} /></button>
        </div>

        <div className="trade-form-tabs no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`trade-form-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              {t.label}
              {t.key === "checklist" && checklistIncomplete && <span className="trade-tab-warn" />}
            </button>
          ))}
        </div>

        {tab === "core" && (
          <div className="trade-form-body">
            <div className="trade-field-row">
              <div style={{ position: "relative" }}>
                <label className="exercise-form-label">نماد معاملاتی</label>
                <input
                  value={form.symbol}
                  onChange={(e) => { patch({ symbol: e.target.value.toUpperCase() }); setSymbolSuggestOpen(true); }}
                  onFocus={() => setSymbolSuggestOpen(true)}
                  onBlur={() => setTimeout(() => setSymbolSuggestOpen(false), 150)}
                  placeholder="مثلاً EURUSD"
                  maxLength={20}
                />
                {!!symbolSuggestions.length && (
                  <div className="trade-pair-suggest">
                    {symbolSuggestions.map((p) => (
                      <div key={p.code} className="trade-pair-suggest-item" onMouseDown={() => { patch({ symbol: p.code }); setSymbolSuggestOpen(false); }}>
                        <span className="mono">{p.code}</span>
                        <span className="trade-pair-suggest-label">{p.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="exercise-form-label">جهت</label>
                <SegmentedTabs
                  active={form.direction}
                  onChange={(v) => patch({ direction: v })}
                  options={[{ value: "BUY" as const, label: "خرید (Buy)" }, { value: "SELL" as const, label: "فروش (Sell)" }]}
                />
              </div>
            </div>

            <div className="trade-field-row">
              <div>
                <label className="exercise-form-label">تایم فریم</label>
                <select value={form.timeframe} onChange={(e) => patch({ timeframe: e.target.value })}>
                  <option value="">—</option>
                  {TIMEFRAMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="exercise-form-label">تاریخ و ساعت ورود</label>
                <TradeDateTimeField value={form.openedAt} onChange={(v) => patch({ openedAt: v })} calSystem={calSystem} />
              </div>
            </div>

            <div className="trade-field-row">
              <div>
                <label className="exercise-form-label">حجم معامله</label>
                <div className="trade-volume-row">
                  <input type="number" inputMode="decimal" value={form.volume} onChange={(e) => patch({ volume: e.target.value })} placeholder="0.00" />
                  <SegmentedTabs
                    active={form.volumeUnit}
                    onChange={(v) => patch({ volumeUnit: v })}
                    options={[{ value: "LOT" as const, label: "لات" }, { value: "USD" as const, label: "دلار" }]}
                  />
                </div>
              </div>
              <div>
                <label className="exercise-form-label">سود یا ضرر</label>
                <SegmentedTabs
                  active={form.result}
                  onChange={(v) => patch({ result: v })}
                  options={[
                    { value: "PROFIT" as const, label: "سود" },
                    { value: "LOSS" as const, label: "ضرر" },
                    { value: "BREAKEVEN" as const, label: "سربه‌سر" },
                  ]}
                />
              </div>
            </div>

            <div className="trade-field-row">
              <div>
                <label className="exercise-form-label">مقدار {form.result === "LOSS" ? "ضرر" : "سود"} ({account.currency})</label>
                <input
                  type="number" inputMode="decimal" value={form.pnlAmount}
                  onChange={(e) => patch({ pnlAmount: e.target.value })}
                  placeholder="0.00" disabled={form.result === "BREAKEVEN"}
                />
                {pnlSuggestion !== null && (
                  <button type="button" className="trade-suggest-btn" onClick={applyPnlSuggestion}>
                    <Wand2 size={12} /> پیشنهاد از روی قیمت‌ها: {faNum(pnlSuggestion.toFixed(2))}
                  </button>
                )}
              </div>
              <div>
                <label className="exercise-form-label">وضعیت ریسک (break even)</label>
                <button type="button" className={`trade-toggle${form.riskFree ? " on" : ""}`} onClick={() => patch({ riskFree: !form.riskFree })}>
                  <span className="trade-toggle-knob" />
                  <span className="trade-toggle-label">معامله ریسک‌فری هست؟</span>
                </button>
              </div>
            </div>

            <button type="button" className="trade-optional-head" onClick={() => setOptionalOpen((v) => !v)}>
              <span>اطلاعات اختیاری</span>
              <ChevronDown size={16} style={{ transform: optionalOpen ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
            </button>

            {optionalOpen && (
              <div className="trade-optional-body">
                <label className="exercise-form-label">وضعیت معامله</label>
                <SegmentedTabs
                  active={form.status}
                  onChange={(v) => patch({ status: v })}
                  options={[
                    { value: "CLOSED" as const, label: "بسته" },
                    { value: "OPEN" as const, label: "باز" },
                    { value: "CANCELED" as const, label: "لغو شده" },
                  ]}
                />

                <div className="trade-field-row">
                  <div>
                    <label className="exercise-form-label">قیمت ورود</label>
                    <input type="number" inputMode="decimal" value={form.entryPrice} onChange={(e) => patch({ entryPrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="exercise-form-label">قیمت خروج</label>
                    <input type="number" inputMode="decimal" value={form.exitPrice} onChange={(e) => patch({ exitPrice: e.target.value })} />
                  </div>
                </div>

                <div className="trade-field-row">
                  <div>
                    <label className="exercise-form-label">حد ضرر</label>
                    <input type="number" inputMode="decimal" value={form.stopLoss} onChange={(e) => patch({ stopLoss: e.target.value })} />
                  </div>
                  <div>
                    <label className="exercise-form-label">حد سود</label>
                    <input type="number" inputMode="decimal" value={form.takeProfit} onChange={(e) => patch({ takeProfit: e.target.value })} />
                  </div>
                </div>

                <div className="trade-field-row">
                  <div>
                    <label className="exercise-form-label">کمیسیون</label>
                    <input type="number" inputMode="decimal" value={form.commission} onChange={(e) => patch({ commission: e.target.value })} />
                  </div>
                  <div>
                    <label className="exercise-form-label">سواپ</label>
                    <input type="number" inputMode="decimal" value={form.swap} onChange={(e) => patch({ swap: e.target.value })} />
                  </div>
                </div>

                <label className="exercise-form-label">مقدار ریسک ({account.currency}) — مبنای محاسبه‌ی R</label>
                <input type="number" inputMode="decimal" value={form.riskAmount} onChange={(e) => patch({ riskAmount: e.target.value })} placeholder="اختیاری" />
                {riskSuggestion !== null && (
                  <button type="button" className="trade-suggest-btn" onClick={() => patch({ riskAmount: String(riskSuggestion) })}>
                    <Wand2 size={12} /> پیشنهاد از فاصله‌ی حد ضرر: {faNum(riskSuggestion.toFixed(2))}
                  </button>
                )}

                <label className="exercise-form-label">ستاپ / استراتژی</label>
                <input value={form.setup} onChange={(e) => patch({ setup: e.target.value })} maxLength={60} placeholder="مثلاً London Breakout" />

                <label className="exercise-form-label">تاریخ و ساعت خروج</label>
                <TradeDateTimeField value={form.closedAt} onChange={(v) => patch({ closedAt: v })} calSystem={calSystem} allowClear placeholder="ثبت نشده" />
              </div>
            )}
          </div>
        )}

        {tab === "reasons" && (
          <div className="trade-form-body">
            <label className="exercise-form-label">دلایل ورود</label>
            <div className="trade-choice-grid">
              {ENTRY_REASON_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`trade-choice${form.entryReasons.includes(r) ? " active" : ""}`}
                  onClick={() => patch({
                    entryReasons: form.entryReasons.includes(r)
                      ? form.entryReasons.filter((x) => x !== r)
                      : [...form.entryReasons, r as TradeEntryReason],
                  })}
                >
                  {ENTRY_REASON_LABELS[r]}
                </button>
              ))}
            </div>

            <label className="exercise-form-label">یادداشت دلایل ورود</label>
            <textarea rows={2} value={form.entryReasonNote} onChange={(e) => patch({ entryReasonNote: e.target.value })} maxLength={1000} />

            <label className="exercise-form-label">دلایل خروج</label>
            <div className="trade-choice-grid">
              {EXIT_REASON_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`trade-choice${form.exitReasons.includes(r) ? " active" : ""}`}
                  onClick={() => patch({
                    exitReasons: form.exitReasons.includes(r)
                      ? form.exitReasons.filter((x) => x !== r)
                      : [...form.exitReasons, r as TradeExitReason],
                  })}
                >
                  {EXIT_REASON_LABELS[r]}
                </button>
              ))}
            </div>

            <label className="exercise-form-label">یادداشت دلایل خروج</label>
            <textarea rows={2} value={form.exitReasonNote} onChange={(e) => patch({ exitReasonNote: e.target.value })} maxLength={1000} />

            <label className="exercise-form-label">نکات معامله</label>
            <textarea rows={3} value={form.note} onChange={(e) => patch({ note: e.target.value })} maxLength={2000} placeholder="هر نکته‌ای که بعداً به دردت می‌خورد" />
          </div>
        )}

        {tab === "checklist" && (
          <div className="trade-form-body">
            <label className="exercise-form-label">چک‌لیست این معامله</label>
            <select value={form.checklistId || ""} onChange={(e) => patch({ checklistId: e.target.value || null, checklistState: {} })}>
              <option value="">بدون چک‌لیست</option>
              {checklists.filter((c) => !c.archived).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {activeChecklist && (
              <>
                <div className="trade-checklist-progress">
                  <b className="mono">{faNum(checkedCount)} / {faNum(activeChecklist.items.length)}</b>
                  <span>مورد تکمیل شده</span>
                </div>

                <div className="trade-checklist-items">
                  {activeChecklist.items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      className={`trade-check-row${form.checklistState[i.id] ? " done" : ""}`}
                      onClick={() => patch({ checklistState: { ...form.checklistState, [i.id]: !form.checklistState[i.id] } })}
                    >
                      <span className="trade-check-box" />
                      <span>{i.text}</span>
                    </button>
                  ))}
                </div>

                {checklistIncomplete && (
                  <div className="trade-warn-note">
                    <AlertTriangle size={14} />
                    <span>
                      چک‌لیست کامل نیست
                      {activeChecklist.required ? " و این چک‌لیست «الزامی» علامت خورده" : ""} — معامله باز هم ثبت می‌شود و همین وضعیت برای آمار ذخیره می‌ماند.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === "images" && (
          <div className="trade-form-body">
            <label className="exercise-form-label">
              تصاویر معامله ({faNum(form.images.length)}/{faNum(MAX_IMAGES_PER_TRADE)})
            </label>

            <div className="trade-image-grid">
              {form.images.map((img, i) => (
                <div key={i} className="trade-image-cell">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.dataUrl} alt={`تصویر ${i + 1}`} />
                  <button
                    type="button"
                    className="trade-image-remove"
                    onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                    aria-label="حذف تصویر"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {form.images.length < MAX_IMAGES_PER_TRADE && (
              <label className="trade-image-drop">
                <Camera size={22} />
                <span>{compressing ? "در حال پردازش..." : "افزودن تصویر"}</span>
                <span className="trade-image-hint">{faNum(MAX_IMAGES_PER_TRADE - form.images.length)} باقی‌مانده — یا با Ctrl+V بچسبان</span>
                <input
                  type="file" accept="image/*" multiple hidden
                  onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }}
                />
              </label>
            )}

            {imageError && <div className="trade-form-error">{imageError}</div>}
          </div>
        )}

        {tab === "tags" && (
          <div className="trade-form-body">
            <label className="exercise-form-label">برچسب‌های معامله</label>
            <TradeTagField tags={tags} value={form.tagIds} onChange={(ids) => patch({ tagIds: ids })} onCreated={onTagCreated} />
          </div>
        )}

        {tab === "emotions" && (
          <div className="trade-form-body">
            <label className="exercise-form-label">حال من قبل از معامله</label>
            <div className="trade-choice-grid">
              {EMOTION_BEFORE_ORDER.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`trade-choice${form.emotionBefore === e ? " active" : ""}`}
                  onClick={() => patch({ emotionBefore: form.emotionBefore === e ? null : (e as TradeEmotionBefore) })}
                >
                  {EMOTION_BEFORE_LABELS[e]}
                </button>
              ))}
            </div>

            <label className="exercise-form-label">
              میزان اطمینان {form.confidence ? `— ${faNum(form.confidence)}` : ""}
            </label>
            <input
              type="range" min={1} max={10} step={1}
              value={form.confidence || 5}
              onChange={(e) => patch({ confidence: e.target.value })}
              className="trade-range"
            />

            <label className="exercise-form-label">حال من بعد از معامله</label>
            <div className="trade-choice-grid">
              {EMOTION_AFTER_ORDER.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`trade-choice${form.emotionAfter === e ? " active" : ""}`}
                  onClick={() => patch({ emotionAfter: form.emotionAfter === e ? null : (e as TradeEmotionAfter) })}
                >
                  {EMOTION_AFTER_LABELS[e]}
                </button>
              ))}
            </div>

            <label className="exercise-form-label">طبق پلن عمل کردم؟</label>
            <div className="trade-choice-grid">
              {[
                { v: true, label: "بله" },
                { v: false, label: "خیر" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  className={`trade-choice${form.followedPlan === o.v ? " active" : ""}`}
                  onClick={() => patch({ followedPlan: form.followedPlan === o.v ? null : o.v })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="trade-form-error">{error}</div>}

        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onClose}>لغو</button>
          <button type="button" className="trade-primary-btn" onClick={save} disabled={saving}>
            {saving ? "..." : entry ? "ذخیره تغییرات" : "ثبت معامله"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
