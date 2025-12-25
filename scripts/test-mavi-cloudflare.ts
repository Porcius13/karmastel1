
import { scrapeProduct } from "../src/lib/scraper";

async function testMaviCF() {
    const url = "https://www.mavi.com/istiridye-baskili-beyaz-gomlek/p/122514-89842?_gl=1*16cwipz*_up*MQ..&gclid=CjwKCAjwy7HEBhBJEiwA5hQNouZhWNJEtU7ihoGNGWao4goy9iCUQ4NiUA4aR-UjngjUy-gVszxk_xoCAaIQAvD_BwE";
    console.log(`Testing Mavi URL (CF): ${url}`);
    try {
        const data = await scrapeProduct(url);
        console.log("Scrape Result:", JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.error("Scrape Failed:", e.message);
    }
}
testMaviCF();
