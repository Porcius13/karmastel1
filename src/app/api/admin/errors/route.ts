import { NextResponse } from "next/server";
import { SentryDBService } from "@/lib/sentry-db";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.isAdmin) {
            return NextResponse.json({ success: false, message: adminCheck.error }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") as any;

        const issues = await SentryDBService.getIssues(status);

        return NextResponse.json({
            success: true,
            issues
        });
    } catch (error: any) {
        console.error("Fetch Errors API Error:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to fetch errors"
        }, { status: 500 });
    }
}
