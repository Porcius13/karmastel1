import { scrapeProduct } from "./src/lib/scraper.js";

async function test() {
    const url = "https://www.oldcottoncargo.com.tr/bej-renk-gercek-deri-kapak-ve-fermuar-detayli-dayanikli-vintage-sirt-cantasi";
    console.log("Testing URL:", url);
    try {
        const data = await scrapeProduct(url);
        console.log("Scraped Data:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

test();
