import axios from "axios";
import { extractStaticData } from "../src/lib/scrapers/static-extractor.js";

async function fetchStaticHtml(url: string): Promise<string> {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        return response.data;
    } catch (error) {
        console.warn(`Static fetch failed for ${url}:`, error instanceof Error ? error.message : error);
        return "";
    }
}

async function test() {
    const url = "https://www.swatch.com/tr-tr/sweet-embrace-so29z120/SO29Z120.html";
    console.log(`Testing URL: ${url}`);

    const html = await fetchStaticHtml(url);
    if (!html) {
        console.log("Failed to fetch HTML");
        return;
    }

    const result = extractStaticData(html, url);
    console.log("Extraction Result:", JSON.stringify(result, null, 2));
}

test();
