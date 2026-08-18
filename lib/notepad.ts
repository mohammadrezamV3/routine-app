// Notepad — Workspace بلاک‌محورِ Arion (الهام‌گرفته از معماریِ اطلاعاتیِ
// Notion، نه ظاهرش). این فایل مدل‌های داده‌ای/کمکی‌ای که هم سمتِ کلاینت هم
// سمتِ API روت‌ها استفاده می‌شن رو نگه می‌داره — تا هیچ‌جا duplicate تعریف نشن.

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulleted_list"
  | "numbered_list"
  | "todo"
  | "toggle"
  | "quote"
  | "divider"
  | "image"
  | "database"
  | "code";

export type RichLeaf = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
};

export type NotepadBlock = {
  id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  content: RichLeaf[];
  checked: boolean;
  collapsed: boolean;
  imageUrl: string | null;
  position: number;
  // فقط برای type==="database" — اگه هنوز دیتابیسِ پشتِ این بلاک ساخته نشده
  // باشه null‌ه (بلافاصله بعدِ تبدیلِ نوع، قبل از فراخوانیِ createDatabaseForBlock)
  databaseId?: string | null;
  // فقط برای type==="code" — اسمِ زبان برای رنگ‌بندیِ نحوی (یکی از CODE_LANGUAGES)
  language?: string | null;
};

export type NotepadPage = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  position: number;
  isFavorite: boolean;
  isArchived: boolean;
  isLocked: boolean;
  archivedAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotepadPageWithBlocks = NotepadPage & { blocks: NotepadBlock[] };

export const NOTEPAD_TITLE_MAX = 200;
export const NOTEPAD_BLOCK_TEXT_MAX = 8000;
export const NOTEPAD_MAX_BLOCKS_PER_SAVE = 2000;
export const NOTEPAD_MAX_IMAGE_DATA_URL = 900_000;

// دسته‌بندی/برچسبِ هر نوعِ بلاک — برای Slash Command Menu
export const BLOCK_TYPE_META: Record<BlockType, { label: string; hint: string; group: "basic" | "media" }> = {
  paragraph: { label: "متن", hint: "یک پاراگرافِ ساده", group: "basic" },
  heading1: { label: "عنوان ۱", hint: "تیترِ بزرگ", group: "basic" },
  heading2: { label: "عنوان ۲", hint: "تیترِ متوسط", group: "basic" },
  heading3: { label: "عنوان ۳", hint: "تیترِ کوچیک", group: "basic" },
  bulleted_list: { label: "لیستِ نقطه‌ای", hint: "یک آیتمِ لیستِ ساده", group: "basic" },
  numbered_list: { label: "لیستِ شماره‌دار", hint: "یک آیتمِ لیستِ شماره‌دار", group: "basic" },
  todo: { label: "چک‌لیست", hint: "یک آیتمِ قابلِ تیک‌زدن", group: "basic" },
  toggle: { label: "تاگل", hint: "بخشی که باز/بسته می‌شه", group: "basic" },
  quote: { label: "نقل‌قول", hint: "یک تکه متنِ نقل‌شده", group: "basic" },
  divider: { label: "خط جدا کننده", hint: "یک خطِ افقی", group: "basic" },
  image: { label: "تصویر", hint: "یک عکس (لینک یا آپلود)", group: "media" },
  database: { label: "دیتابیس", hint: "جدول/بورد/تقویم با پراپرتی‌های دلخواه", group: "media" },
  code: { label: "کد", hint: "قطعه‌کد با انتخابِ زبان و رنگ‌بندیِ نحوی", group: "media" },
};
export const SLASH_MENU_ORDER: BlockType[] = [
  "paragraph", "heading1", "heading2", "heading3",
  "bulleted_list", "numbered_list", "todo", "toggle", "quote", "divider",
  "image", "database", "code",
];

const VALID_BLOCK_TYPES = new Set<BlockType>(Object.keys(BLOCK_TYPE_META) as BlockType[]);
export function isValidBlockType(t: unknown): t is BlockType {
  return typeof t === "string" && VALID_BLOCK_TYPES.has(t as BlockType);
}

