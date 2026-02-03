import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        throw new Error("Sentry Test Error: Manual Verification via API Route");
    } catch (e) {
        Sentry.captureException(e);

        // Force flush to ensure it sends immediately
        await Sentry.flush(2000);

        const clientDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
        const serverDsn = process.env.SENTRY_DSN;

        console.log("Debug: SDK DSN availability check:");
        console.log("- Client DSN (Public):", clientDsn ? "Present" : "MISSING");
        console.log("- Server DSN (Secret):", serverDsn ? "Present" : "MISSING");
        console.log("- Sentry Initialized:", Sentry.isInitialized());

        return NextResponse.json({
            success: true,
            message: "Error captured and flushed to Sentry.",
            diagnostics: {
                client_dsn_present: !!clientDsn,
                server_dsn_present: !!serverDsn,
                sentry_sdk_initialized: Sentry.isInitialized(),
                runtime: process.env.NEXT_RUNTIME || "nodejs",
                environment: process.env.NODE_ENV
            }
        });
    }
}
