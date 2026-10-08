"use client";

import { useEffect, useState } from "react";
import { FeatureKey } from "@/lib/featureFlags";

// وضعیت قابلیت‌ها برای کاربر فعلی — یک fetch مشترک برای همه‌ی کامپوننت‌ها
// (کش در سطح ماژول با TTL کوتاه). تا وقتی جواب نیومده null برمی‌گرده تا
// چیزی که ممکنه خاموش باشه چشمک نزنه.
type Map = Record<FeatureKey, boolean>;
let cached: { at: number; value: Map } | null = null;
let inflight: Promise<Map | null> | null = null;
const TTL = 60_000;

function load(): Promise<Map | null> {
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.value);
  if (!inflight) {
    inflight = fetch("/api/features")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.features) cached = { at: Date.now(), value: d.features }; return d?.features ?? null; })
      .catch(() => null)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function invalidateFeatures() { cached = null; }

// هوک‌های mountشده (منو، داشبورد) باید نتیجه‌ی تازه‌سازی رو ببینن — وگرنه بعد از
// ورود کلاینتی (بدون ریلود) منو همون فلگ‌های حالت مهمان رو نگه می‌داشت.
const listeners = new Set<(m: Map) => void>();

/** کش رو دور می‌ریزه، دوباره می‌گیره و به همه‌ی هوک‌های باز خبر می‌ده (بعد از ورود) */
export function refreshFeatures(): Promise<Map | null> {
  cached = null;
  inflight = null;
  return load().then((m) => {
    if (m) listeners.forEach((fn) => fn(m));
    return m;
  });
}

// فقط اولین رندر بعد از لود کامل باید null باشه تا هیدریشن با SSR جور بمونه؛
// بعد از اون، mountهای تازه (ناوبری کلاینتی) همون کش رو بی‌چشمک می‌گیرن.
let hydrated = false;

export function useFeatures(): Map | null {
  const [v, setV] = useState<Map | null>(() => (hydrated ? cached?.value ?? null : null));
  useEffect(() => {
    hydrated = true;
    let alive = true;
    load().then((m) => { if (alive && m) setV(m); });
    const on = (m: Map) => { if (alive) setV(m); };
    listeners.add(on);
    return () => { alive = false; listeners.delete(on); };
  }, []);
  return v;
}

export function useFeature(key: FeatureKey): boolean | null {
  const m = useFeatures();
  return m ? !!m[key] : null;
}
