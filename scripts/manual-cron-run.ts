
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as crypto from 'crypto';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Dynamic imports
const { adminDb } = await import("../src/lib/firebase-admin");
const { scrapeProduct } = await import("../src/lib/scraper");
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function generateLinkHash(url: string): string {
    const cleanUrl = url.trim();
    return crypto.createHash('md5').update(cleanUrl).digest('hex');
}

async function main() {
    console.log("Starting Manual Link Pool Check...");

    if (!adminDb) {
        console.error("Firebase Admin DB not initialized. Check env vars.");
        process.exit(1);
    }

    try {
        const linksRef = adminDb.collection("monitored_links");
        const productsRef = adminDb.collection("products");
        const alertsRef = adminDb.collection("stock_alerts");

        // 1. Fetch Pending Alerts
        const alertsSnap = await alertsRef.where("status", "==", "pending").get();
        const pendingAlertsByHash = new Map<string, any[]>();

        alertsSnap.forEach(doc => {
            const data = doc.data();
            if (data.productUrl) {
                const hash = generateLinkHash(data.productUrl);
                if (!pendingAlertsByHash.has(hash)) pendingAlertsByHash.set(hash, []);
                pendingAlertsByHash.get(hash)!.push({ id: doc.id, ...data });
            }
        });

        // 2. Fetch Stale Links
        // Fetch a bit more for manual test
        const limitCount = 5;
        const linksSnap = await linksRef.orderBy("lastChecked", "asc").limit(limitCount).get();

        const jobs = linksSnap.docs.map(doc => ({ hash: doc.id, ...doc.data() }));

        console.log(`[Link Pool] Found ${jobs.length} links to update.`);

        // 3. Execution Loop
        for (const job of jobs) {
            const linkData = job as any;
            const url = linkData.url;
            const hash = job.hash;

            if (!url) continue;

            console.log(`[Link Pool] Processing: ${url}`);

            try {
                const scrapedData = await scrapeProduct(url);
                const newPrice = typeof scrapedData.price === 'number' ? scrapedData.price : 0;

                // Simulating Batch
                const batch = adminDb.batch();

                // A. Update Monitored Link
                const linkRef = linksRef.doc(hash);
                batch.update(linkRef, {
                    price: newPrice,
                    inStock: scrapedData.inStock ?? true,
                    title: scrapedData.title || "",
                    image: scrapedData.image || "",
                    lastChecked: FieldValue.serverTimestamp()
                });

                // B. Fan-Out
                if (linkData.productIds && Array.isArray(linkData.productIds)) {
                    const productIds = linkData.productIds;
                    console.log(`[Link Pool] Fan-out update to ${productIds.length} products: ${productIds.join(", ")}`);

                    for (const productId of productIds) {
                        const productRef = productsRef.doc(productId);

                        try {
                            const productSnap = await productRef.get();
                            if (!productSnap.exists) continue;
                            const productData = productSnap.data() as any;
                            const currentPrice = productData.price || 0;

                            const updates: any = {
                                price: newPrice,
                                inStock: scrapedData.inStock ?? true,
                                lastStockCheck: Timestamp.now()
                            };

                            const currentHighest = productData.highestPrice || currentPrice;
                            if (newPrice > currentHighest) {
                                updates.highestPrice = newPrice;
                                updates.priceDropPercentage = 0;
                            } else if (newPrice < currentHighest && newPrice > 0) {
                                updates.highestPrice = currentHighest;
                                const dropRatio = (currentHighest - newPrice) / currentHighest;
                                updates.priceDropPercentage = Math.round(dropRatio * 100);
                            }

                            if (Math.abs(currentPrice - newPrice) > 0.1) {
                                const historyRef = productsRef.doc(productId).collection("priceHistory");
                                const newHistoryDoc = historyRef.doc();
                                batch.set(newHistoryDoc, {
                                    price: newPrice,
                                    date: new Date().toISOString(),
                                    currency: productData.currency || 'TRY'
                                });
                                console.log(`[Link Pool] Price changed for product ${productId}: ${currentPrice} -> ${newPrice}`);
                            }

                            batch.update(productRef, updates);

                        } catch (pErr) {
                            console.error(`[Link Pool] Product update failed for ${productId}`, pErr);
                        }
                    }
                }

                await batch.commit();
                console.log(`[Link Pool] Committed updates for ${hash}`);

            } catch (error) {
                console.error(`[Link Pool] Error processing URL ${url}:`, error);
            }
        }

        console.log("Manual check completed.");

    } catch (error) {
        console.error("Script failed:", error);
    }
}

main();