// پاک‌سازیِ آرایه‌ی RichLeaf ورودی از کلاینت قبل از ذخیره — هم سمتِ سرور
// استفاده می‌شه (اعتبارسنجیِ امن) هم می‌شه سمتِ کلاینت صداش زد
export function sanitizeLeaves(input: unknown): RichLeaf[] {
  if (!Array.isArray(input)) return [];
  const out: RichLeaf[] = [];
  for (const raw of input.slice(0, 500)) {
    if (!raw || typeof raw !== "object") continue;
    const text = String((raw as any).text ?? "").slice(0, NOTEPAD_BLOCK_TEXT_MAX);
    if (!text) continue;
    const leaf: RichLeaf = { text };
    if ((raw as any).bold) leaf.bold = true;
    if ((raw as any).italic) leaf.italic = true;
    if ((raw as any).underline) leaf.underline = true;
    if ((raw as any).strike) leaf.strike = true;
    if ((raw as any).code) leaf.code = true;
    if (typeof (raw as any).link === "string") leaf.link = (raw as any).link.slice(0, 2000);
    out.push(leaf);
  }
  return out;
}

export function emptyLeaves(): RichLeaf[] {
  return [];
}
export function leavesToPlainText(leaves: RichLeaf[]): string {
  return leaves.map((l) => l.text).join("");
}
export function plainTextToLeaves(text: string): RichLeaf[] {
  return text ? [{ text }] : [];
}

// موقعیتِ بینِ دو خواهر/برادر — عددِ اعشاری تا افزودن/جابه‌جاییِ یک آیتم بینِ
// دوتای دیگه بدونِ renumber کردنِ بقیه ممکن باشه (مثلِ fractional indexing)
export function midPosition(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1000;
  if (prev === null) return (next as number) - 1000;
  if (next === null) return prev + 1000;
  return (prev + next) / 2;
}

