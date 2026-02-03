import { NextResponse } from "next/server";
import { AIService } from "@/lib/ai-service";
import { SentryService } from "@/lib/sentry-service";
import { verifyAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
    try {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.isAdmin) {
            return NextResponse.json({ success: false, message: adminCheck.error }, { status: 403 });
        }

        const body = await req.json();
        const { issueId, title, metadata } = body;

        if (!issueId && (!title || !metadata)) {
            return NextResponse.json({ success: false, message: "Missing data" }, { status: 400 });
        }

        let finalTitle = title;
        let finalMetadata = metadata;

        // If only issueId is provided, fetch details first
        if (issueId && !title) {
            const details = await SentryService.getIssueDetails(issueId);
            if (!details) throw new Error("Issue not found");
            finalTitle = details.title;
            finalMetadata = details.metadata;
        }

        const explanation = await AIService.explainError(finalTitle, finalMetadata);

        return NextResponse.json({
            success: true,
            explanation
        });
    } catch (error: any) {
        console.error("Explain Error API Error:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to explain error"
        }, { status: 500 });
    }
}
