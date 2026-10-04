"use client";

import "./money-mgmt.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DEFAULT_MONEY_RULES, MM_ACTION_LABELS, type MmEvent, type MoneyRules } from "@/lib/moneyMgmt";
import type { TradeAccount } from "@/lib/tradeTypes";
import { SegmentedTabs } from "./SegmentedTabs";
import { TickOption } from "./TickOption";
import { NumberInput } from "./NumberInput";
import { Spinner } from "./Spinner";

// قوانین مدیریت سرمایه‌ی هر حساب — اکسپرت متاتریدر در هر sync قوانین رو می‌گیره و
// روی پوزیشن‌های همون حساب اجرا می‌کنه. API: /api/trade/accounts/[id]/money

const MAX_ACCOUNT_TABS = 3;

type NumKey =
  | "riskPerTradePct" | "autoSLPct" | "slGraceSec" | "maxOpenTrades" | "maxDailyTrades" | "maxDailyLossPct"
  | "dailyProfitTargetPct" | "breakEvenAtR" | "beOffsetPoints" | "trailingStartR" | "trailingDistR";
type BoolKey = "enabled" | "requireSL" | "lockOnTarget";
type Draft = { [K in NumKey]: string } & { [K in BoolKey]: boolean };

type MoneyData = {
  rules: MoneyRules;
  log: MmEvent[];
  connected: boolean;
  eaVersion: string | null;
  eaLatest: string;
  eaOutdated: boolean;
  platform: string | null;
};

const NUM_KEYS: NumKey[] = [
  "riskPerTradePct", "autoSLPct", "slGraceSec", "maxOpenTrades", "maxDailyTrades", "maxDailyLossPct",
  "dailyProfitTargetPct", "breakEvenAtR", "beOffsetPoints", "trailingStartR", "trailingDistR",
];

function toDraft(r: MoneyRules): Draft {
  const d = { enabled: r.enabled, requireSL: r.requireSL, lockOnTarget: r.lockOnTarget } as Draft;
  for (const k of NUM_KEYS) d[k] = String(r[k]);
  return d;
}

function fmtTime(t: string): string {
  const n = /^\d{9,}$/.test(t) ? Number(t) * 1000 : NaN;
  if (!Number.isFinite(n)) return t;
  return new Date(n).toLocaleString("fa-IR-u-nu-latn", { dateStyle: "short", timeStyle: "medium" });
}

function Field({ label, hint, value, onChange, decimal = true }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; decimal?: boolean;
}) {
  return (
    <div className="mm-field">
      <label className="exercise-form-label">{label}</label>
      <NumberInput decimal={decimal} className="wsearch-newform-name trade-glass-field mm-ltr" dir="ltr" value={value} onChange={onChange} aria-label={label} />
      {hint && <div className="mm-hint">{hint}</div>}
    </div>
  );
}

