
import { scrapeProduct } from "../src/lib/scraper";

async function main() {
    const url = process.argv[2];
    if (!url) {
        console.error("Please provide a URL as an argument");
        process.exit(1);
    }

    console.log(`Testing scraper for: ${url}`);
    try {
        const data = await scrapeProduct(url);
        console.log("Scrape Result:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Scrape Failed:", error);
    }
}

main();
