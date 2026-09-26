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

describe("middleware — Bearer bridge on web routes", () => {
  const bearer = { authorization: "Bearer abc.def" };

  it("answers the preflight for app origins asking for Authorization, all methods, no credentials", () => {
    const res = middleware(
      req("/api/trade/entries", "OPTIONS", {
        origin: "https://localhost",
        "access-control-request-method": "PATCH",
        "access-control-request-headers": "content-type, authorization",
      })
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://localhost");
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, POST, PATCH, PUT, DELETE, OPTIONS");
    expect(res.headers.get("access-control-allow-headers")).toBe("Authorization, Content-Type, If-None-Match");
    expect(res.headers.get("access-control-expose-headers")).toBe("ETag");
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("does not answer preflights without authorization, from foreign origins, or on admin routes", () => {
    const pre = (path: string, origin: string, hdrs: string) =>
      middleware(req(path, "OPTIONS", { origin, "access-control-request-headers": hdrs }));
    expect(pre("/api/tasks/daily", "https://localhost", "content-type").headers.get("access-control-allow-origin")).toBeNull();
    expect(pre("/api/tasks/daily", "https://evil.example", "authorization").headers.get("access-control-allow-origin")).toBeNull();
    expect(pre("/api/admin/overview", "https://localhost", "authorization").headers.get("access-control-allow-origin")).toBeNull();
  });

  it("Bearer mutations from app origins skip the Origin CSRF check and get CORS", () => {
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      const res = middleware(req("/api/tasks/daily", method, { origin: "capacitor://localhost", ...bearer }));
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
      expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    }
    const get = middleware(req("/api/trade/tags", "GET", { origin: "https://localhost", ...bearer }));
    expect(get.headers.get("access-control-allow-origin")).toBe("https://localhost");
  });

  it("CSRF is still enforced for cookie requests and for Bearer from foreign origins / admin routes", () => {
    expect(middleware(req("/api/tasks/daily", "POST", { origin: "https://localhost" })).status).toBe(403);
    expect(middleware(req("/api/tasks/daily", "POST", { origin: "https://evil.example", ...bearer })).status).toBe(403);
    expect(middleware(req("/api/admin/users", "POST", { origin: "https://localhost", ...bearer })).status).toBe(403);
    // کوکیِ same-origin مثل قبل
    const same = middleware(req("/api/tasks/daily", "POST", { origin: "https://routine.example" }));
    expect(same.status).toBe(200);
    expect(same.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("the Vite dev origin is allowed only outside production", () => {
    const res = middleware(req("/api/tasks/daily", "POST", { origin: "http://localhost:5173", ...bearer }));
    expect(res.status).toBe(200);
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      expect(middleware(req("/api/tasks/daily", "POST", { origin: "http://localhost:5173", ...bearer })).status).toBe(403);
    } finally {
      env.NODE_ENV = prev;
    }
  });
});

describe("middleware — public signup/forgot-password for the app", () => {
  it("answers preflight + POST from app origins with CORS and no credentials", () => {
    const pre = middleware(req("/api/auth/signup", "OPTIONS", { origin: "https://localhost", "access-control-request-headers": "content-type" }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe("https://localhost");
    expect(pre.headers.get("access-control-allow-credentials")).toBeNull();
    const post = middleware(req("/api/auth/forgot-password/verify", "POST", { origin: "capacitor://localhost" }));
    expect(post.status).toBe(200);
    expect(post.headers.get("access-control-allow-origin")).toBe("capacitor://localhost");
  });

  it("never opens next-auth, 2fa/start or foreign origins", () => {
    for (const path of ["/api/auth/callback/credentials", "/api/auth/session", "/api/auth/2fa/start"]) {
      const res = middleware(req(path, "OPTIONS", { origin: "https://localhost", "access-control-request-headers": "content-type" }));
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    }
    const evil = middleware(req("/api/auth/signup", "OPTIONS", { origin: "https://evil.example" }));
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
  });
});
