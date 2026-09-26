import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXCLUDED_ROUTE_PREFIXES, fileToRoutePath, REDIRECTS, ROUTED_PAGE_PATHS } from "./routes";

const APP = path.resolve(__dirname, "../../../app");

function pageFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return pageFiles(p);
    return e.name === "page.tsx" ? [p] : [];
  });
}

describe("route generator", () => {
  it("maps App Router files to react-router paths", () => {
    expect(fileToRoutePath("../../../app/page.tsx")).toBe("/");
    expect(fileToRoutePath("../../../app/trade/accounts/[id]/page.tsx")).toBe("/trade/accounts/:id");
    expect(fileToRoutePath("../../../app/(marketing)/about/page.tsx")).toBe("/about");
    expect(fileToRoutePath("../../../app/docs/[...slug]/page.tsx")).toBe("/docs/*");
    expect(fileToRoutePath("../../../app/account/layout.tsx")).toBe("/account");
  });

  it("every web page is routed, excluded or redirected", () => {
    const routed = new Set(ROUTED_PAGE_PATHS);
    const redirected = REDIRECTS.map((r) => r.from.replace(/\/\*$/, ""));
    const unhandled = pageFiles(APP)
      .map((f) => fileToRoutePath(`../../../app/${path.relative(APP, f).split(path.sep).join("/")}`))
      .filter((p) => !routed.has(p))
      .filter((p) => !EXCLUDED_ROUTE_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`)))
      .filter((p) => !redirected.some((x) => p === x || p.startsWith(`${x}/`)));
    expect(unhandled).toEqual([]);
  });

  it("routes the pages of the acceptance set and the tab roots", () => {
    for (const p of ["/", "/auth/login", "/about", "/weekly", "/exercise", "/trade", "/account", "/analysis/weekly", "/trade/accounts/:id"]) {
      expect(ROUTED_PAGE_PATHS).toContain(p);
    }
    expect(ROUTED_PAGE_PATHS.some((p) => p.startsWith("/admin"))).toBe(false);
  });
});
