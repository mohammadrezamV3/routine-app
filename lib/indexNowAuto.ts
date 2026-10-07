import { createHash } from "crypto";
import { getAppSetting, setAppSetting } from "./appSettings";
import { submitUrlsToIndexNow } from "./indexNow";
import { SITE_URL } from "./seo";

const STATE_KEY = "indexnow_auto";
// کمی بعد از بالا آمدن سرور: هم دیتابیس گرم شده، هم فایل کلید قابل‌خواندنه
const DELAY_MS = 90_000;

type State = { hash: string; at: string };

/**
 * ارسال خودکار sitemap به IndexNow بعد از هر دیپلوی — فقط وقتی فهرست
 * URLها یا lastModifiedشون نسبت به آخرین ارسال عوض شده باشه (هش در
 * AppSetting). یعنی مقاله یا ابزار تازه بدون دکمه‌ی پنل ادمین هم به
 * Bing/Yandex اعلام می‌شه. چند worker ممکنه هم‌زمان بفرستن؛ ارسال تکراری
 * بی‌ضرره. روی dev یا دامنه‌ی محلی کاری نمی‌کنه.
 */
export function scheduleIndexNowAutoSubmit() {
  if (process.env.NODE_ENV !== "production") return;
  if (/localhost|127\.0\.0\.1|example\.com/.test(SITE_URL)) return;
  const timer = setTimeout(() => {
    runIndexNowAutoSubmit().catch((err) => console.error(`[indexnow] auto submit failed: ${err?.message || err}`));
  }, DELAY_MS);
  timer.unref?.();
}

async function runIndexNowAutoSubmit() {
  const { default: sitemap } = await import("@/app/sitemap");
  const entries = sitemap();
  const hash = createHash("sha256")
    .update(entries.map((e) => `${e.url}|${e.lastModified ? new Date(e.lastModified).toISOString() : ""}`).join("\n"))
    .digest("hex");
  const prev = await getAppSetting<State | null>(STATE_KEY, null);
  if (prev?.hash === hash) return;
  const result = await submitUrlsToIndexNow(entries.map((e) => e.url));
  if (!result.ok) {
    console.error(`[indexnow] auto submit rejected: ${result.status} ${result.error || ""}`);
    return;
  }
  await setAppSetting(STATE_KEY, { hash, at: new Date().toISOString() } satisfies State);
  console.log(`[indexnow] submitted ${result.submitted} urls`);
}
