"use client";

import "./coach.css";
import type { ReactNode } from "react";
import { MentorSheet } from "./MentorMotion";

/**
 * شیت بخش مربی = همان MentorSheet (تله‌ی فوکوس، Escape، پایین‌برگه روی موبایل).
 * CoachSheetBody / CoachSheetActions فقط فاصله‌ی هم‌شکل می‌دن؛ دکمه‌ی اصلی آخر ردیف.
 */
export const CoachSheet = MentorSheet;

export function CoachSheetBody({ children }: { children: ReactNode }) {
  return <div className="ch-sheet-body">{children}</div>;
}

export function CoachSheetActions({ children }: { children: ReactNode }) {
  return <div className="ch-sheet-actions">{children}</div>;
}
