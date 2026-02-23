import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/audit — list audit events
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const action = searchParams.get("action");
        const source = searchParams.get("source");

        const where: Record<string, unknown> = { orgId: DEFAULT_ORG_ID };
        if (action) where.action = action.toUpperCase();
        if (source) where.source = source;

        const [events, total] = await Promise.all([
            prisma.auditEvent.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.auditEvent.count({ where }),
        ]);

        return NextResponse.json({
            events,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Audit error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
