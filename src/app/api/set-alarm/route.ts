import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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
        const { productId, productUrl, email, userId } = body;

        if (!productId || !productUrl || !email || !userId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (productId, productUrl, email, userId)" },
                { status: 400, headers: corsHeaders() }
            );
        }

        if (!adminDb) {
            console.error("Firebase Admin DB not initialized");
            return NextResponse.json(
                { success: false, error: "Server Configuration Error" },
                { status: 500, headers: corsHeaders() }
            );
        }

        // Save to Firestore using Admin SDK
        const docRef = await adminDb.collection("stock_alerts").add({
            productId,
            productUrl,
            email,
            userId,
            status: "pending",
            createdAt: new Date() // Admin SDK handles dates natively or use Timestamp
        });

        return NextResponse.json(
            { success: true, id: docRef.id },
            { status: 200, headers: corsHeaders() }
        );

    } catch (error: any) {
        console.error("Error setting alarm:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500, headers: corsHeaders() }
        );
    }
}
