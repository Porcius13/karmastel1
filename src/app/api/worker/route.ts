import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { scrapeProduct } from "@/lib/scraper";
import * as Sentry from "@sentry/nextjs";

async function handler(request: Request) {
    const body = await request.json();
    const { url, userId, collection: userCategory } = body;

    console.log("Worker received job:", { url, userId });

    if (!url || !userId) {
        return NextResponse.json({ error: "Missing url or userId" }, { status: 400 });
    }

    let productData: any = {};
    let targetCollection = "products";

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
            userId: userId,
            collection: userCategory || 'Uncategorized'
        };

    } catch (scrapeError) {
        console.warn("Worker: Scraping failed, switching to failed_products details:", scrapeError);

        Sentry.captureException(scrapeError, {
            tags: {
                worker: "product-scraper",
                url: url
            }
        });

        // Failure Case
        targetCollection = "failed_products";
        productData = {
            url: url,
            title: "Hatalı Link (Düzenle)",
            price: 0,
            image: "https://placehold.co/600x600?text=Manual+Edit",
            inStock: true,
            error: true,
            isScrapeFailed: true,
            source: new URL(url).hostname.replace('www.', ''),
            status: 'needs_review',
            userId: userId
        };
    }

    try {
        // 3. Save to appropriate Firestore collection
        await addDoc(collection(db, targetCollection), {
            ...productData,
            createdAt: serverTimestamp()
        });

        console.log(`Worker: Saved to ${targetCollection}`);
        return NextResponse.json({ success: true, collection: targetCollection });

    } catch (dbError: any) {
        console.error("Worker: Firestore Save Error:", dbError);
        Sentry.captureException(dbError, {
            tags: {
                worker: "product-scraper",
                action: "firestore-save"
            }
        });
        return NextResponse.json({ error: "Database save failed" }, { status: 500 });
    }
}

export const POST = verifySignatureAppRouter(handler);
