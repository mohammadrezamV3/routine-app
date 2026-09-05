"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, NotebookPen } from "lucide-react";
import { TradeAccount, TradeTag, CalSystem } from "@/lib/tradeTypes";
import { pairLabel } from "@/lib/tradingView";
import { TradeFormModal } from "./TradeFormModal";

type ChecklistItem = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; items: ChecklistItem[] };

/**
 * پنلِ کنارِ چارت: چک‌لیستِ پیش از ورود + دکمه‌ی ثبتِ معامله.
 *
 * چرا این‌جا یک فرمِ ثبتِ جداگانه ساخته نشده و همان `TradeFormModal` باز
 * می‌شود: معامله همیشه زیرِ یک حساب ثبت می‌شود و وضعیتِ چک‌لیست در لحظه‌ی
 * ثبت snapshot می‌شود. یک فرمِ دومِ ساده‌تر یعنی یا این قواعد را دور بزنیم
 * یا همان منطق را دوباره بنویسیم — هر دو بد. پس این‌جا فقط نماد و حساب
 * انتخاب می‌شود و ثبت با همان فرمِ اصلی انجام می‌گیرد.
 *
 * تیک‌های این چک‌لیست عمداً حالتِ محلی‌اند: یک یادآورِ پیش از ورود‌ند، نه
 * داده‌ی ذخیره‌شده. چیزی که ذخیره می‌شود همان snapshotِ داخلِ فرمِ ثبت است.
 *
 * دو کارتِ جدا برمی‌گرداند (نه یک کارت با خط‌جداکننده) چون در چیدمانِ
 * دسکتاپ هرکدام یک خانه‌ی مستقلِ گرید است: چک‌لیست بالا، ثبتِ معامله پایین.
 * پس اینجا فقط یک Fragment است و جای‌گیری با گرید تصمیم گرفته می‌شود.
 */
export function ChartTradePanel({
  symbol,
  accounts,
  tags,
  calSystem,
  onTagCreated,
  onSaved,
}: {
  symbol: string;
  accounts: TradeAccount[];
  tags: TradeTag[];
  calSystem: CalSystem;
  onTagCreated: (t: TradeTag) => void;
  onSaved: () => void;
}) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [accountId, setAccountId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetch("/api/trade/checklists")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setChecklists((d?.checklists || []).filter((c: Checklist) => !c.archived)))
      .catch(() => setChecklists([]));
  }, []);

  const active = accounts.filter((a) => !a.archived);
  useEffect(() => {
    if (!accountId && active.length) setAccountId(active[0].id);
  }, [active, accountId]);

  const checklist = checklists[0] || null;
  // با عوض‌شدنِ نماد، تیک‌ها پاک می‌شوند — چک‌لیستِ EURUSD به XAUUSD
  // ربطی ندارد و نگه‌داشتنِ تیک‌ها یک تأییدِ جعلی است.
  useEffect(() => { setChecked({}); }, [symbol]);

  const doneCount = useMemo(
    () => (checklist ? checklist.items.filter((i) => checked[i.id]).length : 0),
    [checklist, checked]
  );

  const selectedAccount = active.find((a) => a.id === accountId) || null;

  return (
    <>
      <div className="trade-surface trade-chart-side tv-cell-check">
        <div className="trade-panel-head">
          <span className="trade-panel-title">
            <ClipboardCheck size={16} /> چک‌لیست معامله
          </span>
          {checklist && (
            <span className="trade-chat-room mono">
              {doneCount}/{checklist.items.length}
            </span>
          )}
        </div>

        {!checklist && (
          <div className="trade-chat-empty">
            هنوز چک‌لیستی نساخته‌ای — از بخش چک‌لیست‌ها یکی بساز.
          </div>
        )}

        {checklist && (
          <div className="trade-chart-checklist tv-cell-scroll thin-scroll">
            {checklist.items.map((item) => (
              <label key={item.id} className="trade-chart-check-row">
                <span>{item.text}</span>
                <input
                  type="checkbox"
                  checked={!!checked[item.id]}
                  onChange={(e) => setChecked((p) => ({ ...p, [item.id]: e.target.checked }))}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="trade-surface trade-chart-side tv-cell-entry">
        <div className="trade-panel-head">
          <span className="trade-panel-title">
            <NotebookPen size={16} /> ثبت معامله
          </span>
        </div>

        <div className="tv-cell-scroll thin-scroll">
          {!active.length ? (
            <div className="trade-chat-empty">
              برای ثبت معامله اول یک حساب معاملاتی بساز.
            </div>
          ) : (
            <>
              <label className="exercise-form-label">حساب</label>
              <select
                className="wsearch-newform-name trade-glass-field"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {active.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <div className="trade-chart-side-symbol">
                نماد: <b className="mono">{symbol}</b> <span>({pairLabel(symbol)})</span>
              </div>

              <button
                type="button"
                className="trade-primary-btn"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => setFormOpen(true)}
                disabled={!selectedAccount}
              >
                <NotebookPen size={15} /> ثبت معامله
              </button>
            </>
          )}
        </div>

        {formOpen && selectedAccount && (
          <TradeFormModal
            account={selectedAccount}
            entry={null}
            tags={tags}
            calSystem={calSystem}
            presetSymbol={symbol}
            presetChecklistId={checklist?.id ?? null}
            onTagCreated={onTagCreated}
            onClose={() => setFormOpen(false)}
            onSaved={() => { setFormOpen(false); onSaved(); }}
          />
        )}
      </div>
    </>
  );
}
