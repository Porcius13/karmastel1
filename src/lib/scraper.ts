import * as Sentry from "@sentry/nextjs";
import { getScraper } from "./scrapers/registry";
import { getBrowser, smartPriceParse, fetchStaticHtml } from "./scrapers/utils";
import { extractStaticData } from "./scrapers/static-extractor";
import { ScrapedData } from "./scrapers/types";

// Re-export for backward compatibility
export { smartPriceParse };
export type { ScrapedData };

export async function scrapeProduct(url: string): Promise<ScrapedData> {
    let cleanUrlStr = url.trim();
    if (!cleanUrlStr) throw new Error("URL is required");

    if (!/^https?:\/\//i.test(cleanUrlStr)) {
        cleanUrlStr = "https://" + cleanUrlStr;
    }

    return (Sentry.withScope ? Sentry.withScope : (fn: any) => fn({}))(async (scope: any) => {
        let domainName = "unknown";
        try {
            domainName = new URL(cleanUrlStr).hostname.replace('www.', '');
        } catch (e) {
            return {
                title: "", image: "", description: "", price: 0, currency: "TRY",
                inStock: true, source: 'manual', error: "Invalid URL format"
            };
        }

        if (scope.setTag) {
            scope.setTag("site", domainName);
            scope.setTag("scraper_mode", "hybrid");
        }

        // --- STAGE 1: STATIC EXTRACTION (Fast & Cheap) ---
        // Skip static for known JS-only sites to save time
        const skipStatic = domainName.includes("mavi.com") ||
            domainName.includes("hm.com") ||
            domainName.includes("zara.com") ||
            domainName.includes("mango.com") ||
            domainName.includes("beymen.com") ||
            domainName.includes("lcw.com") ||
            domainName.includes("defacto.com");

        if (!skipStatic) {
            const html = await fetchStaticHtml(cleanUrlStr);
            if (html) {
                const staticData = extractStaticData(html, cleanUrlStr);
                if (staticData && staticData.title && staticData.price > 0) {
                    console.log(`[Hybrid Scraper] Static extraction SUCCESS for ${domainName}`);
                    return staticData;
                }
            }
            console.log(`[Hybrid Scraper] Static extraction failed or incomplete for ${domainName}. Falling back to Puppeteer...`);
        }

        // --- STAGE 2: PUPPETEER EXTRACTION (Robust & Guaranteed) ---
        const scraper = getScraper(domainName);

        // For specialized scrapers that handle their own browser (H&M, Mavi)
        if (domainName.includes("hm.com") || domainName.includes("mavi.com")) {
            return await scraper({ url: cleanUrlStr, domain: domainName, browser: null, page: null });
        }

        let browser = null;
        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Referer': 'https://www.google.com/',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"'
            });
            await page.setViewport({ width: 1366, height: 768 });

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            await page.goto(cleanUrlStr, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 1000));

            const result = await scraper({ url: cleanUrlStr, domain: domainName, browser, page });
            return result;

        } catch (error: any) {
            console.error(`Scraping failed for ${domainName}:`, error.message);
            try {
                if (Sentry.captureException) Sentry.captureException(error);
            } catch (e) { }
            return {
                title: "Hata", price: 0, image: "https://placehold.co/600x600?text=Error",
                currency: "TRY", description: "Ürün bilgileri alınamadı.",
                inStock: true, source: 'manual', error: error.message
            };
        } finally {
            if (browser) await browser.close();
        }
    });
}
