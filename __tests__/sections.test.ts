import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isSectionKey,
  sectionsOwningPath,
  pathAllowedIn,
  seoLandingOwner,
  sectionBaseDomain,
  sectionFromHost,
  isOwnHost,
  sectionOrigin,
  sectionUrl,
  cookieDomainForHost,
} from "@/lib/sections";

const ENV = "NEXT_PUBLIC_SECTION_BASE_DOMAIN";

function setBase(value: string | undefined) {
  if (value === undefined) delete process.env[ENV];
  else process.env[ENV] = value;
}

beforeEach(() => {
  setBase("arionapp.ir");
});

afterEach(() => {
  delete process.env[ENV];
});

describe("isSectionKey", () => {
  it("accepts the three section keys", () => {
    expect(isSectionKey("routine")).toBe(true);
    expect(isSectionKey("trade")).toBe(true);
    expect(isSectionKey("workout")).toBe(true);
  });

  it("rejects unknown strings and non-strings", () => {
    expect(isSectionKey("exercise")).toBe(false);
    expect(isSectionKey("")).toBe(false);
    expect(isSectionKey("Trade")).toBe(false);
    expect(isSectionKey(null)).toBe(false);
    expect(isSectionKey(undefined)).toBe(false);
    expect(isSectionKey(1)).toBe(false);
  });
});

describe("sectionsOwningPath", () => {
  it("maps /weekly to routine only", () => {
    expect(sectionsOwningPath("/weekly")).toEqual(["routine"]);
  });

  it("maps /sleep to both routine and workout", () => {
    expect(sectionsOwningPath("/sleep")).toEqual(["routine", "workout"]);
  });

  it("maps nested trade account paths to trade", () => {
    expect(sectionsOwningPath("/trade/accounts/x")).toEqual(["trade"]);
  });

  it("returns no owner for shared paths such as /dashboard", () => {
    expect(sectionsOwningPath("/dashboard")).toEqual([]);
  });

  it("matches the trade landing /trading-journal as trade", () => {
    expect(sectionsOwningPath("/trading-journal")).toEqual(["trade"]);
  });

  it("does not match /trader against the /trade prefix", () => {
    expect(sectionsOwningPath("/trader")).toEqual([]);
    expect(sectionsOwningPath("/trader/x")).toEqual([]);
  });

  it("matches an exact prefix only on a slash boundary", () => {
    expect(sectionsOwningPath("/exercise")).toEqual(["workout"]);
    expect(sectionsOwningPath("/exercises")).toEqual([]);
    expect(sectionsOwningPath("/weeklyx")).toEqual([]);
  });
});

describe("pathAllowedIn", () => {
  it("null section (apex host) allows every path", () => {
    expect(pathAllowedIn(null, "/exercise")).toBe(true);
    expect(pathAllowedIn(null, "/trade")).toBe(true);
    expect(pathAllowedIn(null, "/dashboard")).toBe(true);
  });

  it("trade host blocks workout paths and allows shared and trade paths", () => {
    expect(pathAllowedIn("trade", "/exercise")).toBe(false);
    expect(pathAllowedIn("trade", "/dashboard")).toBe(true);
    expect(pathAllowedIn("trade", "/trade")).toBe(true);
  });

  it("shared sleep path is allowed on both owning sections", () => {
    expect(pathAllowedIn("routine", "/sleep")).toBe(true);
    expect(pathAllowedIn("workout", "/sleep")).toBe(true);
    expect(pathAllowedIn("trade", "/sleep")).toBe(false);
  });
});

describe("isolation: section-specific app pages", () => {
  it("settings sub-pages and the routine streak home belong to one section", () => {
    expect(sectionsOwningPath("/account/general/routine")).toEqual(["routine"]);
    expect(sectionsOwningPath("/account/general/exercise")).toEqual(["workout"]);
    expect(sectionsOwningPath("/account/general/trade")).toEqual(["trade"]);
    expect(sectionsOwningPath("/streak")).toEqual(["routine"]);
  });

  it("shared settings pages stay open on every host", () => {
    for (const p of ["/account/general", "/account/general/theme", "/account/general/dashboard", "/account/general/notifications", "/account/general/mentors", "/account/general/chats", "/account/profile", "/subscription"]) {
      expect(sectionsOwningPath(p)).toEqual([]);
      expect(pathAllowedIn("trade", p)).toBe(true);
    }
  });

  it("other sections' settings sub-pages are blocked on a section host", () => {
    expect(pathAllowedIn("trade", "/account/general/exercise")).toBe(false);
    expect(pathAllowedIn("workout", "/account/general/trade")).toBe(false);
    expect(pathAllowedIn("workout", "/streak")).toBe(false);
    expect(pathAllowedIn("routine", "/account/general/routine")).toBe(true);
  });
});

describe("seoLandingOwner", () => {
  it("returns the owning section for landing pages", () => {
    expect(seoLandingOwner("/routine")).toBe("routine");
    expect(seoLandingOwner("/trading-journal")).toBe("trade");
    expect(seoLandingOwner("/calorie-counter")).toBe("workout");
  });

  it("returns the owner for nested landing sub-paths", () => {
    expect(seoLandingOwner("/economic-calendar/today")).toBe("trade");
  });

  it("returns null for non-landing and owned-but-not-landing paths", () => {
    expect(seoLandingOwner("/weekly")).toBeNull();
    expect(seoLandingOwner("/sleep")).toBeNull();
    expect(seoLandingOwner("/dashboard")).toBeNull();
    expect(seoLandingOwner("/routinely")).toBeNull();
  });
});

