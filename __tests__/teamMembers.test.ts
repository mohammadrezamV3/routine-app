import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TEAM_MAX_MEMBERS, normalizeTeamLink, sanitizeTeamMembers, validateTeamMembers,
} from "@/lib/teamMembers";

const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

describe("validateTeamMembers", () => {
  it("keeps order, assigns ids and normalizes links", () => {
    const r = validateTeamMembers([
      { name: " Ali ", role: "CTO", links: { telegram: "@ali", website: "example.com" } },
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
