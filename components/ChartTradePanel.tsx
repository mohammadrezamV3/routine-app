"use client";

import { useEffect, useMemo, useState } from "react";
import { TickButton } from "./TickButton";
import { Calculator, ClipboardCheck, NotebookPen } from "lucide-react";
import { useFeature } from "@/lib/useFeatures";
import { RiskCalculator } from "./RiskCalculator";
import { TradeAccount, TradeTag, CalSystem } from "@/lib/tradeTypes";
import { pairLabel } from "@/lib/tradingView";
import { TradeFormModal } from "./TradeFormModal";
import { tr } from "@/lib/i18n";
import "./risk-calc.css";

type ChecklistItem = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; items: ChecklistItem[] };

type ToolKey = "journal" | "checklist" | "risk";

const toolMeta = (): Record<ToolKey, { label: string; icon: React.ReactNode }> => ({
  journal: { label: tr("ژورنال", "Journal"), icon: <NotebookPen /> },
  checklist: { label: tr("چک‌لیست", "Checklist"), icon: <ClipboardCheck /> },
  risk: { label: tr("ریسک و سود", "Risk & reward"), icon: <Calculator /> },
});

/**
 * پنل ابزارهای کنار چارت: ثبت معامله، چک‌لیست پیش از ورود و ریسک و سود.
 *
 * سه ابزار یک بخش گروه‌شده‌اند، مثل DashQuickPanels: یک ردیف باکس کوچیک
 * فقط‌آیکون (انتخاب‌شده بزرگ می‌شه و اسمش ظاهر می‌شه) و زیرش یک باکس با
 * محتوای ابزار انتخاب‌شده. هر سه پنل همیشه mount می‌مونن و فقط پنهان
 * می‌شن تا تیک‌ها، حساب انتخابی و ورودی‌های ماشین‌حساب با عوض‌کردن ابزار
 * گم نشن؛ انیمیشن ورود با CSS روی پنل فعال اجرا می‌شه.
 *
 * چرا این‌جا یک فرم ثبت جداگانه ساخته نشده و همان `TradeFormModal` باز
 * می‌شود: معامله همیشه زیر یک حساب ثبت می‌شود و وضعیت چک‌لیست در لحظه‌ی
 * ثبت snapshot می‌شود. یک فرم دوم ساده‌تر یعنی یا این قواعد را دور بزنیم
 * یا همان منطق را دوباره بنویسیم — هر دو بد. پس این‌جا فقط نماد و حساب
 * انتخاب می‌شود و ثبت با همان فرم اصلی انجام می‌گیرد.
 *
 * تیک‌های این چک‌لیست عمدا حالت محلی‌اند: یک یادآور پیش از ورود‌ند، نه
 * داده‌ی ذخیره‌شده. چیزی که ذخیره می‌شود همان snapshot داخل فرم ثبت است.
 *
 * یک خانه‌ی گرید (`.tv-cell-tools`) برمی‌گرداند و جای‌گیری با گرید
 * تصمیم گرفته می‌شود.
 */
