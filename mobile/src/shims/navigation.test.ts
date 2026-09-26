import { describe, expect, it } from "vitest";
import { formatHref } from "./next-link";
import { notFound, redirect } from "./next-navigation";
import { isNotFoundSignal, isRedirectSignal } from "./routeSignals";
import { isExternalHref } from "./navRegistry";
import { toSession } from "./next-auth-react";

describe("next/* shims", () => {
  it("formats Next UrlObject hrefs", () => {
    expect(formatHref("/exercise?tab=calorie")).toBe("/exercise?tab=calorie");
    expect(formatHref({ pathname: "/trade/journal", query: { a: "1", b: ["x", "y"] }, hash: "top" })).toBe("/trade/journal?a=1&b=x&b=y#top");
  });

  it("notFound()/redirect() throw boundary signals", () => {
    expect(() => notFound()).toThrow();
    try {
      redirect("/account/general");
    } catch (e) {
      expect(isRedirectSignal(e) && e.url).toBe("/account/general");
    }
    try {
      notFound();
    } catch (e) {
      expect(isNotFoundSignal(e)).toBe(true);
    }
  });

  it("recognises external hrefs", () => {
    expect(isExternalHref("https://t.me/x")).toBe(true);
    expect(isExternalHref("mailto:a@b.c")).toBe(true);
    expect(isExternalHref("/about")).toBe(false);
  });

  it("maps the mobile user to a next-auth session (superAdmin off until 1b)", () => {
    expect(toSession(null)).toBeNull();
    const s = toSession({ id: "u1", name: null, username: "ali", phoneMasked: null, market: "IRAN", modules: [], moduleAccess: [], plan: null });
    expect(s?.user?.id).toBe("u1");
    expect(s?.user?.name).toBe("ali");
    expect(s?.user?.isSuperAdmin).toBe(false);
  });
});
