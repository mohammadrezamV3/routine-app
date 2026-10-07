"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { formatDateTime, formatNumber } from "@/lib/adminFormat";
import { NumberInput } from "@/components/NumberInput";
import { TickOption } from "@/components/TickOption";
import { AdminMaintenanceCard } from "@/components/AdminMaintenanceCard";
import { useTheme } from "@/components/ThemeProvider";
import { readAdminNoir, writeAdminNoir } from "@/lib/adminTheme";
import { MAX_TRIAL_AI_LIMIT, TRIAL_AI_FEATURES, TRIAL_AI_FEATURE_LABELS_FA, TRIAL_DAYS, type TrialAiFeature, type TrialAiLimits } from "@/lib/trial";

type Rate = { inputPer1kUsdMicros: number; outputPer1kUsdMicros: number };
type SettingsResp = { aiCostRate: Rate; defaultAiCostRate: Rate; trialAiLimits: TrialAiLimits; defaultTrialAiLimits: TrialAiLimits; nomoFreeUses: number; defaultNomoFreeUses: number };
type TrialDraft = Record<TrialAiFeature, string>;
const toDraft = (l: TrialAiLimits) => Object.fromEntries(TRIAL_AI_FEATURES.map((f) => [f, String(l[f])])) as TrialDraft;
type AuditRow = { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string; actor: { name: string | null; lastName: string | null; username: string | null } | null };

const MAX_RATE = 100_000_000; // هم‌راستا با سقف PATCH /api/admin/settings

