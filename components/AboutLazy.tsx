"use client";

import { lazySection } from "@/components/lazyOnView";
import type { TeamMember } from "@/lib/teamMembers";

/* eslint-disable @typescript-eslint/no-var-requires */
// بخش‌های زیر صفحه‌ی «درباره ما»: HTML کامل سرور + هیدریشن تنبل نزدیک دید
// (components/lazyOnView.tsx). require فقط روی سرور (شاخه‌ی typeof window).
type Mod = typeof import("@/components/AboutSections");
const server = typeof window === "undefined" ? () => require("@/components/AboutSections") as Mod : null;
const load = () => import("@/components/AboutSections");

export const AboutStats = lazySection(() => load().then((m) => ({ default: m.AboutStats })), server && (() => server().AboutStats), 260);
export const AboutStory = lazySection(() => load().then((m) => ({ default: m.AboutStory })), server && (() => server().AboutStory), 900);
export const AboutValues = lazySection(() => load().then((m) => ({ default: m.AboutValues })), server && (() => server().AboutValues), 700);
export const AboutInside = lazySection(() => load().then((m) => ({ default: m.AboutInside })), server && (() => server().AboutInside), 1400);
export const AboutPrivacy = lazySection(() => load().then((m) => ({ default: m.AboutPrivacy })), server && (() => server().AboutPrivacy), 600);
export const AboutContact = lazySection<{ team?: TeamMember[] }>(() => load().then((m) => ({ default: m.AboutContact })), server && (() => server().AboutContact), 700);
export const AboutFinalCTA = lazySection(() => load().then((m) => ({ default: m.AboutFinalCTA })), server && (() => server().AboutFinalCTA), 400);
