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

  it("workout collapses the routine group to a plain sleep link", () => {
    const items = getVisibleLinks(null, "workout");
    const sleep = items.find((i) => !isGroup(i) && i.href === "/sleep");
    expect(sleep).toBeTruthy();
    expect(items.some((i) => isGroup(i) && i.icon === "weekly")).toBe(false);
    const workoutGroup = items.find((i) => isGroup(i) && i.icon === "exercise");
    expect(workoutGroup && isGroup(workoutGroup) && workoutGroup.children.length).toBe(2);
    expect(hrefs(items)).not.toContain("/weekly");
    expect(hrefs(items)).not.toContain("/roadmaps");
  });

  it("trade shows only the dashboard (the old /trade hub is merged into it) plus shared items", () => {
    const all = hrefs(getVisibleLinks(null, "trade"));
    expect(all).toEqual(["/dashboard", "/mentors", "/mentorship", "/analysis/weekly", "/blog", "/about"]);
  });

  it("trade keeps the /trade entry as a fallback when the dashboard flag is off", () => {
    const all = hrefs(rawVisible({ ...ALL_ON, dashboard: false }, "trade"));
    expect(all).toContain("/trade");
    expect(all).not.toContain("/dashboard");
  });
});
