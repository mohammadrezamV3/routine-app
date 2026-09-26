"use client";

import { useEffect, useState } from "react";
import { FeatureKey } from "@/lib/featureFlags";

// وضعیتِ قابلیت‌ها برای کاربرِ فعلی — یک fetch مشترک برای همه‌ی کامپوننت‌ها
// (کش در سطحِ ماژول با TTL کوتاه). تا وقتی جواب نیومده null برمی‌گرده تا
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

export function useFeatures(): Map | null {
  const [v, setV] = useState<Map | null>(cached?.value ?? null);
  useEffect(() => { let alive = true; load().then((m) => { if (alive && m) setV(m); }); return () => { alive = false; }; }, []);
  return v;
}

export function useFeature(key: FeatureKey): boolean | null {
  const m = useFeatures();
  return m ? !!m[key] : null;
}
