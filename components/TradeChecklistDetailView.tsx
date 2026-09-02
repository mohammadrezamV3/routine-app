"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { faNum, isoLocal } from "@/lib/jalali";
import { getSetting } from "@/lib/storage";
import { PanelSkeleton } from "./PanelSkeleton";
import { TradeFormModal } from "./TradeFormModal";
import { DEFAULT_NEWS_ALERT_PREFS, NEWS_ALERT_KEY, normalizeNewsAlertPrefs } from "@/lib/tradeNewsAlerts";
import { IMPACT_COLORS, IMPACT_LABELS, currencyMeta, EconomicEventDto } from "@/lib/economicCalendar";
import { CAL_SYSTEM_KEY, CalSystem, TradeAccount, TradeTag } from "@/lib/tradeTypes";

type Item = { id: string; text: string; order: number };
type Checklist = { id: string; name: string; color: string; required: boolean; archived: boolean; order: number; items: Item[] };

function countdownText(occursAt: string, now: number): string {
  const diff = new Date(occursAt).getTime() - now;
  if (diff <= 0) return "هم‌اکنون";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${faNum(mins)} دقیقه دیگر`;
  const hours = Math.floor(mins / 60);
  const restMins = mins % 60;
  if (hours < 24) return restMins ? `${faNum(hours)} ساعت و ${faNum(restMins)} دقیقه دیگر` : `${faNum(hours)} ساعت دیگر`;
  const days = Math.floor(hours / 24);
  return `${faNum(days)} روز دیگر`;
}

// صفحه‌ی اختصاصی یک چک‌لیست — دقیقا هم‌الگوی صفحه‌ی یک حساب: انتخاب از
// فهرست، نه پاپ‌آپ. این‌جا آیتم‌ها واقعا تیک می‌خورند، معامله شروع می‌شود، و
// زیرش اخبار اقتصادی منطبق با ترجیح سطح تأثیر کاربر (تنظیمات ترید) با
// شمارش‌معکوس نشان داده می‌شود.
export function TradeChecklistDetailView({ checklistId }: { checklistId: string }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [accounts, setAccounts] = useState<TradeAccount[]>([]);
  const [tags, setTags] = useState<TradeTag[]>([]);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [tradeFor, setTradeFor] = useState<TradeAccount | null>(null);
  const [pickAccountOpen, setPickAccountOpen] = useState(false);
  const [newsImpacts, setNewsImpacts] = useState<string[]>(DEFAULT_NEWS_ALERT_PREFS.impacts);
  const [news, setNews] = useState<EconomicEventDto[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<unknown>(NEWS_ALERT_KEY, DEFAULT_NEWS_ALERT_PREFS).then((v) => setNewsImpacts(normalizeNewsAlertPrefs(v).impacts));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, aRes, tRes] = await Promise.all([
        fetch("/api/trade/checklists").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/trade/accounts?archived=0").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/trade/tags").then((r) => (r.ok ? r.json() : null)),
      ]);
      const found = (cRes?.checklists || []).find((c: Checklist) => c.id === checklistId) || null;
      if (!found) { setNotFound(true); return; }
      setChecklist(found);
      setAccounts(aRes?.accounts || []);
      setTags(tRes?.tags || []);
    } finally {
      setLoading(false);
    }
  }, [checklistId]);

  useEffect(() => { load(); }, [load]);

  // شمارش‌معکوس هر دقیقه به‌روز می‌شود — دقت ثانیه‌ای برای یک رویداد
  // اقتصادی که معمولا ساعت‌ها/روزها فاصله دارد لازم نیست.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setNewsLoading(true);
    const from = isoLocal(new Date());
    const to = isoLocal(new Date(Date.now() + 14 * 86_400_000));
    const qs = new URLSearchParams({ from, to });
    if (newsImpacts.length) qs.set("impacts", newsImpacts.join(","));
    fetch(`/api/trade/economic-calendar?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setNews((d?.events || []).slice(0, 6)); })
      .finally(() => { if (!cancelled) setNewsLoading(false); });
    return () => { cancelled = true; };
  }, [newsImpacts]);

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts]);

  function startTrade() {
    if (activeAccounts.length === 1) { setTradeFor(activeAccounts[0]); return; }
    setPickAccountOpen(true);
  }

  if (loading) return <PanelSkeleton />;
  if (notFound || !checklist) return <div className="item-line empty">این چک‌لیست پیدا نشد.</div>;

  const done = checklist.items.filter((i) => checkedState[i.id]).length;

  return (
    <div>
      <div className="trade-surface trade-account-header">
        <span className="trade-account-stripe" style={{ background: checklist.color }} />
        <div className="trade-account-header-main">
          <div className="trade-account-title-row">
            <h1 style={{ margin: 0 }}>{checklist.name}</h1>
            {checklist.required && <span className="trade-account-type">الزامی</span>}
          </div>
        </div>
      </div>

      <div className="trade-checklist-items" style={{ marginTop: 16 }}>
        {checklist.items.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`trade-check-row${checkedState[i.id] ? " done" : ""}`}
            onClick={() => setCheckedState((s) => ({ ...s, [i.id]: !s[i.id] }))}
          >
            <span className="trade-check-box" />
            <span>{i.text}</span>
          </button>
        ))}
        {!checklist.items.length && <div className="item-line empty">این چک‌لیست هنوز آیتمی ندارد</div>}
      </div>

      <div className="trade-checklist-card-foot" style={{ marginTop: 14 }}>
        <span className="mono">{faNum(done)} / {faNum(checklist.items.length)}</span>
        <button type="button" className="trade-primary-btn" onClick={startTrade} disabled={!activeAccounts.length}>
          معامله
        </button>
      </div>

      <div className="domain-sub" style={{ margin: "26px 0 10px" }}>اخبار پیش‌رو</div>
      {newsLoading && <PanelSkeleton />}
      {!newsLoading && !news.length && (
        <div className="item-line empty">
          <CalendarClock size={15} style={{ verticalAlign: "-2px", marginLeft: 6 }} />
          خبر منطبق با سطح تأثیر انتخابی‌ات در روزهای پیش‌رو نیست.
        </div>
      )}
      {!newsLoading && !!news.length && (
        <div className="trade-checklist-news-list">
          {news.map((e) => {
            const meta = currencyMeta(e.currency);
            return (
              <div key={e.id} className="trade-cal-event">
                <span className="trade-cal-impact" style={{ background: IMPACT_COLORS[e.impact] }} title={IMPACT_LABELS[e.impact]} />
                <span className="trade-cal-main">
                  <span className="trade-cal-title">
                    {meta?.flag} <b className="mono">{e.currency}</b> — {e.title}
                  </span>
                  <span className="trade-cal-values">
                    <span className="mono">{countdownText(e.occursAt, now)}</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {pickAccountOpen && (
        <>
          <div className="modal-overlay open" onClick={() => setPickAccountOpen(false)} />
          <div className="modal-panel open" role="dialog" aria-modal="true">
            <div className="modal-head"><div className="modal-title">معامله در کدام حساب؟</div></div>
            {!activeAccounts.length && <div className="item-line empty">اول باید یک حساب بسازی</div>}
            <div className="trade-account-picker">
              {activeAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="trade-account-pick"
                  onClick={() => { setTradeFor(a); setPickAccountOpen(false); }}
                >
                  <span className="trade-tag-dot" style={{ background: a.color }} />
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tradeFor && (
        <TradeFormModal
          account={tradeFor}
          entry={null}
          tags={tags}
          calSystem={calSystem}
          presetChecklistId={checklist.id}
          onTagCreated={(t) => setTags((p) => [...p, t])}
          onClose={() => setTradeFor(null)}
          onSaved={() => setTradeFor(null)}
        />
      )}
    </div>
  );
}
