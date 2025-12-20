import { NextResponse } from "next/server";
import { processProduct } from "@/lib/product-processor";

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
    const body = await request.json();
    const { url, userId, collection: userCategory } = body;

    if (!url || !userId) {
        return NextResponse.json(
            { success: false, error: "URL and userId are required" },
            { status: 400, headers: corsHeaders() }
        );
    }

    try {
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
            { status: 200, headers: corsHeaders() }
        );

    } catch (error) {
        console.error("Product Processing Error:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to process product" },
            { status: 500, headers: corsHeaders() }
        );
    }
}

export const maxDuration = 60;
