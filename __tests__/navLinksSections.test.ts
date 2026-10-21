import { describe, expect, it } from "vitest";
import { getVisibleLinks as rawVisible, isGroup, type NavItem } from "@/components/navLinks";
import { FEATURE_KEYS } from "@/lib/featureFlags";
import type { SectionKey } from "@/lib/sections";

const ALL_ON = Object.fromEntries(FEATURE_KEYS.map((k) => [k, true]));
const getVisibleLinks = (_f: null, section: SectionKey | null) => rawVisible(ALL_ON, section);

const hrefs = (items: NavItem[]) =>
  items.flatMap((i) => (isGroup(i) ? i.children.map((c) => c.href) : [i.href]));

describe("getVisibleLinks per section", () => {
  it("apex shows everything", () => {
    const all = hrefs(getVisibleLinks(null, null));
    expect(all).toEqual(expect.arrayContaining(["/weekly", "/sleep", "/roadmaps", "/trade", "/exercise?tab=exercise", "/exercise?tab=calorie"]));
  });

  it("routine hides trade and workout", () => {
    const all = hrefs(getVisibleLinks(null, "routine"));
    expect(all).toEqual(expect.arrayContaining(["/dashboard", "/weekly", "/sleep", "/roadmaps", "/mentors", "/analysis/weekly", "/blog", "/about"]));
    expect(all).not.toContain("/trade");
    expect(all.some((h) => h.startsWith("/exercise"))).toBe(false);
  });

  it("sleep is its own top-level item and there is no routine or workout group", () => {
    for (const sec of ["routine", "workout", null] as const) {
      const items = getVisibleLinks(null, sec);
      expect(items.some((i) => !isGroup(i) && i.href === "/sleep")).toBe(true);
      expect(items.some((i) => isGroup(i) && (i.icon === "weekly" || i.icon === "exercise"))).toBe(false);
    }
  });

  it("workout shows plan and calorie as top-level links", () => {
    const items = getVisibleLinks(null, "workout");
    const top = items.filter((i) => !isGroup(i)).map((i) => (i as { href: string }).href);
    expect(top).toEqual(expect.arrayContaining(["/exercise?tab=exercise", "/exercise?tab=calorie", "/sleep", "/analysis/weekly"]));
    expect(hrefs(items)).not.toContain("/weekly");
    expect(hrefs(items)).not.toContain("/roadmaps");
  });

  it("only two groups: Mentors and More (articles + about)", () => {
    const groups = getVisibleLinks(null, "routine").filter(isGroup);
    expect(groups.map((g) => g.icon)).toEqual(["mentors", "more"]);
    expect(groups[0].children.map((c) => c.href)).toEqual(["/mentors", "/mentorship"]);
    expect(groups[1].children.map((c) => c.href)).toEqual(["/blog", "/about"]);
    const top = getVisibleLinks(null, "routine").filter((i) => !isGroup(i)).map((i) => (i as { href: string }).href);
    expect(top).toEqual(["/dashboard", "/weekly", "/sleep", "/roadmaps", "/analysis/weekly"]);
  });

  it("trade shows only trade plus shared items", () => {
    const all = hrefs(getVisibleLinks(null, "trade"));
    expect(all).toEqual(["/dashboard", "/trade", "/analysis/weekly", "/mentors", "/mentorship", "/blog", "/about"]);
  });
});
