import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SECTION_KEYS, SECTION_META, pathAllowedIn } from "@/lib/sections";
import { getSectionAbout, sectionAboutMetadata } from "@/lib/sectionAbout";
import { BLOG_POSTS, relatedPosts } from "@/lib/blogPosts";
import {
  blogCanonicalUrl, blogCategoryOwner, blogCategoryVisible, blogHrefAllowed, blogIndexCanonical, blogViewSection,
  filterPostsForSection, visibleBlogCategories,
} from "@/lib/sectionBlog";

const BAD = /[ً-ْٰأإ]/;

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SECTION_BASE_DOMAIN", "arionapp.ir"); });
afterEach(() => { vi.unstubAllEnvs(); });

describe("section about copy", () => {
  it("is complete and has no diacritics", () => {
    for (const k of SECTION_KEYS) {
      const a = getSectionAbout(k);
      for (const s of strings(a)) {
        expect(s.length).toBeGreaterThan(0);
        expect(BAD.test(s), s).toBe(false);
      }
      expect(a.story.chapters).toHaveLength(4);
      expect(a.values).toHaveLength(6);
      expect(a.faq.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("links only to paths the section owns or shares", () => {
    for (const k of SECTION_KEYS) {
      for (const t of getSectionAbout(k).inside.tiles) {
        if (t.href) expect(pathAllowedIn(k, t.href), `${k} ${t.href}`).toBe(true);
      }
    }
  });

  it("does not mention another section's products", () => {
    const forbidden: Record<string, RegExp> = {
      routine: /کالری|بدنسازی|ترید|متاتریدر|calorie|bodybuilding|trading|MetaTrader/i,
      workout: /ترید|متاتریدر|رودمپ|نومو|trading|MetaTrader|roadmap|Nomo/i,
      trade: /کالری|بدنسازی|رودمپ|نومو|خواب|calorie|bodybuilding|roadmap|Nomo|sleep/i,
    };
    for (const k of SECTION_KEYS) {
      const a = getSectionAbout(k);
      const text = strings([a.hero, a.story, a.values, a.inside, a.faq, a.final]).join(" | ");
      expect(forbidden[k].test(text), `${k}: ${forbidden[k].exec(text)?.[0]}`).toBe(false);
    }
  });

  it("metadata points at the section host about page", () => {
    for (const k of SECTION_KEYS) {
      const m = sectionAboutMetadata(k);
      expect(m.alternates?.canonical).toBe(`https://${SECTION_META[k].subdomain}.arionapp.ir/about`);
    }
    // بخش موثر با کوکی فرق داره: متن از بخش موثر، canonical از میزبان
    expect(sectionAboutMetadata("trade", "routine").alternates?.canonical).toBe("https://routine.arionapp.ir/about");
    expect(String(sectionAboutMetadata("trade", null).alternates?.canonical)).not.toContain("trade.");
  });
});

describe("section blog", () => {
  it("every category has an owner and the owner is the first listing section", () => {
    expect(blogCategoryOwner("trading")).toBe("trade");
    expect(blogCategoryOwner("sleep")).toBe("routine");
    expect(blogCategoryOwner("fitness")).toBe("workout");
  });

  it("filters categories and posts per host; apex shows everything", () => {
    expect(visibleBlogCategories(null)).toHaveLength(7);
    expect(visibleBlogCategories("trade")).toEqual(["trading"]);
    expect(visibleBlogCategories("workout")).toEqual(["sleep", "fitness", "nutrition"].sort((a, b) => visibleBlogCategories("workout").indexOf(a as never) - visibleBlogCategories("workout").indexOf(b as never)));
    for (const k of SECTION_KEYS) {
      for (const p of filterPostsForSection(BLOG_POSTS, k)) expect(blogCategoryVisible(k, p.category)).toBe(true);
    }
    expect(filterPostsForSection(BLOG_POSTS, null)).toHaveLength(BLOG_POSTS.length);
  });

  it("related posts stay inside the section", () => {
    for (const k of SECTION_KEYS) {
      for (const p of filterPostsForSection(BLOG_POSTS, k)) {
        for (const r of relatedPosts(p, 3, k)) expect(blogCategoryVisible(k, r.category)).toBe(true);
      }
    }
  });

  it("post links to other sections are dropped on a section host", () => {
    expect(blogHrefAllowed("trade", "/blog/how-to-build-a-daily-routine")).toBe(false);
    expect(blogHrefAllowed("trade", "/blog/forex-money-management")).toBe(true);
    expect(blogHrefAllowed("routine", "/calorie-counter")).toBe(false);
    expect(blogHrefAllowed("workout", "/calorie-counter")).toBe(true);
    expect(blogHrefAllowed("workout", "/blog/category/trading")).toBe(false);
    expect(blogHrefAllowed(null, "/calorie-counter")).toBe(true);
    // هر لینک مقاله‌ای که روی میزبان می‌مونه باید مجاز باشه
    for (const k of SECTION_KEYS) {
      for (const p of filterPostsForSection(BLOG_POSTS, k)) {
        for (const r of p.related.filter((x) => blogHrefAllowed(k, x.href))) {
          if (r.href.startsWith("/blog/") && !r.href.startsWith("/blog/category")) {
            const slug = r.href.replace("/blog/", "");
            const target = BLOG_POSTS.find((x) => x.slug === slug);
            expect(target && blogCategoryVisible(k, target.category)).toBe(true);
          }
        }
      }
    }
  });

  it("renders another section's post in place with the owner section (no redirect, no domain change)", () => {
    expect(blogViewSection("trade", "fitness")).toBe("workout");
    expect(blogViewSection("workout", "fitness")).toBe("workout");
    expect(blogViewSection("workout", "habits")).toBe("routine");
    expect(blogViewSection(null, "habits")).toBeNull();
  });

  it("canonical goes to the owning host", () => {
    expect(blogCanonicalUrl("/blog/a", "trading")).toContain("trade.arionapp.ir/blog/a");
    expect(blogCanonicalUrl("/blog/a", "sleep")).toContain("routine.arionapp.ir/blog/a");
    expect(blogIndexCanonical("workout")).toBe("https://workout.arionapp.ir/blog");
  });

  it("without the base domain nothing changes", () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SECTION_BASE_DOMAIN", "");
    expect(blogCanonicalUrl("/blog/a", "trading")).toMatch(/\/blog\/a$/);
    expect(blogCanonicalUrl("/blog/a", "trading")).not.toContain("trade.");
  });
});
