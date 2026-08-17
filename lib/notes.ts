import { clampText } from "./validate";

export const NOTE_MAX_TITLE = 120;
export const NOTE_MAX_CONTENT = 20000;
export const NOTE_MAX_TAGS = 12;
export const NOTE_MAX_TAG_LEN = 24;
export const NOTE_MAX_CHECKLIST_ITEMS = 60;

export type ChecklistItem = { id: string; text: string; done: boolean };

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  checklist: ChecklistItem[] | null;
  reminderAt: string | null;
  pinned: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const cleaned = tags
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => clampText(t.trim(), NOTE_MAX_TAG_LEN));
  return Array.from(new Set(cleaned)).slice(0, NOTE_MAX_TAGS);
}

export function normalizeChecklist(checklist: unknown): ChecklistItem[] | null {
  if (!Array.isArray(checklist)) return null;
  return checklist
    .filter((it): it is { id?: string; text?: string; done?: boolean } => typeof it === "object" && it !== null)
    .slice(0, NOTE_MAX_CHECKLIST_ITEMS)
    .map((it, i) => ({
      id: typeof it.id === "string" && it.id ? it.id : `item_${i}_${Date.now()}`,
      text: clampText(String(it.text ?? ""), 200),
      done: !!it.done,
    }));
}

// --- درخواست‌های سمتِ کلاینت ---

export async function fetchNotes(): Promise<NoteItem[]> {
  const res = await fetch("/api/notes");
  if (!res.ok) return [];
  const data = await res.json();
  return data.notes ?? [];
}

export async function createNote(payload: Partial<NoteItem>): Promise<{ note?: NoteItem; error?: string }> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "خطایی پیش آمد" };
  return { note: data.note };
}

export async function updateNote(id: string, payload: Partial<NoteItem>): Promise<{ note?: NoteItem; error?: string }> {
  const res = await fetch(`/api/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "خطایی پیش آمد" };
  return { note: data.note };
}

export async function deleteNote(id: string): Promise<boolean> {
  const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
  return res.ok;
}
