"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FEATURE_GROUPS, FEATURE_KEYS, FEATURE_META, FeatureFlags, FeatureKey, FeatureMode, featureGroupLabel, featureHint, featureLabel, featureModeLabel } from "@/lib/featureFlags";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { invalidateFeatures } from "@/lib/useFeatures";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { faNum } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

const MODES: FeatureMode[] = ["on", "admins", "off"];
// تابع، نه ثابت سطح ماژول: برچسب‌ها موقع رندر به زبان جاری وابسته‌ان.
const modeOptions = () => MODES.map((m) => ({ value: m, label: featureModeLabel(m) }));

// یکسان‌سازی ساده برای جست‌وجو (ی/ك عربی، نیم‌فاصله، حروف بزرگ)
function norm(s: string) {
  return s.toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").replace(/\s+/g, " ").trim();
}

// روشن/خاموش‌کردن قابلیت‌های اپ بدون دیپلوی. هر تغییر فورا ذخیره می‌شه
// (کش سمت سرور حداکثر ۶۰ ثانیه) و در لاگ فعالیت ثبت می‌شه. بخش‌ها بر اساس
// حوزه (FEATURE_GROUPS) دسته‌بندی شدن؛ زیربخش‌ها (مثلا تقویم اقتصادی زیر ترید)
// با خاموش‌شدن بخش مادر خودشون هم خاموش حساب می‌شن.
export default function AdminFeaturesPage() {
  const toast = useAdminToast();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  // چند قابلیت می‌تونن هم‌زمان در حال ذخیره باشن — قبلا فقط یک کلید نگه
  // داشته می‌شد و پاسخ اولی مقدار خوش‌بینانه‌ی دومی رو برمی‌گردوند
  const [saving, setSaving] = useState<Set<FeatureKey>>(new Set());

  const load = useCallback(() => {
    setFailed(false);
    adminFetch<{ flags: FeatureFlags }>("/api/admin/features")
      .then((d) => setFlags(d.flags))
      .catch((e) => { setFailed(true); toast(e.message, "err"); });
  }, [toast]);
  useEffect(load, [load]);

  async function change(key: FeatureKey, mode: FeatureMode) {
    if (!flags || flags[key] === mode || saving.has(key)) return;
    const prevMode = flags[key];
    // فقط همین کلید عوض می‌شه (نه کل آبجکت) تا با ذخیره‌ی هم‌زمان کلیدهای دیگه تداخل نکنه
    setFlags((f) => (f ? { ...f, [key]: mode } : f));
    setSaving((s) => new Set(s).add(key));
    try {
      const d = await adminFetch<{ flags: FeatureFlags }>("/api/admin/features", { method: "PUT", json: { flags: { [key]: mode } } });
      setFlags((f) => (f ? { ...f, [key]: d.flags[key] } : d.flags));
      invalidateFeatures();
      const l = featureLabel(key);
      const m = featureModeLabel(d.flags[key]);
      toast(tr(`«${l}»: ${m}`, `"${l}": ${m}`));
    } catch (e: any) {
      setFlags((f) => (f ? { ...f, [key]: prevMode } : f));
      toast(e.message, "err");
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  }

  const q = norm(query);
  const groups = useMemo(() => FEATURE_GROUPS.map((g) => {
    const keys = FEATURE_KEYS.filter((k) => FEATURE_META[k].group === g.key);
    const shown = !q || norm(featureGroupLabel(g.key)).includes(q)
      ? keys
      : keys.filter((k) => norm(`${featureLabel(k)} ${featureHint(k)} ${k}`).includes(q));
    return { ...g, keys: shown };
  }).filter((g) => g.keys.length), [q]);

  const counts = useMemo(() => {
    const c: Record<FeatureMode, number> = { on: 0, admins: 0, off: 0 };
    if (flags) for (const k of FEATURE_KEYS) c[flags[k]]++;
    return c;
  }, [flags]);

  // مادری که «روشن برای همه» نیست → روی زیربخش یادآوری کوتاه
  function parentNote(k: FeatureKey): string | null {
    const p = FEATURE_META[k].parent;
    if (!p || !flags || flags[p] === "on") return null;
    return flags[p] === "off"
      ? tr(`تا وقتی «${featureLabel(p)}» خاموشه، این بخش هم برای همه خاموشه`, `While "${featureLabel(p)}" is off, this section is off for everyone too`)
      : tr(`تا وقتی «${featureLabel(p)}» فقط برای ادمین‌هاست، این بخش هم همین‌طوره`, `While "${featureLabel(p)}" is for admins only, this section is too`);
  }

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("قابلیت‌ها", "Features")}</div>
          <div className="admin-section-hint admin-page-sub">
            {tr(
              "هر بخش رو برای همه روشن کن، فقط برای ادمین‌ها نگه دار (برای تست)، یا کامل خاموشش کن. Owner همیشه همه‌چیز رو می‌بینه. بخش‌های پولی همچنان به اشتراک همون ماژول نیاز دارن. تغییرات حداکثر تا یک دقیقه همه‌جا اعمال می‌شن.",
              "Turn each section on for everyone, keep it for admins only (for testing), or switch it off completely. Owner always sees everything. Paid sections still need a subscription to the same module. Changes apply everywhere within a minute.",
            )}
          </div>
        </div>
      </div>

      {!flags ? (
        failed ? (
          <div className="admin-empty">
            <span>{tr("خطا در دریافت اطلاعات", "Couldn't load the data")}</span>
            <button type="button" className="admin-btn sm" onClick={load}>{tr("تلاش دوباره", "Try again")}</button>
          </div>
        ) : <div className="admin-empty is-loading">{tr("در حال بارگذاری…", "Loading…")}</div>
      ) : (
        <>
          <div className="admin-feature-toolbar">
            <input
              className="admin-input admin-feature-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr("جست‌وجوی بخش…", "Search sections…")}
              aria-label={tr("جست‌وجوی بخش", "Search sections")}
            />
            <div className="admin-feature-counts" aria-live="polite">
              <span><b>{faNum(counts.on)}</b> {tr("روشن", "on")}</span>
              <span><b>{faNum(counts.admins)}</b> {tr("فقط ادمین‌ها", "admins only")}</span>
              <span className={counts.off ? "is-off" : undefined}><b>{faNum(counts.off)}</b> {tr("خاموش", "off")}</span>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="admin-empty">{tr("بخشی با این عنوان پیدا نشد", "No section matches this search")}</div>
          ) : (
            <div className="admin-feature-grid">
              {groups.map((g) => (
                <div key={g.key} className="admin-chart-card admin-feature-card">
                  <div className="admin-perm-group">
                    <div className="admin-perm-group-title">{featureGroupLabel(g.key)}</div>
                    {g.keys.map((k) => {
                      const note = parentNote(k);
                      return (
                        <div key={k} className={`admin-perm-row admin-feature-row${FEATURE_META[k].parent ? " is-child" : ""}`}>
                          <div className="admin-feature-text">
                            <div className="admin-perm-label">{featureLabel(k)}</div>
                            <div className="admin-perm-hint">{featureHint(k)}</div>
                            {note && <div className="admin-perm-hint admin-feature-note">{note}</div>}
                          </div>
                          <SegmentedTabs
                            className="admin-seg admin-feature-modes"
                            ariaLabel={featureLabel(k)}
                            options={modeOptions()}
                            active={flags[k]}
                            disabled={saving.has(k)}
                            onChange={(m) => change(k, m)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