function newLocalId(): string {
  return "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
// میان‌برِ مارک‌داونِ سطحِ بلاک — وقتی کاربر بعدِ این متن‌ها یه Space یا Enter
// می‌زنه، بلاک به نوعِ متناظر تبدیل می‌شه (مثلِ Notion). فقط وقتی کل متنِ
// فعلیِ بلاک (قبل از اسپیس) دقیقاً یکی از این الگوهاست فعال می‌شه.
export function matchBlockShortcut(text: string): BlockType | null {
  if (text === "#") return "heading1";
  if (text === "##") return "heading2";
  if (text === "###") return "heading3";
  if (text === "-" || text === "*") return "bulleted_list";
  if (/^\d+\.$/.test(text)) return "numbered_list";
  if (text === "[]" || text === "[ ]") return "todo";
  if (text === ">") return "quote";
  return null;
}
export function isDividerShortcut(text: string): boolean {
  return text === "---" || text === "***";
}

export type InlineShortcutMatch = {
  fullStart: number; fullEnd: number; // بازه‌ی کل شاملِ نشونه‌های مارک‌داون
  innerStart: number; innerEnd: number; // بازه‌ی فقط متنِ داخل (بدونِ نشونه‌ها)
  mark: "bold" | "italic" | "strike" | "code";
};

// اسکن کردنِ متنِ خامِ یک بلاک درست جلوی مکان‌نما — اگه یه الگوی مارک‌داونِ
// درون‌خطیِ تازه‌بسته‌شده (**بولد**، *ایتالیک*، ~~خط‌خورده~~، `کد`) پیدا شه،
// بازه‌ش رو برمی‌گردونه تا کامپوننت بتونه با Range واقعیِ DOM جایگزینش کنه
export function findInlineMarkdownShortcut(text: string, cursor: number): InlineShortcutMatch | null {
  const before = text.slice(0, cursor);
  let m = /\*\*([^*\n]+)\*\*$/.exec(before);
  if (m) return { fullStart: m.index, fullEnd: cursor, innerStart: m.index + 2, innerEnd: cursor - 2, mark: "bold" };
  m = /~~([^~\n]+)~~$/.exec(before);
  if (m) return { fullStart: m.index, fullEnd: cursor, innerStart: m.index + 2, innerEnd: cursor - 2, mark: "strike" };
  m = /`([^`\n]+)`$/.exec(before);
  if (m) return { fullStart: m.index, fullEnd: cursor, innerStart: m.index + 1, innerEnd: cursor - 1, mark: "code" };
  m = /\*([^*\n]+)\*$/.exec(before);
  if (m && before[m.index - 1] !== "*") {
    return { fullStart: m.index, fullEnd: cursor, innerStart: m.index + 1, innerEnd: cursor - 1, mark: "italic" };
  }
  return null;
}

export function makeBlock(pageId: string, type: BlockType, position: number, parentBlockId: string | null = null): NotepadBlock {
  return {
    id: newLocalId(),
    pageId,
    parentBlockId,
    type,
    content: emptyLeaves(),
    checked: false,
    collapsed: false,
    imageUrl: null,
    position,
    databaseId: null,
    language: type === "code" ? "plaintext" : null,
  };
}

// ============================================================================
// بلاکِ کد — لیستِ زبان‌های پشتیبانی‌شده + یه tokenizerِ سبکِ رجکسی برای
// رنگ‌بندیِ نحوی (بدونِ هیچ کتابخانه‌ی خارجی‌ای مثلِ Prism/highlight.js —
// عمداً محدود نگه داشته شده، دقیقاً همون فلسفه‌ی ارزیاب‌گرِ فرمولِ Database)
// ============================================================================

export const CODE_LANGUAGES: { id: string; label: string }[] = [
  { id: "plaintext", label: "متنِ ساده" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
  { id: "json", label: "JSON" },
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
];

const CODE_KEYWORDS: Record<string, string[]> = {
  javascript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "class", "extends", "new", "this", "import", "export", "default", "from", "async", "await", "try", "catch", "finally", "throw", "typeof", "instanceof", "null", "undefined", "true", "false", "void", "yield", "of", "in", "delete"],
  typescript: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "class", "extends", "implements", "interface", "type", "enum", "new", "this", "import", "export", "default", "from", "async", "await", "try", "catch", "finally", "throw", "typeof", "instanceof", "null", "undefined", "true", "false", "void", "yield", "of", "in", "delete", "public", "private", "protected", "readonly", "as"],
  python: ["def", "return", "if", "elif", "else", "for", "while", "break", "continue", "class", "import", "from", "as", "try", "except", "finally", "raise", "with", "lambda", "None", "True", "False", "and", "or", "not", "in", "is", "pass", "yield", "async", "await", "global", "self"],
  sql: ["SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "DATABASE", "TABLE", "ALTER", "DROP", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "NOT", "NULL", "DEFAULT", "JOIN", "INNER", "LEFT", "RIGHT", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "AND", "OR", "AS", "DISTINCT", "COUNT", "SUM", "AVG", "USE", "INDEX", "UNIQUE", "AUTO_INCREMENT"],
  bash: ["if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac", "function", "return", "export", "echo", "local", "sudo", "apt", "cd", "ls", "grep", "cat", "in"],
  json: ["true", "false", "null"],
  css: ["important", "inherit", "initial", "unset", "auto", "none", "solid", "flex", "grid", "block", "absolute", "relative", "fixed"],
  html: ["DOCTYPE", "html", "head", "body", "div", "span", "script", "style", "meta", "link", "title"],
};

export function tokenizeCode(code: string, language: string): { text: string; cls: string }[] {
  const keywords = new Set(CODE_KEYWORDS[language] || []);
  const tokens: { text: string; cls: string }[] = [];
  const isSqlLike = language === "sql";
  const commentRe = language === "python" || language === "bash" ? /^#.*/
    : language === "sql" ? /^--.*/
    : /^\/\/.*|^\/\*[\s\S]*?\*\//;
  let i = 0;
  while (i < code.length) {
    const rest = code.slice(i);
    let m: RegExpExecArray | null;

    if ((m = commentRe.exec(rest)) && m[0]) {
      tokens.push({ text: m[0], cls: "cm" }); i += m[0].length; continue;
    }
    if ((m = /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'|^`(?:[^`\\]|\\.)*`/.exec(rest))) {
      tokens.push({ text: m[0], cls: "str" }); i += m[0].length; continue;
    }
    if ((m = /^-?\d+(\.\d+)?/.exec(rest))) {
      tokens.push({ text: m[0], cls: "num" }); i += m[0].length; continue;
    }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
      const word = m[0];
      const test = isSqlLike ? word.toUpperCase() : word;
      tokens.push({ text: word, cls: keywords.has(test) ? "kw" : "id" });
      i += word.length; continue;
    }
    if ((m = /^\s+/.exec(rest))) { tokens.push({ text: m[0], cls: "" }); i += m[0].length; continue; }
    tokens.push({ text: rest[0], cls: "op" });
    i += 1;
  }
  return tokens;
}

