import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TEAM_MAX_MEMBERS, TEAM_ROLES_MAX, TEAM_ROLE_MAX, normalizeTeamLink, normalizeTeamRoles, sanitizeTeamMembers, validateTeamMembers,
} from "@/lib/teamMembers";

const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

describe("validateTeamMembers", () => {
  it("keeps order, assigns ids and normalizes links", () => {
    const r = validateTeamMembers([
      { name: " Ali ", roles: ["CTO"], links: { telegram: "@ali", website: "example.com" } },
      { name: "Sara", photo: PIXEL },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.members.map((m) => m.name)).toEqual(["Ali", "Sara"]);
    expect(r.members[0].links.telegram).toBe("https://t.me/ali");
    expect(r.members[0].links.website).toBe("https://example.com/");
    expect(r.members[0].id).not.toBe(r.members[1].id);
    expect(r.members[1].photo).toBe(PIXEL);
  });
  it("rejects bad input", () => {
    expect(validateTeamMembers("x").ok).toBe(false);
    expect(validateTeamMembers([{ name: "" }]).ok).toBe(false);
    expect(validateTeamMembers([{ name: "a".repeat(61) }]).ok).toBe(false);
    expect(validateTeamMembers([{ name: "a", photo: "http://x/y.png" }]).ok).toBe(false);
    expect(validateTeamMembers([{ name: "a", photo: "data:image/svg+xml;base64,AAAA" }]).ok).toBe(false);
    expect(validateTeamMembers([{ name: "a", photo: "data:image/png;base64," + "A".repeat(130_000) }]).ok).toBe(false);
    expect(validateTeamMembers([{ name: "a", links: { website: "javascript:alert(1)" } }]).ok).toBe(false);
    expect(validateTeamMembers(Array.from({ length: TEAM_MAX_MEMBERS + 1 }, () => ({ name: "a" }))).ok).toBe(false);
  });
  it("normalizeTeamLink handles handles and urls", () => {
    expect(normalizeTeamLink("instagram", "arion_app")).toBe("https://instagram.com/arion_app");
    expect(normalizeTeamLink("linkedin", "ftp://x.com")).toBeNull();
  });
  it("sanitize drops broken rows", () => {
    expect(sanitizeTeamMembers([{ name: "ok" }, { name: "" }, 5]).length).toBe(1);
    expect(sanitizeTeamMembers(null)).toEqual([]);
  });
});

describe("team roles (multi + legacy migration)", () => {
  it("migrates a legacy single role string into roles", () => {
    const m = sanitizeTeamMembers([{ id: "m-legacy01", name: "Ali", role: "Developer", bio: "x" }]);
    expect(m).toHaveLength(1);
    expect(m[0].roles).toEqual(["Developer"]);
    expect((m[0] as any).role).toBeUndefined();
    expect(m[0].bio).toBe("x");
  });
  it("legacy rows without any role get an empty list", () => {
    expect(sanitizeTeamMembers([{ name: "Sara" }])[0].roles).toEqual([]);
    expect(sanitizeTeamMembers([{ name: "Sara", role: "  " }])[0].roles).toEqual([]);
  });
  it("keeps order, trims, drops blanks and case-insensitive duplicates", () => {
    const r = normalizeTeamRoles({ roles: [" Developer ", "", "developer", "Cybersecurity  Specialist", 5 as any] });
    expect(r.roles).toEqual(["Developer", "Cybersecurity Specialist"]);
    expect(r.error).toBeUndefined();
  });
  it("merges roles with a legacy role field without duplicating", () => {
    expect(normalizeTeamRoles({ roles: ["A"], role: "B" }).roles).toEqual(["A", "B"]);
    expect(normalizeTeamRoles({ roles: ["A"], role: "a" }).roles).toEqual(["A"]);
  });
  it("validate rejects too many / too long roles", () => {
    const many = Array.from({ length: TEAM_ROLES_MAX + 1 }, (_, i) => `r${i}`);
    expect(validateTeamMembers([{ name: "a", roles: many }]).ok).toBe(false);
    expect(validateTeamMembers([{ name: "a", roles: ["x".repeat(TEAM_ROLE_MAX + 1)] }]).ok).toBe(false);
    const ok = validateTeamMembers([{ name: "a", roles: ["Developer", "Cybersecurity Specialist"] }]);
    expect(ok.ok && ok.members[0].roles).toEqual(["Developer", "Cybersecurity Specialist"]);
  });
  it("sanitize never drops a stored member over role limits, it trims instead", () => {
    const many = Array.from({ length: 10 }, (_, i) => `r${i}`);
    const m = sanitizeTeamMembers([{ name: "a", roles: many }, { name: "b", role: "y".repeat(200) }]);
    expect(m).toHaveLength(2);
    expect(m[0].roles).toHaveLength(TEAM_ROLES_MAX);
    expect(m[1].roles[0]).toHaveLength(TEAM_ROLE_MAX);
  });
});

const requireAdmin = vi.fn();
const store = vi.fn();
vi.mock("@/lib/requireAdmin", () => ({ requireAdmin: (p: string) => requireAdmin(p) }));
vi.mock("@/lib/adminAnalytics", () => ({ writeAuditLog: vi.fn(async () => {}) }));
vi.mock("@/lib/appSettings", () => ({ invalidateAppSettingsCache: vi.fn() }));
vi.mock("@/lib/teamServer", () => ({ getTeamMembers: async () => [], setTeamMembers: (m: unknown) => store(m) }));

describe("/api/admin/team guard", () => {
  beforeEach(() => { requireAdmin.mockReset(); store.mockReset(); });
  const req = (body: unknown) => new Request("http://x/api/admin/team", { method: "PUT", body: JSON.stringify(body) }) as any;

  it("returns the guard response and never writes when not admin", async () => {
    const { NextResponse } = await import("next/server");
    requireAdmin.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) });
    const { PUT, GET } = await import("@/app/api/admin/team/route");
    expect((await PUT(req({ members: [{ name: "a" }] }))).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(requireAdmin).toHaveBeenCalledWith("settings");
    expect(store).not.toHaveBeenCalled();
  });
  it("saves valid and rejects invalid for admins", async () => {
    requireAdmin.mockResolvedValue({ ok: true, userId: "u1" });
    const { PUT } = await import("@/app/api/admin/team/route");
    expect((await PUT(req({ members: [{ name: "a" }] }))).status).toBe(200);
    expect(store).toHaveBeenCalledTimes(1);
    expect((await PUT(req({ members: [{ name: "" }] }))).status).toBe(400);
    expect(store).toHaveBeenCalledTimes(1);
  });
});
