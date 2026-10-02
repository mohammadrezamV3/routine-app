import { describe, it, expect } from "vitest";
import { toAccountUser } from "@/lib/accountPayload";

// هر سه مسیر (/api/account، /api/bootstrap، InlineBootstrap) از همین تبدیل
// استفاده می‌کنن؛ firstName نبودنش همون باگ «اسمم بعد از برگشتن پاک می‌شه» بود.
describe("toAccountUser", () => {
  const base = {
    email: null, username: "u", phone: null, name: "مریم", lastName: "تست", bio: "بیو", birthDate: null,
    gender: "female", heightCm: 170, weightKg: 60, discoverable: true, sharePhone: false, twoFactorEnabled: false,
    phoneVerifiedAt: null, market: "IRAN", createdAt: new Date(), isSuperAdmin: false, avatarUrl: "data:x",
    goldenSince: null, adminPermissions: [], referralCode: null, moduleAccess: [], subscriptions: [],
  } as any;

  it("نام کوچک، نام کامل و فیلدهای پروفایل رو می‌فرسته و avatarUrl رو نه", () => {
    const u = toAccountUser(base) as any;
    expect(u.firstName).toBe("مریم");
    expect(u.name).toBe("مریم تست");
    expect(u.lastName).toBe("تست");
    expect(u.bio).toBe("بیو");
    expect(u.gender).toBe("female");
    expect(u.heightCm).toBe(170);
    expect("avatarUrl" in u).toBe(false);
    expect("adminPermissions" in u).toBe(false);
    expect(u.staff).toBe(false);
  });

  it("سوپریوزر همه‌ی ماژول‌ها رو فعال می‌گیره", () => {
    const u = toAccountUser({ ...base, isSuperAdmin: true }) as any;
    expect(u.moduleAccess.length).toBeGreaterThan(3);
    expect(u.moduleAccess.every((m: any) => m.active)).toBe(true);
    expect(u.staff).toBe(true);
  });
});
