// Notepad Database — Phase 2 (Table/Board/Calendar/Gallery/List). همون
// اصل Phase 1 اینجا هم برقراره: فقط مدل‌های داده‌ای/کمکی مشترک کلاینت+سرور.

export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "checkbox"
  | "date"
  | "url"
  | "email"
  | "relation"
  | "formula";

export type SelectOption = { id: string; label: string; color: string };

export type DatabaseProperty = {
  id: string;
  databaseId: string;
  name: string;
  type: PropertyType;
  options: { choices?: SelectOption[]; targetDatabaseId?: string; expression?: string } | null;
  position: number;
};

// مقدار هر سلول بسته به نوع property: text/url/email -> string,
// number -> number, checkbox -> boolean, select -> string (id گزینه),
// multi_select/relation -> string[], date -> ISO string, formula -> readonly (محاسبه‌شده)
export type RecordValue = string | number | boolean | string[] | null;

export type DatabaseRecord = {
  id: string;
  databaseId: string;
  values: Record<string, RecordValue>;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type FilterOp = "eq" | "neq" | "contains" | "is_empty" | "is_not_empty" | "gt" | "lt" | "checked" | "unchecked";
export type FilterRule = { id: string; propertyId: string; op: FilterOp; value?: RecordValue };
export type SortRule = { propertyId: string; dir: "asc" | "desc" };

export type ViewType = "table" | "board" | "calendar" | "gallery" | "list";

export type NotepadDatabaseMeta = {
  id: string;
  blockId: string;
  name: string;
  activeView: ViewType;
  filters: FilterRule[];
  sorts: SortRule[];
  hiddenPropertyIds: string[];
  boardGroupPropertyId: string | null;
  calendarDatePropertyId: string | null;
};

export type NotepadDatabaseFull = NotepadDatabaseMeta & {
  properties: DatabaseProperty[];
  records: DatabaseRecord[];
};

export const PROPERTY_TYPE_META: Record<PropertyType, { label: string }> = {
  text: { label: "متن" },
  number: { label: "عدد" },
  select: { label: "انتخابی" },
  multi_select: { label: "چندانتخابی" },
  checkbox: { label: "چک‌باکس" },
  date: { label: "تاریخ" },
  url: { label: "لینک" },
  email: { label: "ایمیل" },
  relation: { label: "ارتباط با دیتابیس دیگر" },
  formula: { label: "فرمول" },
};
export const PROPERTY_TYPE_ORDER: PropertyType[] = [
  "text", "number", "select", "multi_select", "checkbox", "date", "url", "email", "relation", "formula",
];

export const SELECT_COLORS = [
  "#7C6AF2", "#3FB37F", "#E0A339", "#EF5A5F", "#4EA1E8",
  "#D65DB1", "#59C3C3", "#B0B3BB", "#E8894E", "#6BC77E",
];

function newLocalId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function makeSelectOption(label: string): SelectOption {
  return { id: newLocalId("opt"), label, color: SELECT_COLORS[Math.floor(Math.random() * SELECT_COLORS.length)] };
}

export function defaultValueForType(type: PropertyType): RecordValue {
  switch (type) {
    case "checkbox": return false;
    case "multi_select":
    case "relation": return [];
    case "number": return null;
    default: return null;
  }
}

// ============================================================================
// فرمول — یه ارزیاب‌گر خیلی سبک (بدون eval)، فقط عملگرهای ریاضی پایه روی
// مقدار propertyهای عددی همون رکورد. عمدا محدود نگه داشته شده — یه موتور
// فرمول کامل Notion-مانند دامنه‌ی این فاز نیست.
// ============================================================================

type Token = { type: "num" | "ident" | "op" | "lparen" | "rparen"; value: string };

function tokenizeFormula(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      tokens.push({ type: "num", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_؀-ۿ]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_؀-ۿ]/.test(expr[j])) j++;
      tokens.push({ type: "ident", value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
    if (ch === "(") { tokens.push({ type: "lparen", value: ch }); i++; continue; }
    if (ch === ")") { tokens.push({ type: "rparen", value: ch }); i++; continue; }
    i++; // کاراکتر ناشناخته رو نادیده بگیر
  }
  return tokens;
}

// recursive-descent: expr -> term (('+'|'-') term)*, term -> factor (('*'|'/') factor)*, factor -> number | ident | '(' expr ')'
function parseFormula(tokens: Token[], vars: Record<string, number>): number {
  let pos = 0;
  function peek() { return tokens[pos]; }
  function factor(): number {
    const t = peek();
    if (!t) return 0;
    if (t.type === "num") { pos++; return parseFloat(t.value); }
    if (t.type === "ident") { pos++; return vars[t.value] ?? 0; }
    if (t.type === "lparen") { pos++; const v = expr(); if (peek()?.type === "rparen") pos++; return v; }
    if (t.type === "op" && t.value === "-") { pos++; return -factor(); }
    pos++;
    return 0;
  }
  function term(): number {
    let v = factor();
    while (peek() && peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = tokens[pos].value; pos++;
      const rhs = factor();
      v = op === "*" ? v * rhs : (rhs === 0 ? 0 : v / rhs);
    }
    return v;
  }
  function expr(): number {
    let v = term();
    while (peek() && peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = tokens[pos].value; pos++;
      const rhs = term();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }
  return expr();
}

// نگاشت اسم property به مقدار عددی همون رکورد، برای استفاده به‌عنوان
// متغیر توی فرمول (کاربر با اسم خود propertyها می‌نویسه، نه idشون)
export function evaluateFormula(expression: string, record: DatabaseRecord, properties: DatabaseProperty[]): number {
  if (!expression?.trim()) return 0;
  const vars: Record<string, number> = {};
  for (const p of properties) {
    const v = record.values[p.id];
    vars[p.name] = typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : 0;
  }
  try {
    return parseFormula(tokenizeFormula(expression), vars);
  } catch {
    return 0;
  }
}

// ============================================================================
// فیلتر/سورت — روی آرایه‌ی رکوردهای درحافظه (مقیاس این فاز کوچیکه، نیازی
// به کوئری JSON پیچیده‌ی دیتابیس نیست)
// ============================================================================

function recordMatchesFilter(rec: DatabaseRecord, rule: FilterRule): boolean {
  const v = rec.values[rule.propertyId];
  switch (rule.op) {
    case "is_empty": return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    case "is_not_empty": return !(v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0));
    case "checked": return v === true;
    case "unchecked": return v !== true;
    case "eq": return Array.isArray(v) ? v.includes(String(rule.value)) : v === rule.value;
    case "neq": return Array.isArray(v) ? !v.includes(String(rule.value)) : v !== rule.value;
    case "contains": return typeof v === "string" && typeof rule.value === "string" && v.toLowerCase().includes(rule.value.toLowerCase());
    case "gt": return typeof v === "number" && typeof rule.value === "number" && v > rule.value;
    case "lt": return typeof v === "number" && typeof rule.value === "number" && v < rule.value;
    default: return true;
  }
}

export function applyFiltersAndSort(records: DatabaseRecord[], filters: FilterRule[], sorts: SortRule[]): DatabaseRecord[] {
  let out = records.filter((r) => filters.every((f) => recordMatchesFilter(r, f)));
  if (sorts.length) {
    out = [...out].sort((a, b) => {
      for (const s of sorts) {
        const av = a.values[s.propertyId];
        const bv = b.values[s.propertyId];
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      }
      return a.position - b.position;
    });
  } else {
    out = [...out].sort((a, b) => a.position - b.position);
  }
  return out;
}

export function midPositionDb(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1000;
  if (prev === null) return (next as number) - 1000;
  if (next === null) return prev + 1000;
  return (prev + next) / 2;
}

// ============================================================================
// Fetch helpers (client)
// ============================================================================

// وقتی یه بلاک تازه‌ساخته‌شده فورا به نوع "database" تبدیل بشه، ممکنه
// اتوسیو دیبانس‌شده‌ی خود بلاک (۷۰۰ms) هنوز روی سرور ننشسته باشه — این
// درخواست تا چندبار با فاصله‌ی کوتاه retry می‌کنه تا اون race رد بشه، به‌جای
// اینکه ساخت دیتابیس با یه 404 زودهنگام شکست بخوره
export async function createDatabaseForBlock(blockId: string): Promise<NotepadDatabaseFull | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`/api/notepad/databases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.database || null;
    }
    if (res.status !== 404) return null;
    await new Promise((r) => setTimeout(r, 350));
  }
  return null;
}

export async function fetchDatabase(databaseId: string): Promise<NotepadDatabaseFull | null> {
  const res = await fetch(`/api/notepad/databases/${databaseId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.database || null;
}

export async function updateDatabaseMeta(databaseId: string, patch: Partial<NotepadDatabaseMeta>): Promise<boolean> {
  const res = await fetch(`/api/notepad/databases/${databaseId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function createProperty(databaseId: string, input: { name: string; type: PropertyType; position: number }): Promise<DatabaseProperty | null> {
  const res = await fetch(`/api/notepad/databases/${databaseId}/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.property || null;
}

export async function updateProperty(databaseId: string, propertyId: string, patch: Partial<Pick<DatabaseProperty, "name" | "options" | "position">>): Promise<boolean> {
  const res = await fetch(`/api/notepad/databases/${databaseId}/properties/${propertyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function deleteProperty(databaseId: string, propertyId: string): Promise<boolean> {
  const res = await fetch(`/api/notepad/databases/${databaseId}/properties/${propertyId}`, { method: "DELETE" });
  return res.ok;
}

export async function createRecord(databaseId: string, position: number): Promise<DatabaseRecord | null> {
  const res = await fetch(`/api/notepad/databases/${databaseId}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.record || null;
}

export async function updateRecord(databaseId: string, recordId: string, patch: { values?: Record<string, RecordValue>; position?: number }): Promise<boolean> {
  const res = await fetch(`/api/notepad/databases/${databaseId}/records/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function deleteRecord(databaseId: string, recordId: string): Promise<boolean> {
  const res = await fetch(`/api/notepad/databases/${databaseId}/records/${recordId}`, { method: "DELETE" });
  return res.ok;
}