// ============================================================================
// خروجیِ متنِ ساده از کلِ بلاک‌های یه صفحه — برای «کپیِ محتوای صفحه»
// ============================================================================
export function blocksToPlainText(blocks: NotepadBlock[]): string {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const roots = sorted.filter((b) => !b.parentBlockId);
  const childrenOf = (id: string) => sorted.filter((b) => b.parentBlockId === id);
  const lines: string[] = [];
  let numberedCounter = 0;

  function render(b: NotepadBlock) {
    const text = leavesToPlainText(b.content);
    switch (b.type) {
      case "heading1": lines.push(`# ${text}`); numberedCounter = 0; break;
      case "heading2": lines.push(`## ${text}`); numberedCounter = 0; break;
      case "heading3": lines.push(`### ${text}`); numberedCounter = 0; break;
      case "bulleted_list": lines.push(`• ${text}`); numberedCounter = 0; break;
      case "numbered_list": numberedCounter += 1; lines.push(`${numberedCounter}. ${text}`); break;
      case "todo": lines.push(`${b.checked ? "[x]" : "[ ]"} ${text}`); numberedCounter = 0; break;
      case "quote": lines.push(`> ${text}`); numberedCounter = 0; break;
      case "divider": lines.push("---"); numberedCounter = 0; break;
      case "image": lines.push("[تصویر]"); numberedCounter = 0; break;
      case "database": lines.push("[دیتابیس]"); numberedCounter = 0; break;
      case "code": lines.push(text); numberedCounter = 0; break;
      default: lines.push(text); numberedCounter = 0;
    }
    if (b.type === "toggle") {
      for (const child of childrenOf(b.id)) render(child);
    }
  }
  for (const b of roots) render(b);
  return lines.join("\n");
}

// ============================================================================
// Rich text <-> contentEditable DOM
// ============================================================================

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function leavesToHtml(leaves: RichLeaf[]): string {
  if (!leaves.length) return "";
  return leaves
    .map((leaf) => {
      let html = escapeHtml(leaf.text).replace(/\n/g, "<br>");
      if (leaf.code) html = `<code>${html}</code>`;
      if (leaf.strike) html = `<s>${html}</s>`;
      if (leaf.underline) html = `<u>${html}</u>`;
      if (leaf.italic) html = `<i>${html}</i>`;
      if (leaf.bold) html = `<b>${html}</b>`;
      if (leaf.link) html = `<a href="${escapeHtml(leaf.link)}">${html}</a>`;
      return html;
    })
    .join("");
}

type Marks = Partial<Pick<RichLeaf, "bold" | "italic" | "underline" | "strike" | "code" | "link">>;

function walkDomToLeaves(node: Node, marks: Marks, out: RichLeaf[]) {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) out.push({ text, ...marks });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    const tag = el.tagName;
    if (tag === "BR") {
      out.push({ text: "\n", ...marks });
      return;
    }
    const nextMarks: Marks = { ...marks };
    if (tag === "B" || tag === "STRONG") nextMarks.bold = true;
    else if (tag === "I" || tag === "EM") nextMarks.italic = true;
    else if (tag === "U") nextMarks.underline = true;
    else if (tag === "S" || tag === "STRIKE" || tag === "DEL") nextMarks.strike = true;
    else if (tag === "CODE") nextMarks.code = true;
    else if (tag === "A") nextMarks.link = el.getAttribute("href") || "";
    walkDomToLeaves(el, nextMarks, out);
  });
}

