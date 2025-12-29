
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { scrapeProduct } from "@/lib/scraper";
import * as Sentry from "@sentry/nextjs";
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Timeout Extension

function generateLinkHash(url: string): string {
    const cleanUrl = url.trim();
    return crypto.createHash('md5').update(cleanUrl).digest('hex');
}

export async function GET() {
    console.log("Cron Job Started: Checking Link Pool...");

    if (!adminDb) {
        const error = "Firebase Admin DB not initialized. Check server environment variables.";
        console.error(error);
        Sentry.captureMessage(error);
        return NextResponse.json({ success: false, error }, { status: 500 });
    }

    try {
        const linksRef = adminDb.collection("monitored_links");
        const productsRef = adminDb.collection("products");
        const alertsRef = adminDb.collection("stock_alerts");

        // 1. Fetch Pending Alerts (Global)
        // Ideally we would only fetch alerts for links we are about to check, but for now fetch all pending
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

        // 2. Fetch Stale Links (The Core Queue)
        // Prioritize links not checked recently
        const limitCount = 10; // Check 10 unique URLs per run
        const linksSnap = await linksRef.orderBy("lastChecked", "asc").limit(limitCount).get();

        const jobs = linksSnap.docs.map(doc => ({ hash: doc.id, ...doc.data() }));

        console.log(`[Link Pool] Found ${jobs.length} links to update.`);

        let mailsSentCount = 0;
        let checkedUrlsCount = 0;

        // 3. Execution Loop
        for (const job of jobs) {
            const linkData = job as any;
            const url = linkData.url;
            const hash = job.hash;

            if (!url) continue;

            try {
                checkedUrlsCount++;
                console.log(`[Link Pool] Scraping: ${url}`);
                const scrapedData = await scrapeProduct(url);

                const newPrice = typeof scrapedData.price === 'number' ? scrapedData.price : 0;
                const batch = adminDb.batch();

                // A. Update Monitored Link
                const linkRef = linksRef.doc(hash);
                batch.update(linkRef, {
                    price: newPrice,
                    inStock: scrapedData.inStock ?? true, // Default to true if undefined
                    title: scrapedData.title || "",
                    image: scrapedData.image || "",
                    lastChecked: FieldValue.serverTimestamp()
                });

                // B. Fan-Out Update to Products
                if (linkData.productIds && Array.isArray(linkData.productIds)) {
                    const productIds = linkData.productIds;
                    console.log(`[Link Pool] Fan-out update to ${productIds.length} products.`);

                    for (const productId of productIds) {
                        const productRef = productsRef.doc(productId);
                        // Read product to compare price for history
                        // Note: To save reads, we could just blindly update price. 
                        // But for history we need 'currentPrice'.
                        // Optimization: If newPrice == linkData.price (cached), maybe user products are already up to date?
                        // Not necessarily, maybe user added product *after* last scrape but before this one? 
                        // Actually, if we use the Link Pool logic correctly, user product always takes latest cache.
                        // So if cache didn't change, we might skip product updates?
                        // BUT: We need to update 'lastStockCheck' on product to show user it's live?
                        // Or just trust the link? 
                        // Let's do the read-update for correctness for now.

                        try {
                            const productSnap = await productRef.get();
                            if (!productSnap.exists) {
                                // Clean up dead ID from pool? (Async task maybe)
                                continue;
                            }
                            const productData = productSnap.data() as any;
                            const currentPrice = productData.price || 0;

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

                            if (Math.abs(currentPrice - newPrice) > 0.1) { // Float tolerance
                                const historyRef = productsRef.doc(productId).collection("priceHistory");
                                const newHistoryDoc = historyRef.doc();
                                batch.set(newHistoryDoc, {
                                    price: newPrice,
                                    date: new Date().toISOString(),
                                    currency: productData.currency || 'TRY'
                                });
                                console.log(`[Link Pool] Price changed for product ${productId}`);
                            }

                            batch.update(productRef, updates);

                        } catch (pErr) {
                            console.error(`[Link Pool] Product update failed for ${productId}`, pErr);
                        }
                    }
                }

                // C. Handle Alerts
                const pendingAlerts = pendingAlertsByHash.get(hash);
                if (scrapedData.inStock && pendingAlerts && pendingAlerts.length > 0) {
                    for (const alert of pendingAlerts) {
                        console.log(`[Link Pool] Notifying ${alert.email} about alert ${alert.id}`);
                        const alertRef = alertsRef.doc(alert.id);
                        batch.update(alertRef, { status: "completed", notifiedAt: Timestamp.now() });
                        mailsSentCount++;
                    }
                }

                await batch.commit();

            } catch (error) {
                console.error(`[Link Pool] Error processing URL ${url}:`, error);
                Sentry.captureException(error);
            }
        }

        return NextResponse.json({
            success: true,
            checkedLinks: checkedUrlsCount,
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
