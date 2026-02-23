import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Prevent Prisma from trying to connect to the DB during the Next.js build phase
const isBuildPhase = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

export const prisma =
    globalForPrisma.prisma ||
    (isBuildPhase
        ? ({} as PrismaClient)
        : new PrismaClient({ log: ["warn", "error"] }));

if (process.env.NODE_ENV !== "production" && !isBuildPhase) {
    globalForPrisma.prisma = prisma;
}
