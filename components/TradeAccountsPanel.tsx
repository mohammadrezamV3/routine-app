"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Loader2, Pencil, Trash2, Wallet, X } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { TradeAccountModal } from "./TradeAccountModal";
import { PanelSkeleton } from "./PanelSkeleton";
import { TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { takePreloaded } from "@/lib/preload";
import { useAsyncAction } from "@/lib/useAsyncAction";
import { TradeKebabMenu } from "./TradeKebabMenu";
import { LockBodyScroll } from "./LockBodyScroll";

// صفحه‌ی «ژورنال‌نویسی»: اول حساب‌ها، فقط به‌شکل فشرده (اسم + سود/زیان +
// برچسب) — جزئیات کامل (بالانس/تعداد معاملات/نرخ برد/هدف) جاش صفحه‌ی
// خود حسابه، نه این فهرست. با انتخاب هر حساب می‌رویم داخل آمار و
// معاملات همان حساب.
export function TradeAccountsPanel({
  creating,
  onCreatingChange,
}: {
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
}) {
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [loading, setLoading] = useState(true);
  // آرشیو دیگر کل فهرست را عوض نمی‌کند؛ توی یک پاپ‌آپ جدا نشان داده می‌شود
  // (درخواست صریح کاربر) — پس این صفحه همیشه فقط حساب‌های فعال را دارد.
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archived, setArchived] = useState<TradeAccount[] | null>(null);
  const [editing, setEditing] = useState<TradeAccount | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<TradeAccount | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  // `silent` یعنی «داده را تازه کن ولی اسکلت نشان نده». بدون این، هر
  // آرشیو/حذف کل لیست را برای یک لحظه با اسکلت عوض می‌کرد — همان پرشی که
  // از بیرون شبیه باگ دیده می‌شد.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // اگر اسکریپت inline preload از قبل همین URL را درخواست کرده،
      // همان promise استفاده می‌شود تا درخواست دوباره نرود.
      const accountsUrl = "/api/trade/accounts?archived=0";
      const [aData, tData] = await Promise.all([
        takePreloaded(accountsUrl) ?? fetch(accountsUrl).then((r) => (r.ok ? r.json() : null)),
        takePreloaded("/api/trade/tags") ?? fetch("/api/trade/tags").then((r) => (r.ok ? r.json() : null)),
      ]);
      setAccounts(aData?.accounts || []);
      setTags(tData?.tags || []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // فهرست آرشیو فقط وقتی پاپ‌آپش باز می‌شود گرفته می‌شود، نه در لود صفحه
  const loadArchived = useCallback(async () => {
    const res = await fetch("/api/trade/accounts?archived=1").then((r) => (r.ok ? r.json() : null));
    const list: TradeAccount[] = res?.accounts || [];
    setArchived(list.filter((a) => a.archived));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleArchive(a: TradeAccount) {
    const ok = await run(`archive:${a.id}`, () =>
      fetch(`/api/trade/accounts?id=${a.id}&mode=archive`, { method: "DELETE" })
    );
    if (ok) load(true);
  }

  async function purge(a: TradeAccount) {
    const ok = await run(`purge:${a.id}`, () =>
      fetch(`/api/trade/accounts?id=${a.id}&mode=purge`, { method: "DELETE" })
    );
    if (ok) { setConfirmPurge(null); load(true); }
  }

  if (loading) return <PanelSkeleton />;

  return (
    <div>
      <div className="trade-accounts-head">
        <div className="trade-section-title">حساب‌های معاملاتی</div>
        <button type="button" className="trade-ghost-btn" onClick={() => { setArchiveOpen(true); setArchived(null); loadArchived(); }}>
          نمایش آرشیو
        </button>
      </div>

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {!accounts.length && (
        <div className="trade-empty-state">
          <Wallet size={32} />
          <p>هنوز حسابی ایجاد نکردی</p>
        </div>
      )}

      <div className="trade-account-grid">
        {accounts.map((a, i) => (
          <AccountRow
            key={a.id}
            account={a}
            index={i}
            onEdit={() => setEditing(a)}
            onToggleArchive={() => toggleArchive(a)}
            onPurge={() => setConfirmPurge(a)}
          />
        ))}
      </div>

      {(creating || editing) && (
        <TradeAccountModal
          account={editing}
          tags={tags}
          onTagCreated={(t) => setTags((prev) => [...prev, t])}
          onClose={() => { onCreatingChange(false); setEditing(null); }}
          onSaved={() => { onCreatingChange(false); setEditing(null); load(); }}
        />
      )}

      {archiveOpen && (
        <>
          <LockBodyScroll />
          <div className="modal-overlay open" onClick={() => setArchiveOpen(false)} />
          <div className="modal-panel open" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div className="modal-title">حساب‌های آرشیوشده</div>
              <button type="button" className="trade-icon-btn" onClick={() => setArchiveOpen(false)} aria-label="بستن"><X size={16} /></button>
            </div>
            {archived === null ? (
              <PanelSkeleton />
            ) : !archived.length ? (
              <div className="trade-empty-state"><Archive size={28} /><p>هیچ حسابی توی آرشیو نیست</p></div>
            ) : (
              <div className="trade-account-grid" style={{ marginTop: 4 }}>
                {archived.map((a) => (
                  <div key={a.id} className="trade-surface trade-account-card archived">
                    <span className="trade-account-stripe" style={{ background: a.color }} />
                    <div className="trade-account-top-row">
                      <div className="trade-account-kebab-inline">
                        <TradeKebabMenu
                          label="گزینه‌های حساب"
                          actions={[
                            {
                              label: "بازگردانی از آرشیو",
                              icon: <ArchiveRestore size={14} />,
                              onClick: async () => { await toggleArchive(a); loadArchived(); },
                            },
                            {
                              label: "حذف کامل",
                              icon: <Trash2 size={14} />,
                              danger: true,
                              onClick: () => { setArchiveOpen(false); setConfirmPurge(a); },
                            },
                          ]}
                        />
                      </div>
                      <Link href={`/trade/accounts/${a.id}`} className="trade-account-title-link">
                        <span className="trade-account-name">{a.name}</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {confirmPurge && (
        <PurgeConfirm
          account={confirmPurge}
          onCancel={() => setConfirmPurge(null)}
          onConfirm={() => purge(confirmPurge)}
          busy={pendingKey === `purge:${confirmPurge.id}`}
        />
      )}
    </div>
  );
}

// ردیف فشرده‌ی یک حساب — اسم + سود/زیان + برچسب، به‌علاوه‌ی منوی
// سه‌نقطه‌ی کنار اسم (ویرایش/آرشیو). جزئیات کامل حساب فقط با بازکردن
// خود صفحه‌ی حساب دیده می‌شود.
function AccountRow({
  account: a, index, onEdit, onToggleArchive, onPurge,
}: {
  account: TradeAccount;
  index: number;
  onEdit: () => void;
  onToggleArchive: () => void;
  onPurge: () => void;
}) {
  // منطق باز/بسته و موقعیت منو حالا داخل خود TradeKebabMenu است (مشترک با
  // چک‌لیست‌ها و یادداشت‌ها) — این‌جا فقط کارهایش تعریف می‌شود.
  const netPnl = a.summary?.netPnl ?? 0;
  // درصد نسبت به بالانس اولیه — بدون بالانس اولیه معنایی ندارد، پس نشان داده نمی‌شود
  const pnlPct = a.initialBalance > 0 ? Math.round((netPnl / a.initialBalance) * 1000) / 10 : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 8) * 0.045, ease: [0.22, 1, 0.36, 1] }}
      className={`trade-surface trade-account-card${a.archived ? " archived" : ""}`}
    >
      <span className="trade-account-stripe" style={{ background: a.color }} />

      {/* ردیف بالا: سه‌نقطه کنار نام حساب (توی RTL یعنی سمت راست، اولین
          فرزند DOM)، و سود/زیان چپ‌چین انتهای همان ردیف — «1000$ 10% ↑». */}
      <div className="trade-account-top-row">
        <div className="trade-account-kebab-inline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <TradeKebabMenu
            label="گزینه‌های حساب"
            actions={[
              { label: "ویرایش حساب", icon: <Pencil size={14} />, onClick: onEdit },
              {
                label: a.archived ? "بازگردانی از آرشیو" : "آرشیو کردن",
                icon: a.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
                onClick: onToggleArchive,
              },
              ...(a.archived ? [{ label: "حذف کامل", icon: <Trash2 size={14} />, onClick: onPurge, danger: true }] : []),
            ]}
          />
        </div>

        <Link href={`/trade/accounts/${a.id}`} className="trade-account-title-link">
          <span className="trade-account-name">{a.name}</span>
          {a.archived && <span className="trade-account-archived-badge">آرشیو</span>}
        </Link>

        <span className="trade-account-pnl-inline mono" dir="ltr" style={{ color: netPnl >= 0 ? "var(--accent)" : "#E05252" }}>
          {formatMoney(netPnl, a.currency)}
          {pnlPct !== null && <span className="trade-account-pnl-pct">{pnlPct}%</span>}
          {netPnl >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        </span>
      </div>

      <Link href={`/trade/accounts/${a.id}`} className="trade-account-main">
        {!!a.tags.length && (
          <div className="trade-tag-row" style={{ marginTop: 10 }}>
            {a.tags.map((t) => (
              <span key={t.id} className="trade-tag-chip active" style={{ borderColor: t.color, color: t.color }}>
                <span className="trade-tag-dot" style={{ background: t.color }} />
                {t.name}
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  );
}

// «1000$» — نماد ارزهای رایج چسبیده به عدد؛ بقیه با فاصله بعد از عدد.
const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", EUR: "\u20AC", GBP: "\u00A3" };
function formatMoney(value: number, currency: string): string {
  const n = Math.round(Math.abs(value) * 100) / 100;
  const sign = value < 0 ? "-" : "";
  const sym = CURRENCY_SYMBOL[currency];
  return sym ? `${sign}${n}${sym}` : `${sign}${n} ${currency}`;
}

// حذف کامل حساب برگشت‌ناپذیر است و کل تاریخچه‌ی معاملاتش را می‌برد — پس
// پشت تایپ دقیق نام حساب قفل شده، نه یک «آیا مطمئنی؟»ی ساده.
function PurgeConfirm({ account, onCancel, onConfirm, busy }: { account: TradeAccount; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <>
      <div className="modal-overlay open" onClick={onCancel} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head"><div className="modal-title">حذف کامل حساب</div></div>
        <div className="item-line">
          با این کار تمام معاملات، عکس‌ها و آمار «{account.name}» برای همیشه پاک می‌شوند. این کار برگشت‌پذیر نیست.
        </div>
        <label className="exercise-form-label">برای تأیید، نام حساب را تایپ کن</label>
        <input className="wsearch-newform-name trade-glass-field" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={account.name} />
        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onCancel}>لغو</button>
          <button type="button" className="trade-danger-btn" disabled={typed.trim() !== account.name || busy} onClick={onConfirm}>
            {busy ? <Loader2 size={15} className="trade-spin" /> : "حذف کامل"}
          </button>
        </div>
      </div>
    </>
  );
}
