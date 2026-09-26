import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrismaShim } from "./prismaShim.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.resolve(here, "../../prisma/schema.prisma"), "utf8");
const out = path.resolve(here, "../src/shims/prisma-client.ts");
fs.writeFileSync(out, generatePrismaShim(schema));
console.log(`wrote ${path.relative(process.cwd(), out)}`);
