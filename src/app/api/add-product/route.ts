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
    let productData: any = {};
    let targetCollection = "products";
    const body = await request.json();
    const { url, userId, collection: userCategory } = body;

    if (!url || !userId) {
        return NextResponse.json(
            { success: false, error: "URL and userId are required" },
            { status: 400, headers: corsHeaders() }
        );
    }

    try {
        // 1. Try Scrape
        const scraped = await scrapeProduct(url);

        // Check if scraping was actually successful
        if (scraped.error || (!scraped.title && !scraped.price)) {
            throw new Error("Scraping returned incomplete data");
        }

        // Success Case
        targetCollection = "products";
        productData = {
            url: url,
            title: scraped.title,
            price: scraped.price,
            image: scraped.image,
            currency: scraped.currency,
            inStock: scraped.inStock,
            source: scraped.source || new URL(url).hostname.replace('www.', ''),
            status: 'active',
            isScrapeFailed: false,
            userId: userId, // Ensure userId IS saved
            collection: userCategory || 'Uncategorized'
        };

    } catch (scrapeError) {
        console.warn("Scraping failed, switching to failed_products collection:", scrapeError);

        // Failure Case
        targetCollection = "failed_products";
        productData = {
            url: url,
            title: "Hatalı Link (Düzenle)",
            price: 0, // Keeping numeric for consistency, though user prompt implies flexibility, numeric is safer for DB
            image: "https://placehold.co/600x600?text=Manual+Edit",
            inStock: true, // Defaulting to true for fallback products
            error: true, // As requested
            isScrapeFailed: true, // Keeping for backward compatibility/clarity
            source: new URL(url).hostname.replace('www.', ''),
            status: 'needs_review',
            userId: userId
        };
    }

    try {
        // 3. Save to appropriate Firestore collection
        const docRef = await addDoc(collection(db, targetCollection), {
            ...productData,
            createdAt: serverTimestamp()
        });

        // 4. Return Success with Collection Info
        return NextResponse.json(
            {
                success: true,
                data: {
                    id: docRef.id,
                    collection: targetCollection,
                    ...productData
                }
            },
            { status: 200, headers: corsHeaders() }
        );

    } catch (dbError: any) {
        console.error("Firestore Save Error:", dbError);
        return NextResponse.json(
            { success: false, error: "Database save failed" },
            { status: 500, headers: corsHeaders() }
        );
    }
}
