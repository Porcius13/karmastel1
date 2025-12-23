import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json(
            { success: false, error: "userId is required" },
            { status: 400, headers: corsHeaders() }
        );
    }

    try {
        const q = query(
            collection(db, "collection_settings"),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const collections = querySnapshot.docs.map(doc => doc.data().name);

        return NextResponse.json(
            { success: true, collections },
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        console.error("Fetch Collections Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch collections" },
            { status: 500, headers: corsHeaders() }
        );
    }
}
