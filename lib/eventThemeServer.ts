import { getAppSetting, setAppSetting } from "@/lib/appSettings";
import { EVENT_THEMES } from "@/lib/eventThemes";
import {
  EVENT_THEME_KEY,
  EMPTY_EVENT_THEME_STATE,
  resolveActiveEventTheme,
  sanitizeEventThemeState,
  type EventThemeState,
} from "@/lib/eventThemeState";

// خواندن/نوشتن وضعیت سراسری تم مناسبتی (AppSetting، کش حدود ۶۰ ثانیه)
export async function getEventThemeState(): Promise<EventThemeState> {
  const raw = await getAppSetting<unknown>(EVENT_THEME_KEY, EMPTY_EVENT_THEME_STATE);
  return sanitizeEventThemeState(raw, EVENT_THEMES);
}

export async function setEventThemeState(state: EventThemeState) {
  await setAppSetting(EVENT_THEME_KEY, state);
}

export async function getActiveEventThemeId(now: Date = new Date()): Promise<string | null> {
  const state = await getEventThemeState();
  return resolveActiveEventTheme(state, now, EVENT_THEMES);
}
