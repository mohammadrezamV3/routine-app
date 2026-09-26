// گاردهای محلی — همون دو دروازه‌ای که روت‌های وب دارن، ولی بدونِ شبکه:
//   • بدونِ نشست (هیچ refreshTokenی ذخیره نیست) ← 401 {error:"unauthorized"}
//   • ماژولِ پولیِ قفل (طبقِ /api/account ِ کش‌شده؛ اگه هنوز نیومده، طبقِ
//     ماژول‌های MobileUser ِ آخرین ورود/‌me) ← 403 {error:"این بخش نیاز به اشتراک فعال دارد"}
// سرور همچنان منبعِ حقیقته: push ِ ماژولِ قفل module_locked می‌گیره.
import type { GatedModule } from "@m/sync/SyncProvider";
import { activeModulesCached } from "./accountState";
import { moduleLocked, unauthorized } from "./respond";
import { services } from "./services";

export function guardSession(): Response | null {
  return services().tokens.isLoggedIn() ? null : unauthorized();
}

/** ماژول‌های فعالِ کاربرِ فعلی، یا null اگه هیچ منبعی نداریم */
export function activeModules(): Set<string> | null {
  const user = services().tokens.getUser();
  const fromAccount = activeModulesCached(user?.id);
  if (fromAccount) return fromAccount;
  if (!user) return null;
  // MobileUser.modules = فعال و منقضی‌نشده (lib/mobileAuth سمتِ سرور)
  const mods = new Set<string>(user.modules ?? []);
  return mods.size ? mods : null;
}

export function guardModule(module: GatedModule | undefined): Response | null {
  if (!module) return null;
  const mods = activeModules();
  if (mods && !mods.has(module)) return moduleLocked();
  return null;
}
