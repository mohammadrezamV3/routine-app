export const CONFLICT_ALERT_EVENT = "routine:conflict-alert";

export function showConflictAlert(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONFLICT_ALERT_EVENT, { detail: message }));
}
