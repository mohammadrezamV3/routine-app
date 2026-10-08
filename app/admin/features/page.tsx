"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FEATURE_GROUPS, FEATURE_KEYS, FEATURE_META, FEATURE_MODE_LABELS, FeatureFlags, FeatureKey, FeatureMode } from "@/lib/featureFlags";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { invalidateFeatures } from "@/lib/useFeatures";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { faNum } from "@/lib/jalali";

const MODES: FeatureMode[] = ["on", "admins", "off"];
const MODE_OPTIONS = MODES.map((m) => ({ value: m, label: FEATURE_MODE_LABELS[m] }));

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
      toast(`«${FEATURE_META[key].label}»: ${FEATURE_MODE_LABELS[d.flags[key]]}`);
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
    const shown = !q || norm(g.label).includes(q)
      ? keys
      : keys.filter((k) => norm(`${FEATURE_META[k].label} ${FEATURE_META[k].hint} ${k}`).includes(q));
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
      ? `تا وقتی «${FEATURE_META[p].label}» خاموشه، این بخش هم برای همه خاموشه`
      : `تا وقتی «${FEATURE_META[p].label}» فقط برای ادمین‌هاست، این بخش هم همین‌طوره`;
  }

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">قابلیت‌ها</div>
          <div className="admin-section-hint admin-page-sub">
            هر بخش رو برای همه روشن کن، فقط برای ادمین‌ها نگه دار (برای تست)، یا کامل خاموشش کن. Owner همیشه همه‌چیز رو می‌بینه.
            بخش‌های پولی همچنان به اشتراک همون ماژول نیاز دارن. تغییرات حداکثر تا یک دقیقه همه‌جا اعمال می‌شن.
          </div>
        </div>
      </div>

      {!flags ? (
        failed ? (
          <div className="admin-empty">
            <span>خطا در دریافت اطلاعات</span>
            <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
          </div>
        ) : <div className="admin-empty is-loading">در حال بارگذاری…</div>
      ) : (
        <>
          <div className="admin-feature-toolbar">
            <input
              className="admin-input admin-feature-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجوی بخش…"
              aria-label="جست‌وجوی بخش"
            />
            <div className="admin-feature-counts" aria-live="polite">
              <span><b>{faNum(counts.on)}</b> روشن</span>
              <span><b>{faNum(counts.admins)}</b> فقط ادمین‌ها</span>
              <span className={counts.off ? "is-off" : undefined}><b>{faNum(counts.off)}</b> خاموش</span>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="admin-empty">بخشی با این عنوان پیدا نشد</div>
          ) : (
            <div className="admin-feature-grid">
              {groups.map((g) => (
                <div key={g.key} className="admin-chart-card admin-feature-card">
                  <div className="admin-perm-group">
                    <div className="admin-perm-group-title">{g.label}</div>
                    {g.keys.map((k) => {
                      const note = parentNote(k);
                      return (
                        <div key={k} className={`admin-perm-row admin-feature-row${FEATURE_META[k].parent ? " is-child" : ""}`}>
                          <div className="admin-feature-text">
                            <div className="admin-perm-label">{FEATURE_META[k].label}</div>
                            <div className="admin-perm-hint">{FEATURE_META[k].hint}</div>
                            {note && <div className="admin-perm-hint admin-feature-note">{note}</div>}
                          </div>
                          <SegmentedTabs
                            className="admin-seg admin-feature-modes"
                            ariaLabel={FEATURE_META[k].label}
                            options={MODE_OPTIONS}
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
