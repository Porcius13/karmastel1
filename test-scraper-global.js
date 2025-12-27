import { scrapeProduct } from "./src/lib/scraper.js";

async function runTest() {
    console.log("Starting Scraper Test...");
    const testUrls = [
        "https://www.trendyol.com/apple/iphone-15-128-gb-siyah-p-766723238",
        "https://www.oldcottoncargo.com.tr/bej-renk-gercek-deri-kapak-ve-fermuar-detayli-dayanikli-vintage-sirt-cantasi"
    ];

    for (const url of testUrls) {
        console.log(`\n--- Testing: ${url} ---`);
        try {
            const result = await scrapeProduct(url);
            console.log("SUCCESS:", {
                title: result.title,
                price: result.price,
                image: !!result.image,
                source: result.source,
                error: result.error
            });
        } catch (e) {
            console.error("FAILED with crash:", e.message);
        }
    }
}

runTest();
