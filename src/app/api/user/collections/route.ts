import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

function getCorsHeaders(origin: string | null) {
    const allowedOrigins = [
        "https://favduck.com",
        "https://miayis-tracker.vercel.app",
        "http://localhost:3000"
    ];
    const isAllowed = origin && (origin.startsWith("chrome-extension://") || allowedOrigins.includes(origin));

    return {
        "Access-Control-Allow-Origin": isAllowed ? origin : "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    };
}

export async function OPTIONS(request: Request) {
    const origin = request.headers.get("origin");
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin)
    });
}

export async function GET(request: Request) {
    const origin = request.headers.get("origin");
    const headers = getCorsHeaders(origin);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json(
            { success: false, error: "userId is required" },
            { status: 400, headers }
        );
    }

    try {
        if (!adminDb) {
            throw new Error("Admin SDK not initialized");
        }

        const querySnapshot = await adminDb
            .collection("collection_settings")
            .where("userId", "==", userId)
            .get();

        const collections = querySnapshot.docs.map(doc => doc.data().name);

        return NextResponse.json(
            { success: true, collections },
            { status: 200, headers }
        );
    } catch (error) {
        console.error("Fetch Collections Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch collections" },
            { status: 500, headers }
        );
    }
}
