import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
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

        // 4. Auto-Set Collection Cover Image if missing
        // Only if we have a valid image and a specific collection (not Uncategorized)
        if (targetCollection === "products" && productData.image && productData.collection && productData.collection !== 'Uncategorized') {
            try {
                const colName = productData.collection;
                // Encode safe ID (Server-side compatible version of UI logic)
                // UI: btoa(unescape(encodeURIComponent(name)))
                const safeNameId = Buffer.from(encodeURIComponent(colName)).toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

                const colSettingsRef = doc(db, "collection_settings", `${userId}_${safeNameId}`);
                const colDoc = await getDoc(colSettingsRef);

                if (!colDoc.exists() || !colDoc.data().image) {
                    await setDoc(colSettingsRef, {
                        userId: userId,
                        name: colName,
                        image: productData.image,
                        updatedAt: new Date(), // using Date object for direct write, simpler than serverTimestamp here
                        // Default to private if creating new
                        isPublic: colDoc.exists() ? colDoc.data().isPublic : false
                    }, { merge: true });
                    console.log(`Processing: Auto-set cover image for collection '${colName}'`);
                }
            } catch (coverError) {
                console.error("Processing: Failed to update collection cover:", coverError);
                // Don't fail the whole request just for the cover image
            }
        }

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
