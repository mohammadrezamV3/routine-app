import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function req(path: string, method: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://routine.example${path}`, { method, headers: { host: "routine.example", ...headers } });
}

describe("middleware — /api/mobile/*", () => {
  it("answers CORS preflight for the Capacitor origin without credentials", () => {
    const res = middleware(req("/api/mobile/sync/push", "OPTIONS", { origin: "https://localhost" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://localhost");
    expect(res.headers.get("access-control-allow-headers")).toContain("Authorization");
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("allows capacitor://localhost and skips the CSRF origin check for Bearer routes", () => {
    const res = middleware(req("/api/mobile/sync/push", "POST", { origin: "capacitor://localhost" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
  });

  it("allows native requests without an Origin header", () => {
    expect(middleware(req("/api/mobile/auth/login", "POST")).status).toBe(200);
  });

  it("rejects preflight and requests from unknown browser origins", () => {
    expect(middleware(req("/api/mobile/sync/push", "OPTIONS", { origin: "https://evil.example" })).status).toBe(403);
    expect(middleware(req("/api/mobile/sync/push", "POST", { origin: "https://evil.example" })).status).toBe(403);
  });

  it("leaves the CSRF check on every other API route unchanged", () => {
    expect(middleware(req("/api/tasks/daily", "POST", { origin: "https://localhost" })).status).toBe(403);
    expect(middleware(req("/api/tasks/daily", "POST", { origin: "https://routine.example" })).status).toBe(200);
  });
});
