import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { scrapeProduct } from "@/lib/scraper";

// CORS Headers helper
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*", // Allow all for dev
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

// Handle OPTIONS for Preflight
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

// Handle POST
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { success: false, error: "URL is required" },
                { status: 400, headers: corsHeaders() }
            );
        }

        // 1. Scrape
        const data = await scrapeProduct(url);

        if (data.error || (!data.title && !data.price)) {
            return NextResponse.json(
                { success: false, error: data.error || "Failed to scrape product" },
                { status: 422, headers: corsHeaders() }
            );
        }

        // 2. Save to Firestore
        const docRef = await addDoc(collection(db, "products"), {
            url: url,
            title: data.title,
            price: data.price,
            image: data.image,
            currency: data.currency,
            source: data.source,
            status: 'active',
            createdAt: serverTimestamp()
        });

        // 3. Return Success
        return NextResponse.json(
            {
                success: true,
                data: { id: docRef.id, ...data }
            },
            { status: 200, headers: corsHeaders() }
        );

    } catch (error: any) {
        console.error("API Add Product Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders() }
        );
    }
}
