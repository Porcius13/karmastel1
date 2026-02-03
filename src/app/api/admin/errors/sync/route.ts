import { NextResponse } from "next/server";
import { SentryService } from "@/lib/sentry-service";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
    try {
        const adminCheck = await verifyAdmin(req);
        if (!adminCheck.isAdmin) {
            // Check for CRON_SECRET if it's an automated call
            const authHeader = req.headers.get("Authorization");
            if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                return NextResponse.json({ success: false, message: adminCheck.error || "Unauthorized" }, { status: 401 });
            }
        }

        const result = await SentryService.syncWithFirestore();

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sync API Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
