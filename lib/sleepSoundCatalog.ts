import { tr } from "@/lib/i18n";

// فهرست خالص صداهای خواب: دسته‌ها، حداکثر لایه‌ها و منطق ترکیب (بدون WebAudio، تست‌دار).

export type SleepSoundCategory = "noise" | "nature" | "home" | "ambient";

export const SLEEP_SOUND_CATALOG = {
  white: "noise", pink: "noise", brown: "noise",
  rain: "nature", rainHeavy: "nature", rainRoof: "nature", storm: "nature", ocean: "nature",
  stream: "nature", wind: "nature", forest: "nature", fire: "nature",
  fan: "home", ac: "home", cabin: "home", train: "home", city: "home", cafe: "home",
  heartbeat: "ambient", bowl: "ambient", drone: "ambient", chimes: "ambient",
} as const satisfies Record<string, SleepSoundCategory>;

export type SleepSoundKind = keyof typeof SLEEP_SOUND_CATALOG;
export const SLEEP_SOUND_KINDS = Object.keys(SLEEP_SOUND_CATALOG) as SleepSoundKind[];
export const SLEEP_SOUND_CATEGORIES: readonly SleepSoundCategory[] = ["noise", "nature", "home", "ambient"];
export const MAX_SOUND_LAYERS = 3;
export const DEFAULT_LAYER_VOLUME = 0.8;

export type SleepSoundLayer = { kind: SleepSoundKind; volume: number };

export const isSleepSoundKind = (v: unknown): v is SleepSoundKind =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(SLEEP_SOUND_CATALOG, v);

export const soundsOfCategory = (c: SleepSoundCategory): SleepSoundKind[] =>
  SLEEP_SOUND_KINDS.filter((k) => SLEEP_SOUND_CATALOG[k] === c);

export const clampUnit = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
};

/** لایه‌های معتبر: بدون تکرار، حداکثر MAX_SOUND_LAYERS، حداقل یکی */
export function normalizeLayers(raw: unknown, fallback: SleepSoundLayer[]): SleepSoundLayer[] {
  if (!Array.isArray(raw)) return fallback.map((l) => ({ ...l }));
  const out: SleepSoundLayer[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (!isSleepSoundKind(o.kind) || out.some((l) => l.kind === o.kind)) continue;
    out.push({ kind: o.kind, volume: clampUnit(o.volume, DEFAULT_LAYER_VOLUME) });
    if (out.length >= MAX_SOUND_LAYERS) break;
  }
  return out.length ? out : fallback.map((l) => ({ ...l }));
}

/** افزودن یا برداشتن یک صدا؛ اگه پر باشه قدیمی‌ترین می‌افته. آخرین لایه برداشته نمی‌شه. */
export function toggleLayer(layers: SleepSoundLayer[], kind: SleepSoundKind, max = MAX_SOUND_LAYERS): SleepSoundLayer[] {
  if (layers.some((l) => l.kind === kind)) {
    return layers.length > 1 ? layers.filter((l) => l.kind !== kind) : layers;
  }
  const next = [...layers, { kind, volume: DEFAULT_LAYER_VOLUME }];
  return next.length > max ? next.slice(next.length - max) : next;
}

export const setLayerVolume = (layers: SleepSoundLayer[], kind: SleepSoundKind, v: number): SleepSoundLayer[] =>
  layers.map((l) => (l.kind === kind ? { ...l, volume: clampUnit(v, l.volume) } : l));

// ───── برچسب‌ها (فقط داخل تابع، برای زبان) ─────
export const soundCategoryName = (c: SleepSoundCategory): string => ({
  noise: tr("نویز", "Noise"),
  nature: tr("طبیعت", "Nature"),
  home: tr("خانه", "Home"),
  ambient: tr("آرام", "Ambient"),
})[c];

export const soundName = (k: SleepSoundKind): string => ({
  white: tr("نویز سفید", "White noise"),
  pink: tr("نویز صورتی", "Pink noise"),
  brown: tr("نویز قهوه‌ای", "Brown noise"),
  rain: tr("باران", "Rain"),
  rainHeavy: tr("باران شدید", "Heavy rain"),
  rainRoof: tr("باران روی سقف", "Rain on roof"),
  storm: tr("رعد و برق", "Thunderstorm"),
  ocean: tr("اقیانوس", "Ocean"),
  stream: tr("رودخانه", "Stream"),
  wind: tr("باد", "Wind"),
  forest: tr("جنگل شب", "Night forest"),
  fire: tr("آتش", "Campfire"),
  fan: tr("پنکه", "Fan"),
  ac: tr("کولر", "Air conditioner"),
  cabin: tr("کابین هواپیما", "Airplane cabin"),
  train: tr("قطار", "Train"),
  city: tr("شهر دور", "Distant city"),
  cafe: tr("کافه", "Cafe"),
  heartbeat: tr("ضربان قلب", "Heartbeat"),
  bowl: tr("کاسه‌ی آوازخوان", "Singing bowl"),
  drone: tr("زمزمه‌ی آرام", "Soft drone"),
  chimes: tr("زنگوله‌ی باد", "Wind chimes"),
})[k];

export const soundSummary = (layers: SleepSoundLayer[]): string => layers.map((l) => soundName(l.kind)).join(" + ");
