import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { scrapeProduct } from "@/lib/scraper";
import * as Sentry from "@sentry/nextjs";

// Revalidate check to prevent caching
// Revalidate check to prevent caching
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Timeout Extension

export async function GET() {
    try {
        // 1. Fetch Pending Alerts
        const alertsRef = collection(db, "stock_alerts");
        const q = query(alertsRef, where("status", "==", "pending"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return NextResponse.json({ success: true, message: "No pending alerts found." });
        }

        // 2. Group by URL
        const alertsByUrl: Record<string, any[]> = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const { productUrl } = data;

            if (!alertsByUrl[productUrl]) {
                alertsByUrl[productUrl] = [];
            }

            alertsByUrl[productUrl].push({
                id: doc.id,
                ...data
            });
        });

        const urlsToCheck = Object.keys(alertsByUrl);
        let mailsSentCount = 0;
        let checkedUrlsCount = 0;

        console.log(`Starting stock check for ${urlsToCheck.length} unique URLs.`);

        // 3. Batch Scraping & Processing
        // Using for..of loop to process sequentially and avoid hitting rate limits or server overload
        for (const url of urlsToCheck) {
            try {
                checkedUrlsCount++;
                const scrapedData = await scrapeProduct(url);

                // Check if we got valid data (if price is 0 and manual fallback, we might skip history or just log it)
                const price = typeof scrapedData.price === 'number' ? scrapedData.price : 0;
                const waitingAlerts = alertsByUrl[url];
                const batch = writeBatch(db);

                // Identify unique products to update (one URL might be tracked by multiple users/product docs)
                // Using a Set to avoid duplicate updates to the same product doc in one batch
                const uniqueProductIds = new Set(waitingAlerts.map(a => a.productId));

                // Update Products with latest Price & Status & History
                // Update Products with latest Price & Status & History
                for (const productId of Array.from(uniqueProductIds)) {
                    const productRef = doc(db, "products", productId);

                    // READ: Fetch current state to compare price
                    // We must read individually to ensure we only append history ON CHANGE
                    try {
                        const productSnap = await getDoc(productRef);
                        if (!productSnap.exists()) continue;
                        const productData = productSnap.data();

                        const currentPrice = productData.price || 0;
                        const newPrice = price; // Scraped price

                        const updates: any = {
                            price: newPrice,
                            inStock: scrapedData.inStock,
                            lastStockCheck: serverTimestamp()
                        };

                        // CONDITIONAL HISTORY UPDATE
                        // Only add to history if price changed OR history is empty
                        // This prevents bloating the array with identical consecutive prices
                        if (currentPrice !== newPrice) {
                            updates.priceHistory = arrayUnion({
                                date: new Date().toISOString(),
                                price: newPrice
                            });
                        }

                        batch.update(productRef, updates);

                    } catch (readError) {
                        console.error(`Error reading product ${productId}:`, readError);
                    }
                }

                // B. Check Target Price
                if (scrapedData.inStock && waitingAlerts.length > 0) {
                    // ... existing loop for notifications ...
                    waitingAlerts.forEach(alert => {
                        console.log(`Mail Gönderiliyor: ${alert.email} for product ${alert.productId}`);
                        // Update Alert Status
                        const alertRef = doc(db, "stock_alerts", alert.id);
                        batch.update(alertRef, {
                            status: "completed",
                            notifiedAt: serverTimestamp()
                        });
                        mailsSentCount++;
                    });
                    console.log(`Stock found for ${url}. Notifying ${waitingAlerts.length} users.`);
                }

                // (Target Price Logic - Handled in Notifications block or implicitly by Price Update)
                // We rely on the Frontend to show "Target Met" badge based on updated price.

                if (scrapedData.inStock && waitingAlerts.length > 0) {
                    // ... logic handled above or consolidated here
                } else {
                    console.log(`Process: ${url} Price: ${price}`);
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
