import { describe, expect, it } from "vitest";
import { isStaffUser, nameFlags, resolveNameStyle } from "@/lib/nameStyle";

describe("resolveNameStyle", () => {
  it("staff beats golden", () => {
    expect(resolveNameStyle({ golden: true, staff: true })).toBe("toxic");
    expect(resolveNameStyle({ golden: false, staff: true })).toBe("toxic");
  });
  it("golden when all achievements and not staff", () => {
    expect(resolveNameStyle({ golden: true, staff: false })).toBe("golden");
    expect(resolveNameStyle({ golden: true })).toBe("golden");
  });
  it("null otherwise", () => {
    expect(resolveNameStyle({ golden: false, staff: false })).toBeNull();
    expect(resolveNameStyle({})).toBeNull();
    expect(resolveNameStyle({ golden: null, staff: null })).toBeNull();
  });
});

describe("isStaffUser / nameFlags", () => {
  it("Owner is staff", () => {
    expect(isStaffUser({ isSuperAdmin: true, adminPermissions: [] })).toBe(true);
  });
  it("admin with a valid permission is staff", () => {
    expect(isStaffUser({ isSuperAdmin: false, adminPermissions: ["users.view"] })).toBe(true);
  });
  it("empty or unknown permissions are not staff (same rule as requireAdmin)", () => {
    expect(isStaffUser({ isSuperAdmin: false, adminPermissions: [] })).toBe(false);
    expect(isStaffUser({ isSuperAdmin: false, adminPermissions: ["not-a-permission"] })).toBe(false);
    expect(isStaffUser(null)).toBe(false);
  });
  it("nameFlags exposes only two booleans", () => {
    const f = nameFlags({ goldenSince: new Date(), isSuperAdmin: false, adminPermissions: ["users.view"] });
    expect(f).toEqual({ golden: true, staff: true });
    expect(Object.keys(f).sort()).toEqual(["golden", "staff"]);
    expect(nameFlags({ goldenSince: null })).toEqual({ golden: false, staff: false });
  });
});
