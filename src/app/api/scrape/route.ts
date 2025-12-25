import { NextResponse } from "next/server";
import { scrapeProduct } from "@/lib/scraper";

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
        return NextResponse.json({
            title: "",
            image: "",
            price: 0,
            currency: "TRY",
            url: url,
            source: "manual",
            error: error.message
        });
    }
}
