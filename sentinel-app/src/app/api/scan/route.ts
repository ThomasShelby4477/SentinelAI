import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/detection/pipeline";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { source, destination, prompt, user_id, metadata } = body;

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "prompt is required" }, { status: 400 });
        }

        // Run detection pipeline
        const result = await runPipeline(prompt);

        // Ensure default org exists
        const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
        await prisma.organization.upsert({
            where: { id: DEFAULT_ORG_ID },
            update: {},
            create: { id: DEFAULT_ORG_ID, name: "Default Organization", domain: "localhost" },
        });

        // Log audit event
        await prisma.auditEvent.create({
            data: {
                orgId: DEFAULT_ORG_ID,
                userId: user_id || null,
                source: source || "api",
                destination: destination || null,
                action: result.action,
                riskScore: result.riskScore,
                detections: result.detections as object[],
                promptHash: result.promptHash,
                promptSnippet: prompt.substring(0, 200),
                sessionId: metadata?.session_id || null,
                ipAddress: request.headers.get("x-forwarded-for") || null,
                latencyMs: result.latencyMs,
            },
        });

        return NextResponse.json({
            request_id: crypto.randomUUID(),
            action: result.action,
            risk_score: result.riskScore,
            detections: result.detections,
            latency_ms: result.latencyMs,
            message: result.message,
        });
    } catch (error) {
        console.error("Scan error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// CORS headers for browser extension
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
