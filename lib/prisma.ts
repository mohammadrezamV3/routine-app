import { PrismaClient } from "@prisma/client";

// جلوگیری از ساخت چندباره PrismaClient در حالت dev به‌خاطر hot-reload نکست
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
