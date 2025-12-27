import { BaseScraper, smartPriceParse } from "./base";
import { ScrapedData } from "../types";
import { getBrowser } from "../browser";

export class AmazonScraper extends BaseScraper {
    async scrape(url: string): Promise<ScrapedData> {
        console.log(`[Amazon Scraper] Starting Dedicated Strategy for: ${url}`);
        let browser = null;
        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            // Randomize User Agent slightly or use a proven desktop one
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
            await page.setUserAgent(userAgent);

            // Set headers to look like a real browser visiting Amazon
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com/'
            });

            await page.setViewport({ width: 1366, height: 768 });

            // Block resources to speed up and reduce detection surface
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                if (['image', 'font', 'media'].includes(type) || req.url().includes('google-analytics')) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

            // Try to dismiss location modal or splashes if they appear (Amazon TR sometimes has one)
            try {
                await page.evaluate(() => {
                    const dismissBtn = document.querySelector('input[data-action-type="DISMISS_GLOW_UCC_TOAST"]');
                    if (dismissBtn) (dismissBtn as HTMLElement).click();
                });
            } catch (e) { }

            // Extract Data
            const data = await page.evaluate(() => {
                const res = { title: "", price: 0, image: "", currency: "TRY", inStock: true, source: "manual" };

                // 1. Title
                const titleEl = document.getElementById('productTitle');
                if (titleEl) res.title = titleEl.textContent?.trim() || "";

                // 2. Price
                // Amazon has many price selectors. We try the most common ones.
                const priceSelectors = [
                    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
                    '#corePrice_feature_div .a-price .a-offscreen',
                    '.a-price.a-text-price.a-size-medium .a-offscreen',
                    '#price_inside_buybox',
                    '#priceblock_ourprice',
                    '#priceblock_dealprice'
                ];

                for (const sel of priceSelectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const txt = el.textContent?.trim();
                        if (txt) {
                            // Extract numbers. Amazon TR uses "1.299,00 TL" format usually.
                            // We return the raw string to be parsed by smartPriceParse outside if needed, 
                            // but here we can try to be smart inside eval too.
                            // Let's return raw string for now and parse later to be safe, or do simple cleanup.
                            // Actually, let's keep it simple: return raw text.
                            // But BaseScraper expects us to return clean numbers usually or we handle it here.
                            // Let's return the raw text in a temp property or just parse it here:
                            // Remove non-numeric except , and .
                            // 1.250,50 -> remove dots -> 1250,50 -> replace comma with dot -> 1250.50
                            const clean = txt.replace(/[^\d.,]/g, '');
                            // Check if it looks like TR format (comma at end)
                            if (clean.includes(',') && !clean.includes('.')) {
                                res.price = parseFloat(clean.replace(',', '.'));
                            } else if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                                // 1.250,50
                                res.price = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
                            } else {
                                // 1,250.50 (US)
                                res.price = parseFloat(clean.replace(/,/g, ''));
                            }
                            if (res.price) break;
                        }
                    }
                }

                // 3. Image
                // Try dynamic image data first (high res)
                const imgContainer = document.getElementById('imgTagWrapperId') || document.getElementById('landingImage');
                if (imgContainer) {
                    const dynData = imgContainer.getAttribute('data-a-dynamic-image');
                    if (dynData) {
                        try {
                            const parsed = JSON.parse(dynData);
                            // Get last key (usually largest)
                            const keys = Object.keys(parsed);
                            if (keys.length > 0) res.image = keys[keys.length - 1];
                        } catch (e) { }
                    }
                    if (!res.image && (imgContainer as HTMLImageElement).src) {
                        res.image = (imgContainer as HTMLImageElement).src; // Fallback
                    }
                }

                if (!res.image) {
                    const fallbackImg = document.querySelector('#landingImage, #imgBlkFront, #main-image');
                    if (fallbackImg) res.image = (fallbackImg as HTMLImageElement).src;
                }

                // 4. Stock
                const stockEl = document.getElementById('availability');
                if (stockEl) {
                    const text = stockEl.textContent?.toLowerCase() || "";
                    if (text.includes('stokta yok') || text.includes('currently unavailable')) {
                        res.inStock = false;
                    }
                }

                res.source = 'amazon-dom';
                return res;
            });

            if (data.title) {
                return {
                    title: data.title,
                    price: data.price,
                    image: data.image, // Amazon images usually don't need extensive cleaning if grabbed from dynamic data
                    currency: "TRY", // Defualt to TRY for amazon.com.tr
                    description: "",
                    inStock: data.inStock,
                    source: "amazon-dom"
                };
            }

            return this.getFailResult("Amazon Scraper could not find product title");

        } catch (error: any) {
            console.error(`[Amazon Scraper Error]:`, error.message);
            return this.getFailResult(error.message);
        } finally {
            if (browser) await browser.close();
        }
    }
}
