import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { scrapeProduct } from "@/lib/scraper";
import { CategoryService } from "@/lib/category-service";
import * as Sentry from "@sentry/nextjs";
import * as crypto from 'crypto';

interface ProcessProductParams {
    url: string;
    userId: string;
    collectionName?: string;
}

function generateLinkHash(url: string): string {
    const cleanUrl = url.trim();
    return crypto.createHash('md5').update(cleanUrl).digest('hex');
}

export async function processProduct({ url, userId, collectionName }: ProcessProductParams) {
    // Use Sentry scope to attach user and context to any errors
    return (Sentry.withScope ? Sentry.withScope : (fn: any) => fn({}))(async (scope: any) => {
        if (scope.setUser) {
            scope.setUser({ id: userId });
        }
        if (scope.setTag) {
            scope.setTag("collection", collectionName || "Uncategorized");
            scope.setTag("worker", "product-processor");
        }

        console.log("Processing product:", { url, userId });

        let productData: any = {};
        let targetCollection = "products";
        let linkHash = "";
        let isCached = false;

        try {
            // 1. Try Scrape OR Cache
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
                // Check Link Pool Cache (Admin Only)
                if (adminDb) {
                    try {
                        linkHash = generateLinkHash(url);
                        const linkRef = adminDb.collection("monitored_links").doc(linkHash);
                        const linkSnap = await linkRef.get();

                        if (linkSnap.exists) {
                            const linkData = linkSnap.data() as any;
                            // Use cached data if it looks valid
                            if (linkData.title && linkData.price !== undefined) {
                                console.log(`[Link Pool] Cache HIT for ${url}`);
                                scraped = {
                                    title: linkData.title,
                                    price: linkData.price,
                                    image: linkData.image,
                                    currency: linkData.currency || "TRY",
                                    inStock: linkData.inStock,
                                    source: linkData.source || 'cache',
                                    description: linkData.description
                                };
                                Sentry.addBreadcrumb({ category: "processor", message: "Link Pool Cache Hit", level: "info" });
                                isCached = true;
                            }
                        }
                    } catch (cacheErr) {
                        console.warn("[Link Pool] Cache check failed:", cacheErr);
                    }
                }

                // If not cached, Scrape
                if (!scraped) {
                    console.log(`[Link Pool] Cache MISS for ${url} (or Admin DB unavailable). Scraping...`);
                    Sentry.addBreadcrumb({ category: "processor", message: "Scraping fresh data" });
                    scraped = await scrapeProduct(url);
                }
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

                    // Admin preferred
                    if (adminDb) {
                        const colSnap = await adminDb.collection("collection_settings").doc(colId).get();
                        if (colSnap.exists) {
                            const colData = colSnap.data();
                            if (colData?.participants) participants = colData.participants;
                            if (colData?.isPublic) isPublic = true;
                        }
                    } else {
                        // Client SDK fallback (might be restricted)
                        const colSnap = await getDoc(doc(db, "collection_settings", colId));
                        if (colSnap.exists()) {
                            const colData = colSnap.data();
                            if (colData?.participants) participants = colData.participants;
                            if (colData?.isPublic) isPublic = true;
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
                title: scraped.title || "İsimsiz Ürün",
                price: scraped.price || 0,
                image: scraped.image || "https://placehold.co/600x600?text=No+Image",
                currency: scraped.currency || "TRY",
                description: scraped.description || "",
                inStock: scraped.inStock ?? true,
                source: scraped.source || (url ? new URL(url).hostname.replace('www.', '') : 'unknown'),
                status: 'active',
                isScrapeFailed: false,
                userId: userId,
                participants: participants,
                isPublic: false, // Default to Private
                collection: collectionName || 'Uncategorized',
                category: CategoryService.predictCategory(scraped.title || ""),
                highestPrice: scraped.price || 0,
                priceDropPercentage: 0
            };

        } catch (scrapeError: any) {
            console.warn("Processing: Scraping failed, switching to failed_products details:", scrapeError);

            try {
                Sentry.captureException(scrapeError, {
                    extra: { url, userId, stage: "scraping" }
                });
                await Sentry.flush(2000);
            } catch (e) {
                console.warn("Sentry capture failed");
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

        // ... proceeding to db save ...


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

                // Update Link Pool (Fan-In)
                if (targetCollection === "products" && url !== "MOCK") {
                    try {
                        const linkRef = adminDb.collection("monitored_links").doc(linkHash);
                        await linkRef.set({
                            url: url,
                            title: productData.title,
                            image: productData.image,
                            price: productData.price,
                            currency: productData.currency,
                            inStock: productData.inStock,
                            lastChecked: isCached ? undefined : FieldValue.serverTimestamp(), // Only update timestamp if fresh scrape
                            productIds: FieldValue.arrayUnion(docId)
                        }, { merge: true });
                        console.log(`[Link Pool] Updated link ${linkHash} with new product ${docId}`);
                    } catch (poolErr) {
                        console.error("[Link Pool] Failed to update pool:", poolErr);
                    }
                }

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
                // ... keep existing logic for collection cover ...
                // Simplified for brevity in replacement, but ensuring we don't lose it.
                try {
                    const colName = productData.collection;
                    const safeNameId = Buffer.from(encodeURIComponent(colName)).toString('base64')
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/\//g, '_') // Duplicate replace fix
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
                    }
                } catch (e) { console.warn("Collection cover update failed", e); }
            }

            return { success: true, collection: targetCollection, id: docId };

        } catch (dbError: any) {
            console.error("Processing: Database Save Error:", dbError);
            try {
                Sentry.captureException(dbError, {
                    extra: { url, userId, stage: "db_save" }
                });
                await Sentry.flush(2000);
            } catch (e) {
                // Sentry might fail in script environment
            }
            throw new Error(`Database save failed: ${dbError.message}`);
        }
    }); // End Sentry Scope
}
