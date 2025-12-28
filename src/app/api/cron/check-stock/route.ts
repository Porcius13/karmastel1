import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, updateDoc, arrayUnion, getDoc, addDoc, orderBy, limit } from "firebase/firestore";
import { scrapeProduct } from "@/lib/scraper";
import * as Sentry from "@sentry/nextjs";

// Revalidate check to prevent caching
// Revalidate check to prevent caching
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Timeout Extension

export async function GET() {
    try {
        const productsRef = collection(db, "products");
        const alertsRef = collection(db, "stock_alerts");

        // 1. Fetch Pending Alerts (Priority High)
        const alertsQ = query(alertsRef, where("status", "==", "pending"));
        const alertsSnapshot = await getDocs(alertsQ);

        // 2. Fetch Stale Products (Priority Medium)
        // We look for products check longest ago.
        // Note: Products without 'lastStockCheck' field are ignored by orderBy, so we need a fallback.
        let staleProducts: any[] = [];
        try {
            const staleQ = query(productsRef, orderBy("lastStockCheck", "asc"), limit(15));
            const staleSnap = await getDocs(staleQ);
            staleProducts = staleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn("Ordered query for stale products failed (likely missing index):", e);
        }

        // 3. Fallback / Discovery (Priority Low)
        // If we didn't find enough stale products (maybe first run, or missing fields), fetch arbitrary ones to "seed" the date.
        if (staleProducts.length < 5) {
            const discoveryQ = query(productsRef, limit(20));
            const discoverySnap = await getDocs(discoveryQ);
            const discovered = discoverySnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

            // Filter out ones we already have
            const currentIds = new Set(staleProducts.map(p => p.id));
            for (const p of discovered) {
                // If it has no lastStockCheck, prioritize it
                if (!currentIds.has(p.id)) {
                    if (!p.lastStockCheck) {
                        staleProducts.push(p);
                    } else {
                        // Only add if we really need padding
                        if (staleProducts.length < 15) staleProducts.push(p);
                    }
                    currentIds.add(p.id);
                }
            }
        }

        // 4. Consolidate URLs
        const urlsToCheck = new Map<string, { productIds: Set<string>, alerts: any[] }>();

        // Add Alerts
        alertsSnapshot.forEach(doc => {
            const data = doc.data();
            const url = data.productUrl;
            if (!urlsToCheck.has(url)) urlsToCheck.set(url, { productIds: new Set(), alerts: [] });
            urlsToCheck.get(url)!.alerts.push({ id: doc.id, ...data });
            urlsToCheck.get(url)!.productIds.add(data.productId);
        });

        // Add Stale Products
        staleProducts.forEach(p => {
            const url = p.url;
            if (url && url !== "MOCK") {
                if (!urlsToCheck.has(url)) urlsToCheck.set(url, { productIds: new Set(), alerts: [] });
                urlsToCheck.get(url)!.productIds.add(p.id);
            }
        });

        const jobList = Array.from(urlsToCheck.entries());
        console.log(`Starting stock/price check for ${jobList.length} unique URLs.`);

        let mailsSentCount = 0;
        let checkedUrlsCount = 0;

        // 5. Execution Loop
        for (const [url, context] of jobList) {
            try {
                checkedUrlsCount++;
                const scrapedData = await scrapeProduct(url);

                const price = typeof scrapedData.price === 'number' ? scrapedData.price : 0;
                const batch = writeBatch(db);

                // Update all associated products
                for (const productId of Array.from(context.productIds)) {
                    const productRef = doc(db, "products", productId);

                    try {
                        const productSnap = await getDoc(productRef);
                        if (!productSnap.exists()) continue;
                        const productData = productSnap.data();

                        const currentPrice = productData.price || 0;
                        const newPrice = price;

                        const updates: any = {
                            price: newPrice,
                            inStock: scrapedData.inStock,
                            lastStockCheck: serverTimestamp()
                        };

                        // Track Stats
                        const currentHighest = productData.highestPrice || currentPrice;
                        if (newPrice > currentHighest) {
                            updates.highestPrice = newPrice;
                            updates.priceDropPercentage = 0;
                        } else if (newPrice < currentHighest && newPrice > 0) {
                            updates.highestPrice = currentHighest;
                            const dropRatio = (currentHighest - newPrice) / currentHighest;
                            updates.priceDropPercentage = Math.round(dropRatio * 100);
                        }

                        // History
                        if (currentPrice !== newPrice) {
                            try {
                                const historyRef = collection(db, "products", productId, "priceHistory");
                                await addDoc(historyRef, {
                                    price: newPrice,
                                    date: new Date().toISOString(),
                                    currency: productData.currency || 'TRY'
                                });
                                console.log(`Price changed for ${productId} (${currentPrice} -> ${newPrice}). Saved history.`);
                            } catch (hErr) {
                                console.error("History save error:", hErr);
                            }
                        }

                        batch.update(productRef, updates);
                    } catch (err) {
                        console.error(`Error updating product ${productId}`, err);
                    }
                }

                // Handle Alerts
                if (scrapedData.inStock && context.alerts.length > 0) {
                    for (const alert of context.alerts) {
                        console.log(`Notifying ${alert.email} about ${alert.productId}`);
                        const alertRef = doc(db, "stock_alerts", alert.id);
                        batch.update(alertRef, { status: "completed", notifiedAt: serverTimestamp() });
                        mailsSentCount++;
                    }
                }

                await batch.commit();

            } catch (error) {
                console.error(`Error processing URL ${url}:`, error);
                Sentry.captureException(error);
            }
        }

        return NextResponse.json({
            success: true,
            checkedUrls: checkedUrlsCount,
            mailsSent: mailsSentCount
        });

    } catch (error: any) {
        console.error("Cron Job Error:", error);
        Sentry.captureException(error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
