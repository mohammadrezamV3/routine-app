// گاردِ rollup: ماژولِ سرور-فقط در گرافِ کلاینت ← بیلد با زنجیره‌ی importer می‌شکنه
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serverOnlyGuard } from "../../tooling/webCompat";

const repoRoot = path.resolve(__dirname, "../../..");
const shimsDir = path.resolve(__dirname);

function setup(command: "build" | "serve") {
  const plugin = serverOnlyGuard({ repoRoot, shimsDir }) as any;
  plugin.configResolved({ command });
  const errors: string[] = [];
  const ctx = {
    resolve: async (source: string) => ({ id: path.resolve(repoRoot, source.replace(/^@\//, "")) + ".ts" }),
    error: (msg: string) => {
      errors.push(msg);
      throw new Error(msg);
    },
  };
  return { plugin, ctx, errors };
}

describe("server-only guard", () => {
  it("fails the production build listing each leak with its importer", async () => {
    const { plugin, ctx } = setup("build");
    const importer = path.join(repoRoot, "components/Foo.tsx");
    expect(await plugin.resolveId.call(ctx, "next/server", importer, {})).toMatch(/serverOnlyStub\.ts$/);
    expect(await plugin.resolveId.call(ctx, "@/lib/prisma", importer, {})).toMatch(/serverOnlyStub\.ts$/);
    expect(await plugin.resolveId.call(ctx, "@/lib/jalali", importer, {})).toBeNull();
    expect(() => plugin.buildEnd.call(ctx)).toThrow(/next\/server {2}← {2}components\/Foo\.tsx[\s\S]*lib\/prisma\.ts {2}← {2}components\/Foo\.tsx/);
  });

  it("only warns in dev/test", async () => {
    const { plugin, ctx } = setup("serve");
    const warn = console.warn;
    console.warn = () => {};
    try {
      await plugin.resolveId.call(ctx, "bcryptjs", path.join(repoRoot, "lib/x.ts"), {});
    } finally {
      console.warn = warn;
    }
    expect(() => plugin.buildEnd.call(ctx)).not.toThrow();
  });
});
