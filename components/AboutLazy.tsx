"use client";

import { lazySection } from "@/components/lazyOnView";
import type { TeamMember } from "@/lib/teamMembers";
import type { SectionKey } from "@/lib/sections";

type Sec = { section?: SectionKey | null };

/* eslint-disable @typescript-eslint/no-var-requires */
// بخش‌های زیر صفحه‌ی «درباره ما»: HTML کامل سرور + هیدریشن تنبل نزدیک دید
// (components/lazyOnView.tsx). require فقط روی سرور (شاخه‌ی typeof window).
type Mod = typeof import("@/components/AboutSections");
const server = typeof window === "undefined" ? () => require("@/components/AboutSections") as Mod : null;
const load = () => import("@/components/AboutSections");

export const AboutStats = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutStats })), server && (() => server().AboutStats), 260, [201, 118]);
export const AboutStory = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutStory })), server && (() => server().AboutStory), 900, [1286, 752]);
export const AboutValues = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutValues })), server && (() => server().AboutValues), 700, [1380, 655]);
export const AboutInside = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutInside })), server && (() => server().AboutInside), 1400);
export const AboutPrivacy = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutPrivacy })), server && (() => server().AboutPrivacy), 600, [1008, 636]);
export const AboutContact = lazySection<{ team?: TeamMember[] } & Sec>(() => load().then((m) => ({ default: m.AboutContact })), server && (() => server().AboutContact), 700, [1036, 561]);
export const AboutFinalCTA = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutFinalCTA })), server && (() => server().AboutFinalCTA), 400, [537, 645]);
export const AboutFaq = lazySection<Sec>(() => load().then((m) => ({ default: m.AboutFaq })), server && (() => server().AboutFaq), 500, [600, 520]);