export default function AdminSettingsPage() {
  const toast = useAdminToast();
  const { can } = useAdminAccess();
  // لاگ فعالیت دسترسی جدای «audit» می‌خواد؛ ادمینی که فقط «settings» داره
  // قبلا ۴۰۳ می‌گرفت و این کارت برای همیشه «در حال بارگذاری» می‌موند.
  const canAudit = can("audit");
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [inputRate, setInputRate] = useState("");
  const [outputRate, setOutputRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [trialDraft, setTrialDraft] = useState<TrialDraft | null>(null);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [nomoDraft, setNomoDraft] = useState("");
  const [nomoSaving, setNomoSaving] = useState(false);
  const [nomoError, setNomoError] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const [noir, setNoir] = useState(false);
  useEffect(() => { setNoir(readAdminNoir()); }, []);
  function changeNoir(on: boolean) {
    setNoir(on);
    writeAdminNoir(on);
    // این تم فقط روی تم تیره اعمال می‌شه؛ با همون مکانیزم تم خود اپ
    if (on && theme !== "dark") toggleTheme();
  }
  const [indexNowBusy, setIndexNowBusy] = useState(false);
  const [indexNowMsg, setIndexNowMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);

  const loadAudit = useCallback(() => {
    if (!canAudit) return;
    adminFetch<{ entries: AuditRow[] }>("/api/admin/audit-log?pageSize=15")
      .then((d) => { setAudit(d.entries); setAuditError(null); })
      .catch((e) => setAuditError(e.message));
  }, [canAudit]);

  useEffect(() => {
    adminFetch<SettingsResp>("/api/admin/settings")
      .then((d) => {
        setSettings(d);
        setInputRate(String(d.aiCostRate.inputPer1kUsdMicros));
        setOutputRate(String(d.aiCostRate.outputPer1kUsdMicros));
        setTrialDraft(toDraft(d.trialAiLimits));
        setNomoDraft(String(d.nomoFreeUses));
      })
      .catch((e) => setSettingsError(e.message));
    loadAudit();
  }, [loadAudit]);

  const dirty = !!settings && (inputRate !== String(settings.aiCostRate.inputPer1kUsdMicros) || outputRate !== String(settings.aiCostRate.outputPer1kUsdMicros));

  async function save() {
    if (saving || !settings) return;
    if (inputRate === "" || outputRate === "") { setFormError("هر دو نرخ را وارد کن"); return; }
    const inRate = Number(inputRate), outRate = Number(outputRate);
    if (!Number.isFinite(inRate) || !Number.isFinite(outRate) || inRate > MAX_RATE || outRate > MAX_RATE) {
      setFormError(`نرخ باید عددی بین 0 تا ${formatNumber(MAX_RATE)} باشد`);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const d = await adminFetch<{ aiCostRate: Rate }>("/api/admin/settings", {
        method: "PATCH",
        json: { inputPer1kUsdMicros: inRate, outputPer1kUsdMicros: outRate },
      });
      setSettings({ ...settings, aiCostRate: d.aiCostRate });
      setInputRate(String(d.aiCostRate.inputPer1kUsdMicros));
      setOutputRate(String(d.aiCostRate.outputPer1kUsdMicros));
      toast("نرخ هزینه‌ی AI ذخیره شد");
      loadAudit();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const trialDirty = !!settings && !!trialDraft && TRIAL_AI_FEATURES.some((f) => trialDraft[f] !== String(settings.trialAiLimits[f]));

  async function saveTrial() {
    if (trialSaving || !settings || !trialDraft) return;
    const limits = {} as TrialAiLimits;
    for (const f of TRIAL_AI_FEATURES) {
      const n = trialDraft[f] === "" ? NaN : Number(trialDraft[f]);
      if (!Number.isInteger(n) || n < 0 || n > MAX_TRIAL_AI_LIMIT) {
        setTrialError(`هر سقف باید عدد صحیحی بین 0 تا ${formatNumber(MAX_TRIAL_AI_LIMIT)} باشد`);
        return;
      }
      limits[f] = n;
    }
    setTrialError(null);
    setTrialSaving(true);
    try {
      const d = await adminFetch<{ trialAiLimits: TrialAiLimits }>("/api/admin/settings", { method: "PATCH", json: { trialAiLimits: limits } });
      setSettings({ ...settings, trialAiLimits: d.trialAiLimits });
      setTrialDraft(toDraft(d.trialAiLimits));
      toast("سقف‌های AI دوره‌ی آزمایشی ذخیره شد");
      loadAudit();
    } catch (e: any) {
      setTrialError(e.message);
    } finally {
      setTrialSaving(false);
    }
  }

  const nomoDirty = !!settings && nomoDraft !== String(settings.nomoFreeUses);

  async function saveNomo() {
    if (nomoSaving || !settings) return;
    const n = nomoDraft === "" ? NaN : Number(nomoDraft);
    if (!Number.isInteger(n) || n < 0 || n > MAX_TRIAL_AI_LIMIT) {
      setNomoError(`تعداد باید عدد صحیحی بین 0 تا ${formatNumber(MAX_TRIAL_AI_LIMIT)} باشد`);
      return;
    }
    setNomoError(null);
    setNomoSaving(true);
    try {
      const d = await adminFetch<{ nomoFreeUses: number }>("/api/admin/settings", { method: "PATCH", json: { nomoFreeUses: n } });
      setSettings({ ...settings, nomoFreeUses: d.nomoFreeUses });
      setNomoDraft(String(d.nomoFreeUses));
      toast("پیام‌های رایگان نومو ذخیره شد");
      loadAudit();
    } catch (e: any) {
      setNomoError(e.message);
    } finally {
      setNomoSaving(false);
    }
  }

  async function submitIndexNow() {
    if (indexNowBusy) return;
    setIndexNowBusy(true);
    setIndexNowMsg(null);
    try {
      const d = await adminFetch<{ submitted: number }>("/api/admin/seo/indexnow", { method: "POST" });
      setIndexNowMsg({ text: `${formatNumber(d.submitted)} آدرس ارسال شد`, tone: "ok" });
      loadAudit();
    } catch (e: any) {
      setIndexNowMsg({ text: e?.message || "ارسال ناموفق بود", tone: "err" });
    } finally {
      setIndexNowBusy(false);
    }
  }

  return (
    <section>
      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">ایندکس فوری سایت (IndexNow)</span></div>
        <div className="admin-section-hint admin-settings-hint">
          همه‌ی آدرس‌های sitemap رو به Bing/Yandex اطلاع می‌ده تا زودتر از کراول دوره‌ای ایندکس بشن —
          نیاز به تنظیم <code className="mono">INDEXNOW_KEY</code> در env داره.
        </div>
        <div className="admin-settings-actions">
          <button type="button" className="admin-btn primary" onClick={submitIndexNow} disabled={indexNowBusy}>
            {indexNowBusy ? "در حال ارسال…" : "ارسال به IndexNow"}
          </button>
          {indexNowMsg && (
            <span className={`admin-settings-msg ${indexNowMsg.tone}`} role={indexNowMsg.tone === "err" ? "alert" : "status"}>{indexNowMsg.text}</span>
          )}
        </div>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">نرخ تخمین هزینه AI</span></div>
        <div className="admin-section-hint admin-settings-hint">
          به میکرو-دلار به‌ازای هر 1000 توکن — پیش‌فرض بر اساس نرخ عمومی gpt-4o-mini
          {settings && <> (<span className="admin-ltr mono">{settings.defaultAiCostRate.inputPer1kUsdMicros}/{settings.defaultAiCostRate.outputPer1kUsdMicros}</span>)</>}.
        </div>
        {settingsError && !settings ? (
          <EmptyState message={settingsError} />
        ) : !settings ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>نرخ ورودی (میکرو-دلار/1000 توکن)</span>
                <NumberInput className="admin-input admin-ltr" dir="ltr" maxLength={9} value={inputRate} onChange={setInputRate} />
              </label>
              <label className="admin-field">
                <span>نرخ خروجی (میکرو-دلار/1000 توکن)</span>
                <NumberInput className="admin-input admin-ltr" dir="ltr" maxLength={9} value={outputRate} onChange={setOutputRate} />
              </label>
            </div>
            {formError && <div className="admin-form-error" role="alert">{formError}</div>}
            <div className="admin-modal-actions">
              <button type="submit" className="admin-btn primary" disabled={saving || !dirty}>
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </button>
            </div>
          </form>
        )}
      </div>

      <AdminMaintenanceCard />

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">تم آزمایشی (فقط برای خودت)</span></div>
        <TickOption checked={noir} onChange={changeNoir}>تم نوآر سیاه و سفید</TickOption>
        <div className="admin-section-hint admin-settings-hint">فقط روی همین دستگاه ذخیره می‌شود و روی تم تیره اعمال می‌شود.</div>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">سقف AI دوره‌ی آزمایشی</span></div>
        <div className="admin-section-hint admin-settings-hint">
          هر حساب تازه {TRIAL_DAYS} روز به بدنسازی، کالری‌شمار و ژورنال ترید دسترسی دارد؛ این‌ها سقف کل استفاده از هر امکان AI در همان دوره‌اند (0 یعنی بسته).
        </div>
        {settingsError && !settings ? (
          <EmptyState message={settingsError} />
        ) : !settings || !trialDraft ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); saveTrial(); }} noValidate>
            <div className="admin-form-grid">
              {TRIAL_AI_FEATURES.map((f) => (
                <label key={f} className="admin-field">
                  <span>{TRIAL_AI_FEATURE_LABELS_FA[f]} (پیش‌فرض {settings.defaultTrialAiLimits[f]})</span>
                  <NumberInput
                    className="admin-input admin-ltr" dir="ltr" maxLength={4} value={trialDraft[f]}
                    onChange={(v) => setTrialDraft((d) => (d ? { ...d, [f]: v } : d))}
                  />
                </label>
              ))}
            </div>
            {trialError && <div className="admin-form-error" role="alert">{trialError}</div>}
            <div className="admin-modal-actions">
              <button type="submit" className="admin-btn primary" disabled={trialSaving || !trialDirty}>
                {trialSaving ? "در حال ذخیره…" : "ذخیره"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-head"><span className="admin-chart-title">پیام‌های رایگان نومو</span></div>
        <div className="admin-section-hint admin-settings-hint">
          تعداد کل پیام‌هایی که کاربر بدون اشتراک می‌تواند به دستیار «نومو» بدهد؛ مشترک‌ها نامحدودند.
        </div>
        {settingsError && !settings ? (
          <EmptyState message={settingsError} />
        ) : !settings ? (
          <div className="admin-empty is-loading">در حال بارگذاری…</div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); saveNomo(); }} noValidate>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>پیام رایگان (پیش‌فرض {settings.defaultNomoFreeUses})</span>
                <NumberInput className="admin-input admin-ltr" dir="ltr" maxLength={4} value={nomoDraft} onChange={setNomoDraft} />
              </label>
            </div>
            {nomoError && <div className="admin-form-error" role="alert">{nomoError}</div>}
            <div className="admin-modal-actions">
              <button type="submit" className="admin-btn primary" disabled={nomoSaving || !nomoDirty}>
                {nomoSaving ? "در حال ذخیره…" : "ذخیره"}
              </button>
            </div>
          </form>
        )}
      </div>

      {canAudit && (
        <div className="admin-chart-card">
          <div className="admin-chart-head">
            <span className="admin-chart-title">فعالیت اخیر ادمین‌ها</span>
            <Link href="/admin/audit" className="admin-btn sm">همه‌ی فعالیت‌ها</Link>
          </div>
          {auditError && !audit ? (
            <EmptyState message={auditError} />
          ) : !audit ? (
            <div className="admin-empty is-loading">در حال بارگذاری…</div>
          ) : audit.length === 0 ? (
            <EmptyState message="هنوز فعالیتی ثبت نشده" />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>اقدام</th><th>هدف</th><th>توسط</th><th>زمان</th></tr></thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id}>
                      <td className="mono admin-ltr">{a.action}</td>
                      <td>{a.targetType ? <span className="admin-ltr">{a.targetType}{a.targetId ? ` #${a.targetId.slice(0, 8)}` : ""}</span> : "—"}</td>
                      <td>{a.actor ? [a.actor.name, a.actor.lastName].filter(Boolean).join(" ") || (a.actor.username ? `@${a.actor.username}` : "—") : "—"}</td>
                      <td className="admin-ltr">{formatDateTime(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
