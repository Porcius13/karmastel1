
import { scrapeProduct } from "../src/lib/scraper.js";

async function runTest() {
    console.log("🚀 Testing Amazon US Fix...");
    const url = "https://www.amazon.com/Logitech-Wireless-Mouse-M325-Flamingo/dp/B07RR6Q423?th=1";

    try {
        const result = await scrapeProduct(url);
        console.log("✅ RESULT:", {
            title: result.title,
            price: result.price,
            currency: result.currency,
            image: result.image,
            source: result.source,
            error: result.error
        });

        if (result.currency === 'USD' && result.price > 0 && result.image && !result.image.includes('._AC_')) {
            console.log("\n✨ TEST PASSED: Currency is USD and image is cleaned.");
        } else {
            console.log("\n❌ TEST FAILED: Check currency or image cleaning.");
        }
    } catch (e: any) {
        console.error("❌ CRASHED:", e.message);
    }
}

runTest();