// merge کردنِ leafهای پشت‌سرهم که دقیقاً همون مارک‌ها رو دارن — خروجی تمیزتر
function mergeLeaves(leaves: RichLeaf[]): RichLeaf[] {
  const out: RichLeaf[] = [];
  for (const leaf of leaves) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.bold === leaf.bold && prev.italic === leaf.italic && prev.underline === leaf.underline &&
      prev.strike === leaf.strike && prev.code === leaf.code && prev.link === leaf.link
    ) {
      prev.text += leaf.text;
    } else {
      out.push({ ...leaf });
    }
  }
  return out;
}

export function domToLeaves(container: HTMLElement): RichLeaf[] {
  const out: RichLeaf[] = [];
  walkDomToLeaves(container, {}, out);
  return mergeLeaves(out).filter((l) => l.text.length > 0);
}

// ============================================================================
// کمک‌تابع‌های caret/Range — برای میان‌برهای مارک‌داونِ درون‌خطی (تبدیلِ
// آفستِ متنِ خام به یه Range واقعیِ DOM و برعکس)
// ============================================================================

export function getPlainTextAndCursor(el: HTMLElement): { text: string; cursor: number } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
    return { text: el.textContent || "", cursor: (el.textContent || "").length };
  }
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.endContainer, range.endOffset);
  const cursor = preRange.toString().length;
  return { text: el.textContent || "", cursor };
}

function findNodeAtOffset(el: HTMLElement, offset: number): { node: Node; offset: number } | null {
  let remaining = offset;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  let last: Node | null = null;
  while (node) {
    const len = node.textContent?.length || 0;
    if (remaining <= len) return { node, offset: remaining };
    remaining -= len;
    last = node;
    node = walker.nextNode();
  }
  if (last) return { node: last, offset: last.textContent?.length || 0 };
  return { node: el, offset: 0 };
}

export function rangeFromOffsets(el: HTMLElement, start: number, end: number): Range | null {
  const a = findNodeAtOffset(el, start);
  const b = findNodeAtOffset(el, end);
  if (!a || !b) return null;
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

export function setCaretAtOffset(el: HTMLElement, offset: number) {
  const pos = findNodeAtOffset(el, offset);
  if (!pos) return;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ============================================================================
// Fetch helpers (client)
// ============================================================================

export async function fetchNotepadPages(): Promise<NotepadPage[]> {
  const res = await fetch("/api/notepad/pages");
  if (!res.ok) return [];
  const data = await res.json();
  return data.pages || [];
}

export async function fetchNotepadPage(id: string): Promise<NotepadPageWithBlocks | null> {
  const res = await fetch(`/api/notepad/pages/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.page || null;
}

export async function createNotepadPage(input: { parentId?: string | null; title?: string; icon?: string | null }): Promise<NotepadPage | null> {
  const res = await fetch("/api/notepad/pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.page || null;
}

export async function updateNotepadPage(id: string, patch: Partial<Pick<NotepadPage, "title" | "icon" | "coverUrl" | "parentId" | "position" | "isFavorite" | "isArchived" | "isLocked" | "lastOpenedAt">>): Promise<NotepadPage | null> {
  const res = await fetch(`/api/notepad/pages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.page || null;
}

export async function deleteNotepadPage(id: string, permanent = false): Promise<boolean> {
  const res = await fetch(`/api/notepad/pages/${id}${permanent ? "?permanent=1" : ""}`, { method: "DELETE" });
  return res.ok;
}

export async function duplicateNotepadPage(id: string): Promise<NotepadPage | null> {
  const res = await fetch(`/api/notepad/pages/${id}/duplicate`, { method: "POST" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.page || null;
}

export async function saveNotepadBlocks(pageId: string, blocks: NotepadBlock[]): Promise<boolean> {
  const res = await fetch(`/api/notepad/pages/${pageId}/blocks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
  return res.ok;
}

export type NotepadSearchResult = {
  pageId: string;
  title: string;
  icon: string | null;
  matchType: "title" | "block";
  snippet: string;
};
export async function searchNotepad(query: string): Promise<NotepadSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/api/notepad/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}
