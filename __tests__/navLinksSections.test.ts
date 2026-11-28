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
    expect(all).toEqual(expect.arrayContaining(["/weekly", "/sleep", "/roadmaps", "/trade", "/exercise", "/calorie"]));
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

  const topHrefs = (items: NavItem[]) => items.map((i) => (isGroup(i) ? i.icon : i.href));

  it("workout: dashboard first, then plan, calorie and sleep as separate pages", () => {
    const items = getVisibleLinks(null, "workout");
    expect(topHrefs(items)).toEqual(["/dashboard", "/exercise", "/calorie", "/sleep", "/analysis/weekly", "mentors", "more"]);
    expect(hrefs(items)).not.toContain("/weekly");
    expect(hrefs(items)).not.toContain("/roadmaps");
    expect(hrefs(items).some((h) => h.includes("?tab="))).toBe(false);
  });

  it("header priority: routine order", () => {
    expect(topHrefs(getVisibleLinks(null, "routine"))).toEqual(["/dashboard", "/weekly", "/sleep", "/analysis/weekly", "/roadmaps", "mentors", "more"]);
  });

  it("header priority: trade order, with and without the dashboard", () => {
    expect(topHrefs(getVisibleLinks(null, "trade"))).toEqual([
      "/dashboard", "/trade/chart", "/trade/journal", "/trade/checklists", "/trade/notes", "tools", "/analysis/weekly", "mentors", "more",
    ]);
    expect(topHrefs(rawVisible({ ...ALL_ON, dashboard: false }, "trade"))).toEqual([
      "/trade", "/trade/chart", "/trade/journal", "/trade/checklists", "/trade/notes", "tools", "/analysis/weekly", "mentors", "more",
    ]);
  });

  it("trade tools group holds risk, money management and MetaTrader, in that order", () => {
    const tools = getVisibleLinks(null, "trade").find((i) => isGroup(i) && i.icon === "tools");
    expect(tools && isGroup(tools) ? tools.children.map((c) => c.href) : []).toEqual(["/trade/risk", "/trade/money", "/trade/metatrader"]);
  });

  it("trade tools group hides money management when its flag is off", () => {
    const noMoney = rawVisible({ ...ALL_ON, tradeMoneyMgmt: false }, "trade").find((i) => isGroup(i) && i.icon === "tools");
    expect(noMoney && isGroup(noMoney) ? noMoney.children.map((c) => c.href) : []).toEqual(["/trade/risk", "/trade/metatrader"]);
  });

  it("a tools group with one visible tool collapses to a plain top-level link", () => {
    const items = rawVisible({ ...ALL_ON, tradeMoneyMgmt: false, metatrader: false }, "trade");
    expect(items.some((i) => isGroup(i) && i.icon === "tools")).toBe(false);
    expect(topHrefs(items)).toContain("/trade/risk");
  });

  it("trade items disappear with their own flag", () => {
    expect(hrefs(rawVisible({ ...ALL_ON, tradeChart: false }, "trade"))).not.toContain("/trade/chart");
    expect(hrefs(rawVisible({ ...ALL_ON, tradeJournal: false }, "trade"))).not.toContain("/trade/journal");
  });

  it("no page is listed twice in the trade menu", () => {
    const all = hrefs(getVisibleLinks(null, "trade"));
    expect(new Set(all).size).toBe(all.length);
  });

  it("a group that collapses to one link keeps its position", () => {
    const items = rawVisible({ ...ALL_ON, blog: false }, "workout");
    expect(topHrefs(items)).toEqual(["/dashboard", "/exercise", "/calorie", "/sleep", "/analysis/weekly", "mentors", "/about"]);
    const noMentorsKid = rawVisible(ALL_ON, "routine");
    expect(noMentorsKid.findIndex((i) => isGroup(i) && i.icon === "mentors")).toBe(5);
  });

  it("apex keeps the original order", () => {
    const top = topHrefs(getVisibleLinks(null, null));
    expect(top.slice(0, 5)).toEqual(["/dashboard", "/weekly", "/sleep", "/roadmaps", "/exercise"]);
  });

  it("only two groups: Mentors and More (articles + about)", () => {
    const groups = getVisibleLinks(null, "routine").filter(isGroup);
    expect(groups.map((g) => g.icon)).toEqual(["mentors", "more"]);
    expect(groups[0].children.map((c) => c.href)).toEqual(["/mentors", "/mentorship"]);
    expect(groups[1].children.map((c) => c.href)).toEqual(["/blog", "/about"]);
  });

  it("workout flags: exercise off hides only the plan link", () => {
    const all = hrefs(rawVisible({ ...ALL_ON, exercise: false }, "workout"));
    expect(all).not.toContain("/exercise");
    expect(all).toContain("/calorie");
  });

  it("trade shows the dashboard (the old /trade hub is merged into it) plus its own pages and shared items", () => {
    const all = hrefs(getVisibleLinks(null, "trade"));
    expect(all).toEqual([
      "/dashboard", "/trade/chart", "/trade/journal", "/trade/checklists", "/trade/notes",
      "/trade/risk", "/trade/money", "/trade/metatrader",
      "/analysis/weekly", "/mentors", "/mentorship", "/trade/calendar", "/trade/clock", "/blog", "/about",
    ]);
  });

  it("trade keeps the /trade entry as a fallback when the dashboard flag is off", () => {
    const all = hrefs(rawVisible({ ...ALL_ON, dashboard: false }, "trade"));
    expect(all).toContain("/trade");
    expect(all).not.toContain("/dashboard");
  });
});
