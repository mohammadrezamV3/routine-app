"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Archive, ArchiveRestore, Loader2, MoreVertical, Pencil, Trash2, Wallet } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { TradeAccountModal } from "./TradeAccountModal";
import { PanelSkeleton } from "./PanelSkeleton";
import { TradeAccount, TradeTag } from "@/lib/tradeTypes";
import { takePreloaded } from "@/lib/preload";
import { useAsyncAction } from "@/lib/useAsyncAction";

// صفحه‌ی «ژورنال‌نویسی»: اول حساب‌ها، فقط به‌شکلِ فشرده (اسم + سود/زیان +
// برچسب) — جزئیاتِ کامل (بالانس/تعدادِ معاملات/نرخِ برد/هدف) جاش صفحه‌ی
// خودِ حسابه، نه این فهرست. با انتخابِ هر حساب می‌رویم داخلِ آمار و
// معاملاتِ همان حساب.
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
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<TradeAccount | null>(null);
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
      // archived=1 یعنی «همه» (فعال+آرشیو) از سرور می‌آید، چون همون پاسخ برای
      // بعداً برگشتن به حالتِ عادی کش می‌مونه — این‌جا برای «نمایشِ آرشیو» فقط
      // خودِ آرشیوی‌ها نگه داشته می‌شن، نه فعال‌ها هم کنارشون.
      const list: TradeAccount[] = aData?.accounts || [];
      setAccounts(showArchived ? list.filter((a) => a.archived) : list);
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

  if (loading) return <PanelSkeleton />;

  return (
    <div>
      <div className="trade-accounts-head">
        <div className="trade-section-title">حساب‌های معاملاتی</div>
        <button type="button" className="trade-ghost-btn" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? "پنهان‌کردن آرشیو" : "نمایش آرشیو"}
        </button>
      </div>

      {actionError && <div className="trade-form-error">{actionError}</div>}

      {!accounts.length && (
        <div className="trade-empty-state">
          <Wallet size={32} />
          <p>{showArchived ? "هیچ حسابی توی آرشیو نیست" : "هنوز حسابی ایجاد نکردی"}</p>
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

// ردیفِ فشرده‌ی یک حساب — اسم + سود/زیان + برچسب، به‌علاوه‌ی منویِ
// سه‌نقطه‌ی کنارِ اسم (ویرایش/آرشیو). جزئیاتِ کاملِ حساب فقط با بازکردنِ
// خودِ صفحه‌ی حساب دیده می‌شود.
function AccountRow({
  account: a, index, onEdit, onToggleArchive, onPurge,
}: {
  account: TradeAccount;
  index: number;
  onEdit: () => void;
  onToggleArchive: () => void;
  onPurge: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const btnWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = btnWrapRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (btnWrapRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const netPnl = a.summary?.netPnl ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 8) * 0.045, ease: [0.22, 1, 0.36, 1] }}
      className={`trade-surface trade-account-card${a.archived ? " archived" : ""}`}
    >
      <span className="trade-account-stripe" style={{ background: a.color }} />

      <div className="trade-account-kebab" ref={btnWrapRef}>
        <button type="button" className="trade-icon-btn" onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())} aria-label="گزینه‌های حساب">
          <MoreVertical size={16} />
        </button>
        {menuOpen && menuPos && createPortal(
          <div ref={menuRef} style={{ top: menuPos.top, right: menuPos.right }} className="dash-context-menu trade-account-menu">
            <div className="wsearch-fab-option" onClick={() => { setMenuOpen(false); onEdit(); }}>
              <Pencil size={14} /> ویرایش حساب
            </div>
            <div className="wsearch-fab-option" onClick={() => { setMenuOpen(false); onToggleArchive(); }}>
              {a.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {a.archived ? "بازگردانی از آرشیو" : "آرشیو کردن"}
            </div>
            {a.archived && (
              <div className="wsearch-fab-option danger" onClick={() => { setMenuOpen(false); onPurge(); }}>
                <Trash2 size={14} /> حذف کامل
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      <Link href={`/trade/accounts/${a.id}`} className="trade-account-main">
        <div className="trade-account-title-row">
          <span className="trade-account-name">{a.name}</span>
          {a.archived && <span className="trade-account-archived-badge">آرشیو</span>}
        </div>

        <div className="trade-account-pnl mono" style={{ color: netPnl >= 0 ? "var(--accent)" : "#E05252" }}>
          {faNum(netPnl.toFixed(2))} {a.currency}
        </div>

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
            {busy ? <Loader2 size={15} className="trade-spin" /> : "حذف کامل"}
          </button>
        </div>
      </div>
    </>
  );
}
