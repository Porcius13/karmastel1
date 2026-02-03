import * as Sentry from "@sentry/nextjs";
import { getScraper } from "./scrapers/registry";
import { getBrowser, smartPriceParse, fetchStaticHtml, isBotChallenge } from "./scrapers/utils";
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
                    if (isBotChallenge(staticData.title, html)) {
                        console.log(`[Hybrid Scraper] Static extraction detected BOT CHALLENGE for ${domainName}`);
                        Sentry.addBreadcrumb({ category: "scraper.static", message: "Bot challenge detected in static HTML", level: "warning" });
                    } else {
                        console.log(`[Hybrid Scraper] Static extraction SUCCESS for ${domainName}`);
                        return staticData;
                    }
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

            // --- ADVANCED STEALTH INJECTION ---
            await page.evaluateOnNewDocument(() => {
                // Pass the Webdriver Test
                Object.defineProperty(navigator, 'webdriver', { get: () => false });

                // Pass the Chrome Test
                // @ts-ignore
                window.chrome = { runtime: {} };

                // Pass the Permissions Test
                const originalQuery = window.navigator.permissions.query;
                // @ts-ignore
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );

                // Pass the Plugins Test
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

                // Pass the Languages Test
                Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });
            });

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            });
            await page.setViewport({ width: 1920, height: 1080 });

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            Sentry.addBreadcrumb({ category: "scraper.puppeteer", message: "Navigating to page" });
            await page.goto(cleanUrlStr, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await new Promise(r => setTimeout(r, 1000));

            const result = await scraper({ url: cleanUrlStr, domain: domainName, browser, page });

            // Detect Challenge after specialized scraping as well
            const pageTitle = await page.title();
            const pageContent = await page.content();
            if (isBotChallenge(pageTitle, pageContent)) {
                throw new Error(`Bot challenge detected (Cloudflare/WAF) for ${domainName}`);
            }

            if (result.price === 0) {
                Sentry.captureMessage(`Zero Price Detected: ${domainName}`, {
                    level: "warning",
                    contexts: { "scraped_data": result as any }
                });
            }

            return result;

        } catch (error: any) {
            console.error(`Scraping failed for ${domainName}:`, error.message);

            Sentry.captureException(error, {
                extra: { url: cleanUrlStr, domain: domainName }
            });

            // Critical for serverless environments
            await Sentry.flush(2000);

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
