import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { scrapeProduct } from "@/lib/scraper";
import * as Sentry from "@sentry/nextjs";

interface ProcessProductParams {
    url: string;
    userId: string;
    collectionName?: string;
}

export async function processProduct({ url, userId, collectionName }: ProcessProductParams) {
    console.log("Processing product:", { url, userId });

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
            collection: collectionName || 'Uncategorized'
        };

    } catch (scrapeError) {
        console.warn("Processing: Scraping failed, switching to failed_products details:", scrapeError);

        Sentry.captureException(scrapeError, {
            tags: {
                worker: "product-processor",
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
        const docRef = await addDoc(collection(db, targetCollection), {
            ...productData,
            createdAt: serverTimestamp()
        });

        console.log(`Processing: Saved to ${targetCollection}`);
        return { success: true, collection: targetCollection, id: docRef.id };

    } catch (dbError: any) {
        console.error("Processing: Firestore Save Error:", dbError);
        Sentry.captureException(dbError, {
            tags: {
                worker: "product-processor",
                action: "firestore-save"
            }
        });
        throw new Error("Database save failed");
    }
}
