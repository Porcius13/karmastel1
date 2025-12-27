import { scrapeProduct } from "./src/lib/scraper";

async function runTest() {
    console.log("Starting Scraper Fix Test...");
    const testCases = [
        {
            name: "LC Waikiki",
            url: "https://www.lcw.com/erkek-kontrast-yaka-yikamali-relax-fit-ceket-kahverengi-kahverengi-o-5230931"
        },
        {
            name: "DeFacto",
            url: "https://www.defacto.com.tr/regular-fit-normal-kesim-cepli-duz-paca-chino-pantolon-3277181"
        },
        {
            name: "Mavi",
            url: "https://www.mavi.com/suni-kurk-detayli-yesil-ceket/p/0110627-87538"
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
                original_scraped_price: result.price
            });
        } catch (e: any) {
            console.error("FAILED:", e.message);
        }
    }
}

runTest();