export function ChartTradePanel({
  symbol,
  accounts,
  tags,
  calSystem,
  initialChecklistId = null,
  onTagCreated,
  onSaved,
}: {
  symbol: string;
  accounts: TradeAccount[];
  tags: TradeTag[];
  calSystem: CalSystem;
  /** از صفحه‌ی یک چک‌لیست تکمیل‌شده اومده باشیم، همون چک‌لیست پیش‌انتخاب می‌شه. */
  initialChecklistId?: string | null;
  onTagCreated: (t: TradeTag) => void;
  onSaved: () => void;
}) {
  const riskOn = useFeature("tradeRisk") === true;
  const [tool, setTool] = useState<ToolKey>(initialChecklistId ? "checklist" : "journal");
  const tools: ToolKey[] = riskOn ? ["journal", "checklist", "risk"] : ["journal", "checklist"];
  const currentTool = tools.includes(tool) ? tool : "journal";
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  // طبق درخواست صریح، چک‌لیست قابل عوض‌کردن است — قبلا همیشه اولین
  // چک‌لیست بود و هیچ راهی برای انتخاب بقیه نبود.
  const [checklistId, setChecklistId] = useState<string>(initialChecklistId || "");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [accountId, setAccountId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  // بعد از ثبت موفق، مودال می‌بندد و بدون این پیام کاربر نمی‌فهمید معامله ثبت شد
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 4000);
    return () => clearTimeout(t);
  }, [savedAt]);

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

  const checklist = checklists.find((c) => c.id === checklistId) || checklists[0] || null;
  useEffect(() => {
    if (!checklistId && checklists.length) setChecklistId(checklists[0].id);
  }, [checklists, checklistId]);
  // عوض‌کردن چک‌لیست یعنی تیک‌های قبلی بی‌معنی‌اند
  useEffect(() => { setChecked({}); }, [checklistId]);
  // با عوض‌شدن نماد، تیک‌ها پاک می‌شوند — چک‌لیست EURUSD به XAUUSD
  // ربطی ندارد و نگه‌داشتن تیک‌ها یک تایید جعلی است.
  useEffect(() => { setChecked({}); }, [symbol]);

  const doneCount = useMemo(
    () => (checklist ? checklist.items.filter((i) => checked[i.id]).length : 0),
    [checklist, checked]
  );

  const selectedAccount = active.find((a) => a.id === accountId) || null;

  return (
    <div className="tv-cell-tools">
      <div className="tv-tools-row" role="tablist" aria-label={tr("ابزارهای معامله", "Trade tools")}>
        {tools.map((key) => {
          const on = key === currentTool;
          const meta = toolMeta()[key];
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={meta.label}
              title={meta.label}
              onClick={() => setTool(key)}
              className={`dash-quick-tile rounded-dash border bg-dash-card backdrop-blur-xl${on ? " is-on" : ""}`}
            >
              <span className="dash-quick-tile-icon">{meta.icon}</span>
              <span className="dash-quick-tile-label" aria-hidden={!on}>{meta.label}</span>
            </button>
          );
        })}
      </div>

      <div className="trade-surface trade-chart-side">
      <div className="tv-tool-pane" hidden={currentTool !== "checklist"} role="tabpanel">
        <div className="trade-panel-head">
          <span className="trade-panel-title">
            <ClipboardCheck size={16} /> {tr("چک‌لیست معامله", "Trade checklist")}
          </span>
          {checklist && (
            <span className="trade-chat-room mono">
              {doneCount}/{checklist.items.length}
            </span>
          )}
        </div>

        {!checklist && (
          <div className="trade-chat-empty">
            {tr("هنوز چک‌لیستی نساخته‌ای — از بخش چک‌لیست‌ها یکی بساز.", "You have not created a checklist yet. Create one in the Checklists section.")}
          </div>
        )}

        {checklists.length > 1 && (
          <select
            className="wsearch-newform-name trade-glass-field trade-chart-check-picker"
            value={checklist ? checklist.id : ""}
            onChange={(e) => setChecklistId(e.target.value)}
            aria-label={tr("انتخاب چک‌لیست", "Select checklist")}
          >
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {checklist && (
          <div className="trade-chart-checklist tv-cell-scroll thin-scroll">
            {checklist.items.map((item) => (
              <label key={item.id} className="trade-chart-check-row">
                <span>{item.text}</span>
                <TickButton
                  size={22}
                  checked={!!checked[item.id]}
                  onToggle={() => setChecked((p) => ({ ...p, [item.id]: !p[item.id] }))}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="tv-tool-pane" hidden={currentTool !== "journal"} role="tabpanel">
        <div className="trade-panel-head">
          <span className="trade-panel-title">
            <NotebookPen size={16} /> {tr("ثبت معامله", "Log trade")}
          </span>
        </div>

        <div className="tv-cell-scroll thin-scroll">
          {!active.length ? (
            <div className="trade-chat-empty">
              {tr("برای ثبت معامله اول یک حساب معاملاتی بساز.", "Create a trading account first to log a trade.")}
            </div>
          ) : (
            <>
              <label className="exercise-form-label">{tr("حساب", "Account")}</label>
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
                {tr("نماد:", "Symbol:")} <b className="mono">{symbol}</b> <span>({pairLabel(symbol)})</span>
              </div>

              {savedAt && <div className="trade-chart-saved" role="status">{tr("معامله ثبت شد", "Trade logged")}</div>}
              <button
                type="button"
                className="account-outline-btn"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => setFormOpen(true)}
                disabled={!selectedAccount}
              >
                <NotebookPen size={15} /> {tr("ثبت معامله", "Log trade")}
              </button>
            </>
          )}
        </div>
      </div>

      {riskOn && (
        <div className="tv-tool-pane" hidden={currentTool !== "risk"} role="tabpanel">
          <div className="trade-panel-head">
            <span className="trade-panel-title">
              <Calculator size={16} /> {tr("ریسک و سود", "Risk & reward")}
            </span>
            <span className="trade-chat-room mono"><bdi dir="ltr">{symbol}</bdi></span>
          </div>
          <div className="tv-cell-scroll thin-scroll">
            <RiskCalculator accounts={accounts} symbol={symbol} compact />
          </div>
        </div>
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
            onSaved={() => { setFormOpen(false); setSavedAt(Date.now()); onSaved(); }}
          />
        )}
    </div>
  );
}
