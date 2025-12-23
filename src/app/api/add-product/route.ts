import { NextResponse } from "next/server";
import { processProduct } from "@/lib/product-processor";

// CORS Headers helper
function getCorsHeaders(origin: string | null) {
    // Explicitly allow chrome-extension origin or favduck.com
    const allowedOrigins = [
        "https://favduck.com",
        "https://miayis-tracker.vercel.app",
        "http://localhost:3000"
    ];

    // Check if origin is a chrome extension or in allowed list
    const isAllowed = origin && (origin.startsWith("chrome-extension://") || allowedOrigins.includes(origin));

    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    };
}

// Handle OPTIONS for Preflight
export async function OPTIONS(request: Request) {
    const origin = request.headers.get("origin");
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin)
    });
}

// Handle POST
export async function POST(request: Request) {
    const origin = request.headers.get("origin");
    const headers = getCorsHeaders(origin);

    try {
        const body = await request.json();
        const { url, userId, collection: userCategory } = body;

        if (!url || !userId) {
            return NextResponse.json(
                { success: false, error: "URL and userId are required" },
                { status: 400, headers }
            );
        }

        // Direct processing (No QStash)
        const result = await processProduct({
            url,
            userId,
            collectionName: userCategory
        });

        return NextResponse.json(
            {
                success: true,
                message: "Product processed successfully",
                data: result
            },
            { status: 200, headers }
        );

    } catch (error) {
        console.error("Product Processing Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to process product" },
            { status: 500, headers }
        );
    }
}

export const maxDuration = 60;
