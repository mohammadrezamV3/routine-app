// سرویس‌های سینک/HTTP که localApi استفاده می‌کنه — پیش‌فرض همون singletonِ
// SyncProvider (یک ApiClient ← یک refreshِ single-flight برای کلِ اپ)؛ تست‌ها
// با configureLocalApi نسخه‌ی خودشون رو تزریق می‌کنن.
import type { ApiClient } from "@m/sync/apiClient";
import type { SyncEngine } from "@m/sync/syncEngine";
import type { TokenStore } from "@m/sync/tokenStore";
import { getSyncServices } from "@m/sync/SyncProvider";
import { SYNC_ENABLED } from "@m/sync/config";

export type LocalApiServices = { tokens: TokenStore; api: ApiClient; engine: SyncEngine; syncEnabled: boolean };

let override: LocalApiServices | null = null;

export function configureLocalApi(s: LocalApiServices | null): void {
  override = s;
}

export function services(): LocalApiServices {
  if (override) return override;
  return { ...getSyncServices(), syncEnabled: SYNC_ENABLED };
}
