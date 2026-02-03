import { NextResponse } from "next/server";
import { scrapeProduct } from "@/lib/scraper";
import * as Sentry from "@sentry/nextjs";

// Increase max duration for Pro hobby/pro plans (Hobby is capped at 10s, Pro at 60s+)
export const maxDuration = 60;

export async function POST(request: Request) {
    let url = "";

    try {
        const json = await request.json();
        url = json.url;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Use the shared, robust scraper function
        const data = await scrapeProduct(url);

        return NextResponse.json({
            ...data,
            url
        });

    } catch (error: any) {
        console.warn(`API Scraping failed for ${url}:`, error.message);

        // Ensure accurate Sentry reporting for API-level failures
        Sentry.captureException(error);

        return NextResponse.json({
            title: "",
            image: "",
            price: 0,
            currency: "TRY",
            url: url,
            source: "manual",
            error: error.message
        });
    } finally {
        // Force flush Sentry events before the serverless function dies
        await Sentry.flush(2000);
    }
}
