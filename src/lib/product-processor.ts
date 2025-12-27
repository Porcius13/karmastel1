import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { scrapeProduct } from "@/lib/scraper";
import { CategoryService } from "@/lib/category-service";
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
        let scraped: any;

        if (url === "MOCK") {
            scraped = {
                title: "Mock Scalable Product",
                price: 999.99,
                image: "https://placehold.co/600x600?text=Mock",
                currency: "TRY",
                inStock: true,
                source: 'static-cheerio'
            };
        } else {
            scraped = await scrapeProduct(url);
        }

        // Fetch collection participants if available
        let participants = [userId];
        let isPublic = false;
        if (collectionName && collectionName !== 'Uncategorized') {
            try {
                // Same logic as frontend for unique IDs: UID + "_" + Base64Name
                const safeNameId = Buffer.from(collectionName).toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                const colId = `${userId}_${safeNameId}`;

                const colSnap = await adminDb!.collection("collection_settings").doc(colId).get();
                if (colSnap.exists) {
                    const colData = colSnap.data();
                    if (colData?.participants && Array.isArray(colData.participants)) {
                        participants = colData.participants;
                    }
                    if (colData?.isPublic) {
                        isPublic = true;
                    }
                }
            } catch (colErr) {
                console.warn("Could not fetch collection participants:", colErr);
            }
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
            source: scraped.source || (url ? new URL(url).hostname.replace('www.', '') : 'unknown'),
            status: 'active',
            isScrapeFailed: false,
            userId: userId,
            participants: participants,
            isPublic: isPublic,
            collection: collectionName || 'Uncategorized',
            category: CategoryService.predictCategory(scraped.title),
            highestPrice: scraped.price,
            priceDropPercentage: 0
        };

    } catch (scrapeError: any) {
        console.warn("Processing: Scraping failed, switching to failed_products details:", scrapeError);

        try {
            Sentry.captureException(scrapeError, {
                tags: {
                    worker: "product-processor",
                    url: url
                }
            });
        } catch (e) {
            console.warn("Sentry capture failed (expected in test script)");
        }

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
            source: url ? new URL(url).hostname.replace('www.', '') : 'unknown',
            status: 'needs_review',
            userId: userId
        };
    }

    try {
        let docId = "";

        if (adminDb) {
            console.log("Processing: Using Admin SDK for database save");
            // Use Admin SDK (Bypasses rules)
            const docRef = await adminDb.collection(targetCollection).add({
                ...productData,
                createdAt: FieldValue.serverTimestamp()
            });
            docId = docRef.id;
        } else {
            console.warn(`Processing: Admin SDK not available (missing env vars?), falling back to Client SDK. Target: ${targetCollection}`);
            // Fallback to client SDK (Might fail in prod if no auth)
            const docRef = await addDoc(collection(db, targetCollection), {
                ...productData,
                createdAt: serverTimestamp()
            });
            docId = docRef.id;
        }

        console.log(`Processing: Successfully saved to ${targetCollection} with ID ${docId}`);

        // 3.5 INITIAL PRICE HISTORY (Subcollection)
        if (targetCollection === "products" && productData.price > 0) {
            try {
                const historyData = {
                    price: productData.price,
                    date: new Date().toISOString(),
                    currency: productData.currency || 'TRY'
                };

                if (adminDb) {
                    await adminDb.collection("products").doc(docId).collection("priceHistory").add(historyData);
                } else {
                    await addDoc(collection(db, "products", docId, "priceHistory"), historyData);
                }
                console.log("Processing: Saved initial price history to subcollection");
            } catch (historyError) {
                console.error("Processing: Failed to save initial history:", historyError);
            }
        }

        // 4. Auto-Set Collection Cover Image if missing
        if (targetCollection === "products" && productData.image && productData.collection && productData.collection !== 'Uncategorized') {
            try {
                const colName = productData.collection;
                const safeNameId = Buffer.from(encodeURIComponent(colName)).toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

                const docPath = `collection_settings/${userId}_${safeNameId}`;

                if (adminDb) {
                    const colRef = adminDb.doc(docPath);
                    const colSnap = await colRef.get();
                    if (!colSnap.exists || !colSnap.data()?.image) {
                        await colRef.set({
                            userId: userId,
                            name: colName,
                            image: productData.image,
                            updatedAt: FieldValue.serverTimestamp(),
                            isPublic: colSnap.exists ? colSnap.data()?.isPublic : false
                        }, { merge: true });
                    }
                } else {
                    const colSettingsRef = doc(db, "collection_settings", `${userId}_${safeNameId}`);
                    const colDoc = await getDoc(colSettingsRef);
                    if (!colDoc.exists() || !colDoc.data().image) {
                        await setDoc(colSettingsRef, {
                            userId: userId,
                            name: colName,
                            image: productData.image,
                            updatedAt: new Date(),
                            isPublic: colDoc.exists() ? colDoc.data().isPublic : false
                        }, { merge: true });
                    }
                }
            } catch (coverError) {
                console.error("Processing: Failed to update collection cover:", coverError);
            }
        }

        return { success: true, collection: targetCollection, id: docId };

    } catch (dbError: any) {
        console.error("Processing: Database Save Error:", dbError);
        try {
            Sentry.captureException(dbError);
        } catch (e) {
            // Sentry might fail in script environment
        }
        throw new Error(`Database save failed: ${dbError.message}`);
    }
}
