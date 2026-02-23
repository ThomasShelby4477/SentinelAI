import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/policies
export async function GET() {
    const policies = await prisma.policy.findMany({
        where: { orgId: DEFAULT_ORG_ID },
        orderBy: { priority: "asc" },
    });
    return NextResponse.json(policies);
}

// POST /api/policies
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const policy = await prisma.policy.create({
            data: {
                orgId: DEFAULT_ORG_ID,
                name: body.name,
                description: body.description || null,
                isActive: body.is_active ?? true,
                priority: body.priority ?? 100,
                conditions: body.conditions || {},
                action: body.action || "BLOCK",
                appliesTo: body.applies_to || { all: true },
                destinations: body.destinations || { all: true },
            },
        });
        return NextResponse.json(policy, { status: 201 });
    } catch (error) {
        console.error("Policy creation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
