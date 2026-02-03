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

        Sentry.addBreadcrumb({
            category: "scraper.flow",
            message: `Starting scrape for ${domainName}`,
            level: "info",
            data: { url: cleanUrlStr }
        });

        // --- STAGE 1: STATIC EXTRACTION (Fast & Cheap) ---
        // Skip static for known JS-only sites to save time
        const skipStatic = domainName.includes("mavi.com") ||
            domainName.includes("hm.com") ||
            domainName.includes("zara.com") ||
            domainName.includes("mango.com") ||
            domainName.includes("beymen.com") ||
            domainName.includes("lcw.com") ||
            domainName.includes("airbnb.com") ||
            domainName.includes("defacto.com");

        if (!skipStatic) {
            Sentry.addBreadcrumb({ category: "scraper.static", message: "Attempting static extraction" });
            const html = await fetchStaticHtml(cleanUrlStr);
            if (html) {
                const staticData = extractStaticData(html, cleanUrlStr);
                if (staticData && staticData.title && staticData.price > 0) {
                    console.log(`[Hybrid Scraper] Static extraction SUCCESS for ${domainName}`);
                    return staticData;
                }
            }
            console.log(`[Hybrid Scraper] Static extraction failed or incomplete for ${domainName}. Falling back to Puppeteer...`);
            Sentry.addBreadcrumb({ category: "scraper.static", message: "Static extraction failed or incomplete", level: "warning" });
        } else {
            Sentry.addBreadcrumb({ category: "scraper.static", message: "Skipping static extraction (known JS-heavy site)" });
        }

        // --- STAGE 2: PUPPETEER EXTRACTION (Robust & Guaranteed) ---
        const scraper = getScraper(domainName);

        // For specialized scrapers that handle their own browser (H&M, Mavi)
        if (domainName.includes("hm.com") || domainName.includes("mavi.com")) {
            Sentry.addBreadcrumb({ category: "scraper.puppeteer", message: "Delegating to specialized scraper" });
            return await scraper({ url: cleanUrlStr, domain: domainName, browser: null, page: null });
        }

        let browser = null;
        try {
            Sentry.addBreadcrumb({ category: "scraper.puppeteer", message: "Launching browser" });
            browser = await getBrowser();
            if (!browser) {
                throw new Error("Failed to launch browser instance");
            }
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

            Sentry.addBreadcrumb({ category: "scraper.puppeteer", message: "Navigating to page" });
            await page.goto(cleanUrlStr, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 1000));

            const result = await scraper({ url: cleanUrlStr, domain: domainName, browser, page });

            // Check for semantic errors (Zero Price)
            if (result.price === 0) {
                Sentry.captureMessage(`Zero Price Detected: ${domainName}`, {
                    level: "warning",
                    contexts: { "scraped_data": result as any }
                });
            }

            // Check for missing or placeholder images
            const isPlaceholder = result.image?.includes('placehold.co') || result.image?.includes('placeholder');
            if (!result.image || isPlaceholder) {
                Sentry.captureMessage(`Missing Image Detected: ${domainName}`, {
                    level: "warning",
                    contexts: { "scraped_data": result as any }
                });
            }

            return result;

        } catch (error: any) {
            console.error(`Scraping failed for ${domainName}:`, error.message);

            // Explicitly notify Sentry about the failure reason
            Sentry.captureMessage(`Scraping Failure: ${domainName}`, {
                level: "error",
                extra: { error: error.message, url: cleanUrlStr }
            });
            try {
                // Try to capture HTML snapshot if browser is still active
                let htmlSnippet = "Could not retrieve HTML";
                if (browser) {
                    try {
                        const pages = await browser.pages();
                        if (pages.length > 0) { // Ideally we track the specific page, but finding the active one is safe enough
                            const p = pages[pages.length - 1];
                            const content = await p.content();
                            htmlSnippet = content.substring(0, 5000) + "... [TRUNCATED]";
                        }
                    } catch (snapErr) {
                        htmlSnippet = "Failed to snapshot: " + (snapErr as any).message;
                    }
                }

                if (Sentry.captureException) {
                    Sentry.captureException(error, {
                        contexts: {
                            "page_dump": {
                                html_preview: htmlSnippet
                            }
                        }
                    });
                }
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
