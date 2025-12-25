
import { scrapeProduct } from "../src/lib/scraper";

async function testMavi() {
    const url = "https://www.mavi.com/lacivert-pantolon/p/1011074-82318?_gl=1*10922y2*_up*MQ..&gclid=CjwKCAjwy7HEBhBJEiwA5hQNouZhWNJEtU7ihoGNGWao4goy9iCUQ4NiUA4aR-UjngjUy-gVszxk_xoCAaIQAvD_BwE";

    console.log(`Testing Mavi URL: ${url}`);
    try {
        const data = await scrapeProduct(url);
        console.log("Scrape Result:", JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.error("Scrape Failed:", e.message);
    }
}

testMavi();
