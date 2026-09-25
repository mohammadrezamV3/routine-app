// نگه‌داریِ نشستِ موبایل.
//   • refreshToken + user → ذخیره‌ی پایدار (KV: Preferences) تا بعد از بستنِ اپ بمونه.
//   • accessToken → فقط در حافظه (۱۵ دقیقه عمر داره؛ بعد از باز شدنِ دوباره‌ی
//     اپ با refresh گرفته می‌شه). هیچ‌وقت ذخیره/لاگ نمی‌شه.
//
// refreshToken یک‌بارمصرفه و با هر refresh عوض می‌شه؛ استفاده‌ی دوباره از
// نسخه‌ی قبلی کلِ نشست رو سمتِ سرور باطل می‌کنه — پس setSession بلافاصله بعد
// از هر پاسخِ موفق صدا زده می‌شه (apiClient این رو تضمین می‌کنه).
import type { MobileAuthSuccess, MobileUser } from "@/lib/api-contract";
import { getJson, KV, setJson } from "./kv";

const K_REFRESH = "arion.sync.refreshToken";
const K_REFRESH_EXP = "arion.sync.refreshTokenExpiresAt";
const K_USER = "arion.sync.user";

export class TokenStore {
  private accessToken: string | null = null;
  private accessExpiresAt = 0;
  private refreshToken: string | null = null;
  private user: MobileUser | null = null;
  private loaded = false;

  constructor(private kv: KV) {}

  /** یک‌بار در شروعِ اپ — refreshToken و کاربر رو از ذخیره‌ی پایدار می‌خونه */
  async load(): Promise<void> {
    if (this.loaded) return;
    const [rt, user] = await Promise.all([this.kv.get(K_REFRESH), getJson<MobileUser | null>(this.kv, K_USER, null)]);
    this.refreshToken = rt;
    this.user = rt ? user : null;
    this.loaded = true;
  }

  async setSession(s: MobileAuthSuccess, now = Date.now()): Promise<void> {
    this.accessToken = s.accessToken;
    this.accessExpiresAt = now + Math.max(0, s.accessTokenExpiresIn) * 1000;
    this.refreshToken = s.refreshToken;
    this.user = s.user;
    this.loaded = true;
    await Promise.all([
      this.kv.set(K_REFRESH, s.refreshToken),
      this.kv.set(K_REFRESH_EXP, s.refreshTokenExpiresAt),
      setJson(this.kv, K_USER, s.user),
    ]);
  }

  async clear(): Promise<void> {
    this.accessToken = null;
    this.accessExpiresAt = 0;
    this.refreshToken = null;
    this.user = null;
    await Promise.all([this.kv.remove(K_REFRESH), this.kv.remove(K_REFRESH_EXP), this.kv.remove(K_USER)]);
  }

  /** accessTokenِ فعلی، یا null اگه نیست/تا skewMs دیگه منقضی می‌شه */
  getAccessToken(skewMs = 0, now = Date.now()): string | null {
    if (!this.accessToken || now + skewMs >= this.accessExpiresAt) return null;
    return this.accessToken;
  }

  /** accessToken رو دور می‌ریزه (مثلا بعد از 401) تا دفعه‌ی بعد refresh بشه */
  invalidateAccessToken(token?: string): void {
    if (token === undefined || token === this.accessToken) {
      this.accessToken = null;
      this.accessExpiresAt = 0;
    }
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getUser(): MobileUser | null {
    return this.user;
  }

  isLoggedIn(): boolean {
    return this.refreshToken !== null;
  }
}
