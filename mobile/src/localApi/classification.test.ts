// گاردِ طبقه‌بندی (PORT_PLAN §7): هر لیترالِ `/api/...` در کدِ وبی که اپ واقعا
// باندل می‌کنه باید در localApi/router.ts طبقه‌بندی شده باشه.
//
// «کدی که اپ باندل می‌کنه» = گرافِ importِ (غیرِ type-only، شاملِ import())
// از mobile/src/main.tsx + همه‌ی صفحه‌ها/layoutهای روت‌شده (همون globِ
// shell/routes.tsx)، با همون aliasها (`@/` ریشه، `@m/` mobile/src)، منهای
// ماژول‌های سرور-فقط (serverOnlyGuard) و ماژول‌هایی که با shim عوض می‌شن
// (webModuleRedirects). فقط فایل‌های *وب* (بیرونِ mobile/) اسکن می‌شن — کدِ خودِ
// اپ با ApiClient به VITE_API_BASE_URL می‌ره، نه fetch("/api/…").
// لیترال‌ها با TypeScript AST استخراج می‌شن (کامنت‌ها خودبه‌خود بیرون‌اند)؛
// `${…}` ← یک سگمنتِ پارامتر.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { SERVER_ONLY_FILES } from "../../tooling/webCompat";
import { classificationCounts, isClassifiedPath, matchRoute, ROUTES } from "./router";
import { EXCLUDED_ROUTE_PREFIXES } from "@m/shell/routes";

const MOBILE_SRC = path.resolve(__dirname, "..");
const MOBILE = path.resolve(MOBILE_SRC, "..");
const REPO = path.resolve(MOBILE, "..");
const EXTS = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];
/** وبی که در اپ با shim عوض می‌شه (vite.config.ts ← webModuleRedirects) */
const REDIRECTED = new Set(["lib/pushClient"].map((f) => path.join(REPO, f)));
const SERVER_ONLY = new Set(SERVER_ONLY_FILES.map((f) => path.join(REPO, f)));

function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@m/")) base = path.join(MOBILE_SRC, spec.slice(3));
  else if (spec.startsWith("@/")) base = path.join(REPO, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null; // bare (node_modules / shimهای next/*)
  if (/\.(css|json|svg|png|webp)$/.test(base)) return null;
  const noExt = base.replace(/\.(tsx?|jsx?|mjs)$/, "");
  if (REDIRECTED.has(noExt) || SERVER_ONLY.has(noExt)) return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXTS) if (fs.existsSync(noExt + e)) return noExt + e;
  return null;
}

type Scan = { imports: string[]; literals: string[] };

function scanFile(file: string): Scan {
  const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports: string[] = [];
  const literals: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && !n.importClause?.isTypeOnly && ts.isStringLiteral(n.moduleSpecifier)) {
      // `import { type A, type B }` ← فقط تایپ
      const named = n.importClause?.namedBindings;
      const allTypes = !!named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly) && !n.importClause?.name;
      if (!allTypes) imports.push(n.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(n) && !n.isTypeOnly && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      imports.push(n.moduleSpecifier.text);
    } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
      imports.push(n.arguments[0].text);
    }
    let text: string | null = null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) text = n.text;
    else if (ts.isTemplateExpression(n)) text = n.head.text + n.templateSpans.map((s) => ":p" + s.literal.text).join("");
    if (text !== null && text.startsWith("/api/") && !(n.parent && (ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent)))) {
      literals.push(text);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  return { imports, literals };
}

/** "/api/x/:p?y=1" ← "/api/x/:p"؛ اسلشِ پایانی (پیشوندِ الحاقی) ← یک سگمنتِ پارامتر */
export function normalizeLiteral(lit: string): string {
  let p = lit.split(/[?#\s]/)[0];
  if (p.endsWith("/")) p += ":p";
  return p;
}

function routedEntryFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "page.tsx" || (e.name === "layout.tsx" && path.dirname(full) !== path.join(REPO, "app"))) {
        const route = "/" + path.relative(path.join(REPO, "app"), path.dirname(full)).split(path.sep).join("/");
        if (EXCLUDED_ROUTE_PREFIXES.some((p) => route === p || route.startsWith(p + "/"))) continue;
        if (route === "/report" || route.startsWith("/report/")) continue; // redirectهای REDIRECTS
        out.push(full);
      }
    }
  };
  walk(path.join(REPO, "app"));
  out.push(path.join(REPO, "app/not-found.tsx"));
  return out;
}

function collect(): { files: Set<string>; literals: Map<string, string[]> } {
  const files = new Set<string>();
  const literals = new Map<string, string[]>();
  const queue = [path.join(MOBILE_SRC, "main.tsx"), ...routedEntryFiles()];
  while (queue.length) {
    const f = queue.pop()!;
    if (files.has(f)) continue;
    files.add(f);
    const { imports, literals: lits } = scanFile(f);
    const isWeb = !f.startsWith(MOBILE + path.sep);
    if (isWeb) {
      for (const l of lits) {
        const key = normalizeLiteral(l);
        literals.set(key, [...(literals.get(key) ?? []), path.relative(REPO, f)]);
      }
    }
    for (const spec of imports) {
      const r = resolveSpec(spec, f);
      if (r && !files.has(r) && !/\.test\.tsx?$/.test(r)) queue.push(r);
    }
  }
  return { files, literals };
}

