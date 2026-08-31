"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { TradeAccountModal } from "./TradeAccountModal";
import { PanelSkeleton } from "./PanelSkeleton";
import { ACCOUNT_TYPE_LABELS, MAX_ACCOUNTS, TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { takePreloaded } from "@/lib/preload";
import { useAsyncAction } from "@/lib/useAsyncAction";

// صفحه‌ی «ژورنال‌نویسی»: اول حساب‌ها. با انتخابِ هر حساب می‌رویم داخلِ
// آمار و معاملاتِ همان حساب.
export function TradeAccountsPanel() {
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<TradeAccount | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<TradeAccount | null>(null);
  const { pendingKey, error: actionError, run } = useAsyncAction();

  // `silent` یعنی «داده را تازه کن ولی اسکلت نشان نده». بدونِ این، هر
  // آرشیو/حذف کلِ لیست را برای یک لحظه با اسکلت عوض می‌کرد — همان پرشی که
  // از بیرون شبیهِ باگ دیده می‌شد.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // اگر اسکریپتِ inlineِ preload از قبل همین URL را درخواست کرده،
      // همان promise استفاده می‌شود تا درخواست دوباره نرود.
      const accountsUrl = `/api/trade/accounts?archived=${showArchived ? 1 : 0}`;
      const [aData, tData] = await Promise.all([
        takePreloaded(accountsUrl) ?? fetch(accountsUrl).then((r) => (r.ok ? r.json() : null)),
        takePreloaded("/api/trade/tags") ?? fetch("/api/trade/tags").then((r) => (r.ok ? r.json() : null)),
      ]);
      setAccounts(aData?.accounts || []);
      setTags(tData?.tags || []);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showArchived]);

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

  const activeCount = accounts.filter((a) => !a.archived).length;

  if (loading) return <PanelSkeleton />;

  return (
    <div>
      <div className="trade-accounts-head">
        <div className="domain-sub" style={{ margin: 0 }}>حساب‌های معاملاتی</div>
        <button type="button" className="trade-ghost-btn" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "پنهان‌کردن آرشیو" : "نمایش آرشیو"}
        </button>
      </div>

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {!accounts.length && (
        <div className="item-line empty" style={{ marginTop: 12 }}>
          هنوز حسابی نساختی — با ساختن اولین حساب، ثبت معامله و آمارش شروع می‌شود.
        </div>
      )}

      <div className="trade-account-grid">
        {accounts.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: i * 0.045, ease: [0.22, 1, 0.36, 1] }}
            className={`trade-surface trade-account-card${a.archived ? " archived" : ""}`}
          >
            <span className="trade-account-stripe" style={{ background: a.color }} />

            <Link href={`/trade/accounts/${a.id}`} className="trade-account-main">
              <div className="trade-account-title-row">
                <span className="trade-account-name">{a.name}</span>
                <span className="trade-account-type">{ACCOUNT_TYPE_LABELS[a.type]}</span>
                {a.archived && <span className="trade-account-archived-badge">آرشیو</span>}
              </div>
              {a.broker && <div className="trade-account-broker">{a.broker}</div>}

              <div className="trade-account-stats">
                <div className="trade-account-stat">
                  <span>بالانس</span>
                  <b className="mono">{faNum((a.summary?.balance ?? 0).toFixed(2))} {a.currency}</b>
                </div>
                <div className="trade-account-stat">
                  <span>سود/زیان</span>
                  <b className="mono" style={{ color: (a.summary?.netPnl ?? 0) >= 0 ? "var(--accent)" : "#E05252" }}>
                    {faNum((a.summary?.netPnl ?? 0).toFixed(2))}
                  </b>
                </div>
                <div className="trade-account-stat">
                  <span>معاملات</span>
                  <b className="mono">{faNum(a.summary?.tradeCount ?? 0)}</b>
                </div>
                <div className="trade-account-stat">
                  <span>نرخ برد</span>
                  <b className="mono">{a.summary?.winRate === null || a.summary?.winRate === undefined ? "—" : `${faNum(a.summary.winRate)}٪`}</b>
                </div>
              </div>

              {a.summary?.goalProgress !== null && a.summary?.goalProgress !== undefined && (
                <div className="trade-account-goal">
                  <div className="trade-account-goal-bar">
                    <span style={{ width: `${Math.round(a.summary.goalProgress * 100)}%`, background: a.color }} />
                  </div>
                  <span className="mono">{faNum(Math.round(a.summary.goalProgress * 100))}٪ هدف</span>
                </div>
              )}

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

            <div className="trade-account-actions">
              <button type="button" className="trade-icon-btn" onClick={() => setEditing(a)} aria-label="ویرایش"><Pencil size={15} /></button>
              <button
                type="button"
                className="trade-icon-btn"
                onClick={() => toggleArchive(a)}
                disabled={pendingKey === `archive:${a.id}`}
                aria-label={a.archived ? "بازگردانی" : "آرشیو"}
              >
                {pendingKey === `archive:${a.id}`
                  ? <Loader2 size={15} className="trade-spin" />
                  : a.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
              </button>
              {a.archived && (
                <button type="button" className="trade-icon-btn danger" onClick={() => setConfirmPurge(a)} aria-label="حذف کامل"><Trash2 size={15} /></button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {activeCount < MAX_ACCOUNTS && (
        <button type="button" className="trade-add-account-btn" onClick={() => setCreating(true)}>
          <Plus size={18} /> افزودن حساب
        </button>
      )}

      {(creating || editing) && (
        <TradeAccountModal
          account={editing}
          tags={tags}
          onTagCreated={(t) => setTags((prev) => [...prev, t])}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
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

// حذفِ کاملِ حساب برگشت‌ناپذیر است و کلِ تاریخچه‌ی معاملاتش را می‌برد — پس
// پشتِ تایپِ دقیقِ نامِ حساب قفل شده، نه یک «آیا مطمئنی؟»ی ساده.
function PurgeConfirm({ account, onCancel, onConfirm, busy }: { account: TradeAccount; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const [typed, setTyped] = useState("");
  return (
    <>
      <div className="modal-overlay open" onClick={onCancel} />
      <div className="modal-panel open" role="dialog" aria-modal="true">
        <div className="modal-head"><div className="modal-title">حذف کامل حساب</div></div>
        <div className="item-line">
          با این کار تمام معاملات، عکس‌ها و آمارِ «{account.name}» برای همیشه پاک می‌شوند. این کار برگشت‌پذیر نیست.
        </div>
        <label className="exercise-form-label">برای تأیید، نام حساب را تایپ کن</label>
        <input className="wsearch-newform-name trade-glass-field" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={account.name} />
        <div className="trade-modal-actions">
          <button type="button" className="account-outline-btn" onClick={onCancel}>لغو</button>
          <button type="button" className="trade-danger-btn" disabled={typed.trim() !== account.name || busy} onClick={onConfirm}>
            {busy ? "..." : "حذف کامل"}
          </button>
        </div>
      </div>
    </>
  );
}
