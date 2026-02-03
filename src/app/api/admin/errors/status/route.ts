import { NextResponse } from "next/server";
import { SentryDBService } from "@/lib/sentry-db";
import { verifyAdmin } from "@/lib/admin-auth";

export async function POST(req: Request) {
    try {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.isAdmin) {
            return NextResponse.json({ success: false, message: adminCheck.error }, { status: 403 });
        }

        const { issueId, status } = await req.json();

        if (!issueId || !status) {
            return NextResponse.json({ success: false, message: "Missing issueId or status" }, { status: 400 });
        }

        await SentryDBService.updateStatus(issueId, status);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update Status API Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
