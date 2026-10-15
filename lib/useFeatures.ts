"use client";

import { useEffect, useSyncExternalStore } from "react";
import { FeatureKey } from "@/lib/featureFlags";
import { takeInlineFeatures } from "@/lib/inlineMeta";

// وضعیت قابلیت‌ها برای کاربر فعلی — یک fetch مشترک برای همه‌ی کامپوننت‌ها
// (کش در سطح ماژول با TTL کوتاه). تا وقتی جواب نیومده null برمی‌گرده تا
// چیزی که ممکنه خاموش باشه چشمک نزنه.
type Map = Record<FeatureKey, boolean>;
let cached: { at: number; value: Map } | null = null;
let inflight: Promise<Map | null> | null = null;
const TTL = 60_000;

function load(): Promise<Map | null> {
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.value);
  // اولین بار: همون مقداری که سرور داخل HTML گذاشته (بدون درخواست)
  const inline = takeInlineFeatures();
  if (inline) { cached = { at: Date.now(), value: inline }; return Promise.resolve(inline); }
  if (!inflight) {
    inflight = fetch("/api/features")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.features) cached = { at: Date.now(), value: d.features }; return d?.features ?? null; })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function invalidateFeatures() { cached = null; takeInlineFeatures(); }

// آخرین مقداری که به هوک‌ها نشون داده شده. با useSyncExternalStore خونده می‌شه:
// موقع هیدریشن React از getServerSnapshot (null، همون چیزی که سرور رندر کرده) استفاده می‌کنه
// و بعدش خودش با مقدار واقعی دوباره رندر می‌کنه؛ mountهای کلاینتی (ناوبری) همون لحظه مقدار
// کش‌شده رو می‌گیرن. قبلا یه پرچم سراسری «hydrated» بود که با اولین effect روشن می‌شد و
// مرزهای Suspense که دیرتر هیدریت می‌شدن (مثل /weekly و /sleep) خروجی متفاوت از سرور
// می‌دادن (خطاهای #418/#422 و دور ریختن HTML سرور).
let shown: Map | null = null;
const subs = new Set<() => void>();

function publish(m: Map) {
  if (shown === m) return;
  shown = m;
  subs.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}

const getSnapshot = () => shown;
const getServerSnapshot = (): Map | null => null;

/** کش رو دور می‌ریزه، دوباره می‌گیره و به همه‌ی هوک‌های باز خبر می‌ده (بعد از ورود) */
export function refreshFeatures(): Promise<Map | null> {
  cached = null;
  takeInlineFeatures(); // مقدار داخل HTML مال قبل از ورود/خروجه
  inflight = null;
  return load().then((m) => {
    if (m) publish(m);
    return m;
  });
}

export function useFeatures(): Map | null {
  const v = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    let alive = true;
    load().then((m) => { if (alive && m) publish(m); });
    return () => { alive = false; };
  }, []);
  return v;
}

export function useFeature(key: FeatureKey): boolean | null {
  const m = useFeatures();
  return m ? !!m[key] : null;
}
