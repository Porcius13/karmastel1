
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Dynamic imports
const { adminDb } = await import("../src/lib/firebase-admin");
const { scrapeProduct } = await import("../src/lib/scraper");
import { Timestamp } from 'firebase-admin/firestore'; // Admin SDK types

async function main() {
    console.log("Starting manual stock check (Admin SDK)...");

    if (!adminDb) {
        console.error("Firebase Admin DB not initialized. Check env vars.");
        process.exit(1);
    }

    try {
        const productsRef = adminDb.collection("products");
        const alertsRef = adminDb.collection("stock_alerts");

        // 1. Fetch Pending Alerts
        const alertsSnap = await alertsRef.where("status", "==", "pending").get();

        // 2. Fetch Stale Products
        let staleProducts: any[] = [];
        try {
            // Admin SDK 'orderBy' and 'limit' chaining
            const staleSnap = await productsRef.orderBy("lastStockCheck", "asc").limit(5).get();
            staleProducts = staleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn("Ordered query failed:", e);
        }

        // 3. Fallback
        if (staleProducts.length < 5) {
            // Basic fetch
            const discoverySnap = await productsRef.limit(20).get();
            const discovered = discoverySnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const currentIds = new Set(staleProducts.map(p => p.id));
            for (const p of discovered) {
                if (!currentIds.has(p.id)) {
                    staleProducts.push(p);
                    currentIds.add(p.id);
                    if (staleProducts.length >= 5) break;
                }
            }
        }

        // 4. Consolidate URLs
        const urlsToCheck = new Map<string, { productIds: Set<string>, alerts: any[] }>();

        alertsSnap.forEach(doc => {
            const data = doc.data();
            const url = data.productUrl;
            if (!urlsToCheck.has(url)) urlsToCheck.set(url, { productIds: new Set(), alerts: [] });
            urlsToCheck.get(url)!.alerts.push({ id: doc.id, ...data });
            urlsToCheck.get(url)!.productIds.add(data.productId);
        });

        staleProducts.forEach(p => {
            const url = p.url;
            if (url && url !== "MOCK") {
                if (!urlsToCheck.has(url)) urlsToCheck.set(url, { productIds: new Set(), alerts: [] });
                urlsToCheck.get(url)!.productIds.add(p.id);
            }
        });

        const jobList = Array.from(urlsToCheck.entries());
        console.log(`Checking ${jobList.length} unique URLs...`);

        // 5. Execution
        for (const [url, context] of jobList) {
            try {
                console.log(`Scraping: ${url}`);
                const scrapedData = await scrapeProduct(url);
                console.log(`Scraped Price: ${scrapedData.price}, In Stock: ${scrapedData.inStock}`);

                const price = typeof scrapedData.price === 'number' ? scrapedData.price : 0;
                const batch = adminDb.batch();

                for (const productId of Array.from(context.productIds)) {
                    const productRef = productsRef.doc(productId);

                    try {
                        const productSnap = await productRef.get();
                        if (!productSnap.exists) continue;
                        const productData = productSnap.data() as any;

                        const currentPrice = productData.price || 0;
                        const newPrice = price;

                        const updates: any = {
                            price: newPrice,
                            inStock: scrapedData.inStock,
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

                        if (currentPrice !== newPrice) {
                            const historyRef = productsRef.doc(productId).collection("priceHistory");
                            // Add to subcollection
                            // In Admin SDK: historyRef.add(...) calls are simple, but for batch we need doc ref.
                            // batch.create(historyRef.doc(), { ... })
                            const newHistoryDoc = historyRef.doc();
                            batch.set(newHistoryDoc, {
                                price: newPrice,
                                date: new Date().toISOString(),
                                currency: productData.currency || 'TRY'
                            });

                            console.log(`Price updated for ${productId}: ${currentPrice} -> ${newPrice}`);
                        } else {
                            console.log(`Price unchanged for ${productId}`);
                        }

                        batch.update(productRef, updates);
                    } catch (err) {
                        console.error(`Error updating product ${productId}`, err);
                    }
                }

                await batch.commit();

            } catch (error) {
                console.error(`Error processing URL ${url}:`, error);
            }
        }

        console.log("Done.");

    } catch (error) {
        console.error("Script failed:", error);
    }
}

main();