describe("sectionBaseDomain", () => {
  it("normalizes a full https URL to the bare domain", () => {
    setBase("https://arionapp.ir/");
    expect(sectionBaseDomain()).toBe("arionapp.ir");
    expect(sectionFromHost("trade.arionapp.ir")).toBe("trade");
    expect(sectionOrigin("trade")).toBe("https://trade.arionapp.ir");
    expect(cookieDomainForHost("trade.arionapp.ir")).toBe(".arionapp.ir");
  });

  it("trims whitespace and lowercases the value", () => {
    setBase("  ArionApp.IR  ");
    expect(sectionBaseDomain()).toBe("arionapp.ir");
  });

  it("returns null when unset or blank", () => {
    setBase(undefined);
    expect(sectionBaseDomain()).toBeNull();
    setBase("   ");
    expect(sectionBaseDomain()).toBeNull();
  });
});

describe("sectionFromHost", () => {
  it("maps a section subdomain to its key", () => {
    expect(sectionFromHost("trade.arionapp.ir")).toBe("trade");
    expect(sectionFromHost("routine.arionapp.ir")).toBe("routine");
    expect(sectionFromHost("workout.arionapp.ir")).toBe("workout");
  });

  it("strips the port before matching", () => {
    expect(sectionFromHost("workout.arionapp.ir:443")).toBe("workout");
  });

  it("is case-insensitive", () => {
    expect(sectionFromHost("Trade.ArionApp.ir")).toBe("trade");
  });

  it("returns null for the apex domain", () => {
    expect(sectionFromHost("arionapp.ir")).toBeNull();
  });

  it("returns null for www", () => {
    expect(sectionFromHost("www.arionapp.ir")).toBeNull();
  });

  it("returns null for an unknown subdomain", () => {
    expect(sectionFromHost("foo.arionapp.ir")).toBeNull();
  });

  it("returns null for a foreign domain", () => {
    expect(sectionFromHost("trade.evil.com")).toBeNull();
  });

  it("returns null for a host that only ends with the base as a suffix string", () => {
    expect(sectionFromHost("trade.notarionapp.ir")).toBeNull();
  });

  it("returns null for empty or missing hosts", () => {
    expect(sectionFromHost(null)).toBeNull();
    expect(sectionFromHost(undefined)).toBeNull();
    expect(sectionFromHost("")).toBeNull();
  });

  it("returns null when the env var is unset", () => {
    setBase(undefined);
    expect(sectionFromHost("trade.arionapp.ir")).toBeNull();
  });
});

describe("isOwnHost", () => {
  it("accepts the apex, www and section subdomains", () => {
    expect(isOwnHost("arionapp.ir")).toBe(true);
    expect(isOwnHost("www.arionapp.ir")).toBe(true);
    expect(isOwnHost("trade.arionapp.ir:3000")).toBe(true);
  });

  it("rejects foreign and suffix-lookalike hosts", () => {
    expect(isOwnHost("evil.com")).toBe(false);
    expect(isOwnHost("trade.evil.com")).toBe(false);
    expect(isOwnHost("notarionapp.ir")).toBe(false);
  });

  it("rejects missing hosts", () => {
    expect(isOwnHost(null)).toBe(false);
    expect(isOwnHost(undefined)).toBe(false);
  });

  it("returns false when the env var is unset", () => {
    setBase(undefined);
    expect(isOwnHost("arionapp.ir")).toBe(false);
    expect(isOwnHost("trade.arionapp.ir")).toBe(false);
  });
});

describe("sectionOrigin", () => {
  it("returns the apex origin with https for null section", () => {
    expect(sectionOrigin(null)).toBe("https://arionapp.ir");
  });

  it("returns the section subdomain origin with https by default", () => {
    expect(sectionOrigin("routine")).toBe("https://routine.arionapp.ir");
  });

  it("preserves protocol and port from the current origin on localhost", () => {
    setBase("localhost");
    expect(sectionOrigin("trade", "http://trade.localhost:3000")).toBe("http://trade.localhost:3000");
    expect(sectionOrigin("routine", "http://localhost:3000")).toBe("http://routine.localhost:3000");
    expect(sectionOrigin(null, "http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("falls back to https when the current origin is unparsable", () => {
    expect(sectionOrigin("trade", "not a url")).toBe("https://trade.arionapp.ir");
  });

  it("returns null when hosting is disabled", () => {
    setBase(undefined);
    expect(sectionOrigin("trade")).toBeNull();
    expect(sectionOrigin(null)).toBeNull();
  });
});

describe("sectionUrl", () => {
  it("builds an absolute URL on the section host", () => {
    expect(sectionUrl("trade", "/trade/journal")).toBe("https://trade.arionapp.ir/trade/journal");
  });

  it("adds a leading slash to a relative path", () => {
    expect(sectionUrl(null, "weekly")).toBe("https://arionapp.ir/weekly");
  });

  it("returns the relative path when hosting is disabled", () => {
    setBase(undefined);
    expect(sectionUrl("trade", "/trade/journal")).toBe("/trade/journal");
    expect(sectionUrl(null, "dashboard")).toBe("/dashboard");
  });
});

describe("cookieDomainForHost", () => {
  it("returns the shared cookie domain for own hosts", () => {
    expect(cookieDomainForHost("arionapp.ir")).toBe(".arionapp.ir");
    expect(cookieDomainForHost("trade.arionapp.ir:443")).toBe(".arionapp.ir");
  });

  it("returns null for foreign hosts", () => {
    expect(cookieDomainForHost("trade.evil.com")).toBeNull();
    expect(cookieDomainForHost(null)).toBeNull();
  });

  it("returns null when the base is localhost", () => {
    setBase("localhost");
    expect(cookieDomainForHost("trade.localhost:3000")).toBeNull();
  });

  it("returns null when hosting is disabled", () => {
    setBase(undefined);
    expect(cookieDomainForHost("trade.arionapp.ir")).toBeNull();
  });
});
