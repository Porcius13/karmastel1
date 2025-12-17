import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { scrapeProduct } from "@/lib/scraper";

// Revalidate check to prevent caching
export const dynamic = 'force-dynamic';

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
                uniqueProductIds.forEach(productId => {
                    const productRef = doc(db, "products", productId);
                    batch.update(productRef, {
                        price: price, // Update current price
                        inStock: scrapedData.inStock,
                        lastStockCheck: serverTimestamp(),
                        // Add to price history
                        priceHistory: arrayUnion({
                            date: new Date().toISOString(),
                            price: price
                        })
                    });
                });

                if (scrapedData.inStock) {
                    // A. Notify Users & Close Alerts
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
                } else {
                    console.log(`Still out of stock: ${url}. Price updated to ${price}`);
                }

                await batch.commit();

            } catch (error) {
                console.error(`Error processing URL ${url}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            checkedUrls: checkedUrlsCount,
            mailsSent: mailsSentCount
        });

    } catch (error: any) {
        console.error("Cron Job Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
