// پلاگین‌های Vite برای کامپایلِ مستقیمِ کدِ وب (app/ components/ lib/ ریشه)
// داخلِ اپ موبایل — ببین mobile/PORT_PLAN.md → «Architecture decisions».
//
// • serverOnlyGuard: هر ماژولِ سرور-فقط (lib/prisma، lib/auth، next/server، …)
//   که از گرافِ کلاینت برسه، بیلدِ production رو با زنجیره‌ی importer می‌شکنه.
//   در dev فقط هشدار می‌ده و stubِ پرتاب‌کننده برمی‌گردونه تا صفحه لود بشه.
// • webModuleRedirects: جایگزینیِ *مسیرِ نهایی* (نه فقط aliasِ `@/…`) — چون
//   کدِ وب این ماژول‌ها رو نسبی هم import می‌کنه (`./pushClient`).
// • webPublicImages: فقط ../public/images زیرِ /images سرو/کپی می‌شه؛
//   هیچ‌وقت sw.js یا بقیه‌ی public وب (اپ نباید سرویس‌ورکر ثبت کنه).
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const norm = (p: string) => p.split(path.sep).join("/");

export type WebCompatOptions = {
  /** ریشه‌ی ریپو (پدرِ mobile/) */
  repoRoot: string;
  /** پوشه‌ی shimها (mobile/src/shims) */
  shimsDir: string;
};

/** ماژول‌های سرور-فقطی که با مسیرِ فایل شناسایی می‌شن (نسبت به ریشه‌ی ریپو، بدونِ پسوند) */
export const SERVER_ONLY_FILES = ["lib/prisma", "lib/auth", "lib/requestAuth", "lib/requireAdmin", "lib/mobileAuth", "lib/moduleAccess"];

/** specifierهای bare که هرگز نباید به باندلِ کلاینت برسن */
export const SERVER_ONLY_BARE = [
  /^next\/server$/,
  /^next\/headers$/,
  /^next\/font(\/.*)?$/,
  /^next-auth\/jwt$/,
  /^next-auth\/providers(\/.*)?$/,
  /^bcryptjs$/,
  /^nodemailer$/,
  /^web-push$/,
  /^sharp$/,
  /^crypto$/,
  /^node:/,
  /^fs$/,
  /^path$/,
  /^os$/,
  /^child_process$/,
];

function stripExt(p: string): string {
  return p.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
}

export function serverOnlyGuard({ repoRoot, shimsDir }: WebCompatOptions): Plugin {
  const root = norm(repoRoot);
  const stub = norm(path.join(shimsDir, "serverOnlyStub.ts"));
  const serverFiles = new Set(SERVER_ONLY_FILES.map((f) => `${root}/${f}`));
  let isBuild = false;
  const violations: string[] = [];

  function record(what: string, importer: string | undefined) {
    const from = importer ? norm(path.relative(repoRoot, importer)) : "?";
    const msg = `${what}  ←  ${from}`;
    if (!violations.includes(msg)) violations.push(msg);
    if (!isBuild) console.warn(`[server-only-guard] ${msg}`);
  }

  return {
    name: "arion:server-only-guard",
    enforce: "pre",
    configResolved(c: ResolvedConfig) {
      // vitest هم command=serve داره؛ فقط بیلدِ واقعی سخت‌گیره
      isBuild = c.command === "build";
    },
    async resolveId(source, importer, opts) {
      if (SERVER_ONLY_BARE.some((re) => re.test(source))) {
        record(source, importer);
        return stub;
      }
      if (!importer || source.startsWith("\0")) return null;
      const resolved = await this.resolve(source, importer, { ...opts, skipSelf: true });
      if (!resolved) return null;
      const id = stripExt(norm(resolved.id.split("?")[0]));
      if (serverFiles.has(id)) {
        record(norm(path.relative(repoRoot, resolved.id)), importer);
        return stub;
      }
      return null;
    },
    buildEnd(err) {
      if (err || !isBuild || violations.length === 0) return;
      this.error(
        `server-only modules reached the client bundle:\n  ${violations.join("\n  ")}\n` +
          `Split the pure part into its own file (see lib/weeklyReport/domains.ts) instead of importing server code.`
      );
    },
  };
}

/** مسیرِ نهاییِ فایلِ وب → shimِ موبایل (هم `@/lib/x` هم `./x` رو می‌گیره) */
export function webModuleRedirects({ repoRoot, shimsDir }: WebCompatOptions, map: Record<string, string>): Plugin {
  const root = norm(repoRoot);
  const table = new Map(Object.entries(map).map(([from, to]) => [`${root}/${from}`, norm(path.join(shimsDir, to))]));
  return {
    name: "arion:web-module-redirects",
    enforce: "pre",
    async resolveId(source, importer, opts) {
      if (!importer || source.startsWith("\0")) return null;
      // خودِ shim اجازه داره نسخه‌ی اصلی رو (مثلا برای re-export) import کنه
      if (norm(importer).startsWith(norm(shimsDir))) return null;
      const resolved = await this.resolve(source, importer, { ...opts, skipSelf: true });
      if (!resolved) return null;
      return table.get(stripExt(norm(resolved.id.split("?")[0]))) ?? null;
    },
  };
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

/** /images/* از ../public/images (dev + preview) و کپی به dist/images در بیلد */
export function webPublicImages({ repoRoot }: Pick<WebCompatOptions, "repoRoot">): Plugin {
  const srcDir = path.join(repoRoot, "public", "images");
  let outDir = "dist";
  const serve = (req: { url?: string }, res: import("http").ServerResponse, next: () => void) => {
    const url = (req.url ?? "").split("?")[0];
    if (!url.startsWith("/images/")) return next();
    const rel = decodeURIComponent(url.slice("/images/".length));
    const file = path.join(srcDir, rel);
    if (!file.startsWith(srcDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
    res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: "arion:web-public-images",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    writeBundle() {
      fs.cpSync(srcDir, path.join(outDir, "images"), { recursive: true });
    },
  };
}