describe("localApi classification guard", () => {
  const { files, literals } = collect();

  it("walks a realistic graph (routed pages, components, lib/storage)", () => {
    const rel = [...files].map((f) => path.relative(REPO, f));
    expect(rel).toContain("lib/storage.ts");
    expect(rel).toContain("app/weekly/page.tsx");
    expect(rel).toContain("components/RoutineAiFab.tsx");
    expect(rel).not.toContain("lib/prisma.ts");
    expect(rel.some((f) => f.startsWith("app/admin/"))).toBe(false);
    expect(literals.size).toBeGreaterThan(40);
  });

  it("every /api/ literal reachable from the app is classified in router.ts", () => {
    const missing = [...literals.entries()].filter(([p]) => !isClassifiedPath(p)).map(([p, from]) => `${p}  ←  ${[...new Set(from)].join(", ")}`);
    expect(missing, `unclassified /api/ literals (add them to localApi/router.ts):\n${missing.join("\n")}`).toEqual([]);
  });

  it("every route pattern points to a real web route handler (no typos / stale entries)", () => {
    const stale: string[] = [];
    const exists = (dir: string, segs: string[]): boolean => {
      if (!segs.length) return fs.existsSync(path.join(dir, "route.ts"));
      const [head, ...rest] = segs;
      if (!head.startsWith(":")) return fs.existsSync(path.join(dir, head)) && exists(path.join(dir, head), rest);
      if (!fs.existsSync(dir)) return false;
      return fs.readdirSync(dir).some((d) => /^\[[^.].*\]$/.test(d) && exists(path.join(dir, d), rest));
    };
    for (const r of ROUTES) {
      if (r.pattern === "/api/auth/session") continue; // next-auth catch-all ([...nextauth])
      if (!exists(path.join(REPO, "app"), r.pattern.split("/").filter(Boolean))) stale.push(r.pattern);
    }
    expect(stale).toEqual([]);
  });

  it("LOCAL routes have handlers; only LOCAL routes do", () => {
    for (const r of ROUTES) expect(!!r.handler, r.pattern).toBe(r.cls === "LOCAL");
  });

  it("phase-1b handlers are LOCAL, account/plans CACHED, assistant ONLINE+barrier, bootstrap NA", () => {
    const cls = (m: string, p: string) => matchRoute(m, p)?.route;
    for (const [m, p] of [
      ["GET", "/api/tasks/daily"],
      ["POST", "/api/tasks/daily"],
      ["GET", "/api/tasks/daily/range"],
      ["GET", "/api/tasks/daily/keys"],
      ["GET", "/api/settings/theme"],
      ["POST", "/api/settings/medications"],
      ["GET", "/api/exercise/schedule"],
      ["POST", "/api/auth/2fa/start"],
    ]) expect(cls(m, p)?.cls, `${m} ${p}`).toBe("LOCAL");
    for (const p of ["/api/account", "/api/account/avatar", "/api/plans"]) expect(cls("GET", p)?.cls).toBe("CACHED");
    expect(cls("PATCH", "/api/account")?.cls).toBe("ONLINE");
    expect(cls("POST", "/api/routine/assistant")).toMatchObject({ cls: "ONLINE", barrier: true, ai: true });
    expect(cls("GET", "/api/friends")?.cls).toBe("ONLINE");
    expect(cls("DELETE", "/api/friends/abc")?.cls).toBe("ONLINE");
    expect(cls("POST", "/api/auth/signup")).toMatchObject({ cls: "ONLINE", public: true });
    expect(cls("GET", "/api/bootstrap")?.cls).toBe("NA");
    expect(cls("GET", "/api/exercise/schedule")?.module).toBe("EXERCISE");
  });

  it("reports the classification counts", () => {
    const c = classificationCounts();
    // eslint-disable-next-line no-console
    console.info(`[localApi] routes: ${JSON.stringify(c)}; distinct web /api/ literals: ${literals.size}`);
    expect(c.LOCAL).toBeGreaterThanOrEqual(8);
  });

  it("main.tsx installs the interceptor and never runs the web preload", () => {
    const main = fs.readFileSync(path.join(MOBILE_SRC, "main.tsx"), "utf8");
    const root = fs.readFileSync(path.join(MOBILE_SRC, "shell/AppRoot.tsx"), "utf8");
    expect(main).toMatch(/installLocalApi\(\)/);
    expect(main.indexOf("installLocalApi()")).toBeLessThan(main.indexOf(".render("));
    for (const code of [main, root]) {
      // فقط importها (کامنت‌ها عمدا اسمشون رو می‌برن)
      expect(code).not.toMatch(/import[^;]*\b(PRELOAD_SCRIPT|InlineBootstrap|PwaProvider)\b[^;]*;/);
    }
  });
});