export function MoneyManagementPanel({ accounts }: { accounts: TradeAccount[] | null }) {
  const [accountId, setAccountId] = useState<string>("");
  const [data, setData] = useState<MoneyData | null>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft(DEFAULT_MONEY_RULES));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (accounts && accounts.length && !accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const load = useCallback(async (id: string) => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch(`/api/trade/accounts/${id}/money`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as MoneyData;
      setData(d); setDraft(toDraft(d.rules));
    } catch {
      setData(null); setMsg({ text: "خواندن قوانین ناموفق بود", error: true });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (accountId) void load(accountId); }, [accountId, load]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    if (!accountId || saving) return;
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(`/api/trade/accounts/${accountId}/money`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: draft }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "ذخیره نشد");
      setDraft(toDraft(d.rules as MoneyRules));
      setData((p) => (p ? { ...p, rules: d.rules } : p));
      setMsg({ text: "ذخیره شد؛ اکسپرت در همگام‌سازی بعدی قوانین را می‌گیرد", error: false });
    } catch (e) {
      setMsg({ text: e instanceof Error && e.message ? e.message : "ذخیره نشد", error: true });
    } finally { setSaving(false); }
  }

  const options = useMemo(() => (accounts || []).map((a) => ({ value: a.id, label: a.name })), [accounts]);

  if (accounts === null) return <div className="mm-root"><Spinner /></div>;
  if (!accounts.length) {
    return (
      <div className="mm-root">
        <div className="mm-warn">اول یک حساب معاملاتی بسازید و متاتریدر را به آن وصل کنید. <Link href="/trade/journal">حساب‌ها</Link></div>
      </div>
    );
  }

  const linked = !!data && (data.connected || !!data.platform);
  const logRows = data ? [...data.log].reverse() : [];

  return (
    <div className="mm-root">
      <span className="mm-badge">آزمایشی (فقط ادمین)</span>

      {options.length > 1 && (
        options.length <= MAX_ACCOUNT_TABS ? (
          <SegmentedTabs options={options} active={accountId} onChange={setAccountId} ariaLabel="حساب" />
        ) : (
          <span className="acc-select-wrap">
            <select className="wsearch-newform-name trade-glass-field acc-select" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="حساب">
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={15} />
          </span>
        )
      )}

      {loading && <Spinner />}

      {data && !loading && (
        <>
          {!data.connected && (
            <div className="mm-warn">
              متاتریدر به این حساب وصل نیست. <Link href="/trade/metatrader">اتصال متاتریدر</Link>
            </div>
          )}
          {data.connected && data.eaOutdated && (
            <div className="mm-warn">
              نسخه‌ی اکسپرت شما {data.eaVersion ? `(v${data.eaVersion}) ` : ""}قدیمی است و قوانین را اجرا نمی‌کند. نسخه‌ی {data.eaLatest} را
              از <Link href="/trade/metatrader">اتصال متاتریدر</Link> دوباره دانلود کنید.
            </div>
          )}
          {data.connected && !data.eaOutdated && data.eaVersion && (
            <div className="mm-hint">اکسپرت متصل است (v{data.eaVersion})</div>
          )}

          <TickOption checked={draft.enabled} onChange={(v) => set("enabled", v)}>
            مدیریت سرمایه روی این حساب فعال باشد
          </TickOption>

          <div className="mm-section">
            <div className="mm-section-title">ریسک هر معامله</div>
            <div className="mm-grid">
              <Field label="حداکثر ریسک هر پوزیشن (درصد موجودی)" value={draft.riskPerTradePct} onChange={(v) => set("riskPerTradePct", v)}
                hint="اگر حد ضرر بخورد بیشتر از این درصد ضرر نکنید؛ اکسپرت حجم اضافه را می‌بندد" />
            </div>
            <TickOption checked={draft.requireSL} onChange={(v) => set("requireSL", v)}>حد ضرر اجباری باشد</TickOption>
            {draft.requireSL && (
              <div className="mm-grid">
                <Field label="حد ضرر خودکار (درصد ریسک)" value={draft.autoSLPct} onChange={(v) => set("autoSLPct", v)}
                  hint="0 = حد ضرر نمی‌گذارد و پوزیشن بدون حد ضرر بسته می‌شود" />
                <Field label="مهلت قبل از بستن (ثانیه)" decimal={false} value={draft.slGraceSec} onChange={(v) => set("slGraceSec", v)}
                  hint="بین 10 تا 600؛ فقط وقتی حد ضرر خودکار خاموش است" />
              </div>
            )}
          </div>

          <div className="mm-section">
            <div className="mm-section-title">محدودیت تعداد</div>
            <div className="mm-grid">
              <Field label="حداکثر پوزیشن باز" decimal={false} value={draft.maxOpenTrades} onChange={(v) => set("maxOpenTrades", v)} hint="0 = خاموش؛ پوزیشن اضافه بلافاصله بسته می‌شود" />
              <Field label="حداکثر معامله در روز" decimal={false} value={draft.maxDailyTrades} onChange={(v) => set("maxDailyTrades", v)} hint="0 = خاموش؛ روز بر پایه‌ی ساعت سرور بروکر" />
            </div>
          </div>

          <div className="mm-section">
            <div className="mm-section-title">قفل روزانه</div>
            <div className="mm-grid">
              <Field label="حداکثر ضرر روزانه (درصد)" value={draft.maxDailyLossPct} onChange={(v) => set("maxDailyLossPct", v)}
                hint="0 = خاموش؛ با رسیدن به آن همه‌ی پوزیشن‌ها بسته و تا فردا هر پوزیشن تازه بسته می‌شود" />
              <Field label="هدف سود روزانه (درصد)" value={draft.dailyProfitTargetPct} onChange={(v) => set("dailyProfitTargetPct", v)} hint="0 = خاموش" />
            </div>
            <TickOption checked={draft.lockOnTarget} onChange={(v) => set("lockOnTarget", v)}>با رسیدن به هدف سود، قفل شود</TickOption>
          </div>

          <div className="mm-section">
            <div className="mm-section-title">سر به سر و تریلینگ (بر پایه‌ی R)</div>
            <div className="mm-grid">
              <Field label="سر به سر در چند R" value={draft.breakEvenAtR} onChange={(v) => set("breakEvenAtR", v)} hint="0 = خاموش؛ R یعنی فاصله‌ی ورود تا حد ضرر اولیه" />
              <Field label="فاصله‌ی بالاتر از ورود (پوینت)" decimal={false} value={draft.beOffsetPoints} onChange={(v) => set("beOffsetPoints", v)} />
              <Field label="شروع تریلینگ در چند R" value={draft.trailingStartR} onChange={(v) => set("trailingStartR", v)} hint="0 = خاموش" />
              <Field label="فاصله‌ی تریلینگ (R)" value={draft.trailingDistR} onChange={(v) => set("trailingDistR", v)} />
            </div>
          </div>

          <div className="mm-actions">
            <button type="button" className="trade-primary-btn" onClick={save} disabled={saving || !linked}>
              {saving ? <Spinner /> : "ذخیره"}
            </button>
            {msg && <span className={`mm-msg${msg.error ? " is-error" : ""}`}>{msg.text}</span>}
          </div>

          <div className="mm-section">
            <div className="mm-section-title">آخرین اقدام‌های اکسپرت</div>
            {logRows.length === 0 ? (
              <div className="mm-hint">هنوز اقدامی ثبت نشده</div>
            ) : (
              <ul className="mm-log">
                {logRows.map((e, i) => (
                  <li key={`${e.t}-${i}`}>
                    <span className="mm-log-time">{fmtTime(e.t)}</span>
                    <span>{MM_ACTION_LABELS[e.action] || e.action}</span>
                    {e.ticket && <span className="mm-log-detail">#{e.ticket}</span>}
                    {e.detail && <span className="mm-log-detail">{e.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {!data && !loading && msg && <div className={`mm-msg${msg.error ? " is-error" : ""}`}>{msg.text}</div>}
    </div>
  );
}
