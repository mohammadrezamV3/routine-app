import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generatePrismaShim, parseEnums } from "../../tooling/prismaShim.mjs";
import { ModuleKey, Prisma } from "./prisma-client";

const schema = fs.readFileSync(path.resolve(__dirname, "../../../prisma/schema.prisma"), "utf8");

describe("@prisma/client shim", () => {
  it("is in sync with prisma/schema.prisma (run `npm run gen:prisma-shim`)", () => {
    const committed = fs.readFileSync(path.resolve(__dirname, "prisma-client.ts"), "utf8");
    expect(committed).toBe(generatePrismaShim(schema));
  });

  it("exposes enums as value objects like the generated client", () => {
    expect(ModuleKey.TRADE).toBe("TRADE");
    const mk = parseEnums(schema).find((e) => e.name === "ModuleKey")!;
    expect(Object.keys(ModuleKey)).toEqual(mk.values);
    expect(Prisma.JsonNull).not.toBe(Prisma.DbNull);
  });
});
