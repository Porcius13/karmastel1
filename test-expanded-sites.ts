
import { scrapeProduct } from "./src/lib/scraper";

async function runTest() {
    console.log("Starting Extended Sites Scraper Test...");

    const testCases = [
        {
            name: "Zara",
            url: "https://www.zara.com/tr/tr/suni-deri-biker-ceket-p03046029.html"
        },
        {
            name: "H&M",
            url: "https://www2.hm.com/tr_tr/productpage.1220454001.html"
        },
        {
            name: "Mango",
            url: "https://shop.mango.com/tr/kadin/ceket-biker-ceket/deri-gorunumlu-biker-ceket_57000266.html"
        },
        {
            name: "Beymen",
            url: "https://www.beymen.com/p_valentino-garavani-vsling-gold-kadin-deri-canta_1116634"
        }
    ];

    for (const test of testCases) {
        console.log(`\n--- Testing ${test.name}: ${test.url} ---`);
        try {
            const result = await scrapeProduct(test.url);
            console.log("RESULT:", {
                title: result.title,
                price: result.price,
                currency: result.currency,
                image: result.image,
                source: result.source,
                error: result.error
            });
        } catch (e: any) {
            console.error("FAILED:", e.message);
        }
    }
}

runTest();
