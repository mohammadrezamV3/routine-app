"use client";

import { useCallback, useEffect, useState } from "react";
import { FEATURE_KEYS, FEATURE_META, FEATURE_MODE_LABELS, FeatureFlags, FeatureKey, FeatureMode } from "@/lib/featureFlags";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { invalidateFeatures } from "@/lib/useFeatures";
import { SegmentedTabs } from "@/components/SegmentedTabs";

const MODES: FeatureMode[] = ["on", "admins", "off"];
const MODE_OPTIONS = MODES.map((m) => ({ value: m, label: FEATURE_MODE_LABELS[m] }));

// روشن/خاموش‌کردنِ قابلیت‌های اپ بدونِ دیپلوی. هر تغییر فورا ذخیره می‌شه
// (کشِ سمت سرور حداکثر ۶۰ ثانیه) و در لاگِ فعالیت ثبت می‌شه.
export default function AdminFeaturesPage() {
  const toast = useAdminToast();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [failed, setFailed] = useState(false);
  // چند قابلیت می‌تونن هم‌زمان در حال ذخیره باشن — قبلا فقط یک کلید نگه
  // داشته می‌شد و پاسخِ اولی مقدارِ خوش‌بینانه‌ی دومی رو برمی‌گردوند
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
    // فقط همین کلید عوض می‌شه (نه کلِ آبجکت) تا با ذخیره‌ی هم‌زمانِ کلیدهای دیگه تداخل نکنه
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

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">قابلیت‌ها</div>
          <div className="admin-section-hint admin-page-sub">
            هر بخش رو برای همه روشن کن، فقط برای ادمین‌ها نگه دار (برای تست)، یا کامل خاموشش کن. Owner همیشه همه‌چیز رو می‌بینه.
            بخش‌های پولی همچنان به اشتراکِ همون ماژول نیاز دارن. تغییرات حداکثر تا یک دقیقه همه‌جا اعمال می‌شن.
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
        <div className="admin-chart-card">
          <div className="admin-perm-group">
            {FEATURE_KEYS.map((k) => (
              <div key={k} className="admin-perm-row admin-feature-row">
                <div>
                  <div className="admin-perm-label">{FEATURE_META[k].label}</div>
                  <div className="admin-perm-hint">{FEATURE_META[k].hint}</div>
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
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
