import path from "path";
import fs from "fs";
import * as Sentry from "@sentry/nextjs";

// --- INTERFACES ---

export interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    inStock: boolean;
    source: 'meta-tag' | 'json-ld' | 'dom-selectors' | 'regex-scan' | 'manual';
    error?: string;
}

// --- SMART PRICE PARSER ---

function smartPriceParse(raw: any): number {
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;

    let str = raw.toString().trim();
    // Remove invalid chars but keep digits, commas, dots
    str = str.replace(/[^\d.,]/g, "");

    if (!str) return 0;

    // Zara / Integer Cents check implies if no dot/comma, it might be cents?
    // User logic: "Zara için fiyatın son iki hanesinin kuruş olduğunu anlayan"
    // However, usually we can rely on punctuation.
    // Let's implement robust punctuation detection.

    // 1. Remove thousands separators
    // If we have both , and . -> The last one is decimal separator.
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // comma is decimal (1.234,50)
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            // dot is decimal (1,234.50)
            str = str.replace(/,/g, "");
        }
    } else if (str.includes(',')) {
        // Only comma. 
        // 123,45 -> decimal
        // 1,234 -> typically thousands if 3 digits after, but in TR comma is usually decimal.
        // Rule: Treat comma as decimal unless it looks exactly like 1,234 (3 decimals) AND we are very sure.
        // Actually, in Turkey, comma is standard decimal.
        str = str.replace(",", ".");
    } else if (str.includes('.')) {
        // Only dot. 
        // 123.45 -> decimal
        // 1.234 -> could be thousands (TR) or decimal (US).
        // Ambiguity. If we assume TR context:
        // 1.234 -> 1234
        // 10.999 -> 10999
        // 10.99 -> 10.99
        const parts = str.split('.');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            // If last part is exactly 3 digits, it's likely a thousands separator in TR context
            // EXCEPT if it is a small number like 1.234 TL (Price). 
            // Ideally we want to be safe. 
            // Let's assume dot is decimal unless multiple dots exist.
            if (parts.length > 2) {
                // 1.234.567 -> remove dots
                str = str.replace(/\./g, "");
            } else {
                if (lastPart.length === 3) {
                    // 1.234 -> 1234
                    str = str.replace(".", "");
                }
                // else 1.99 -> 1.99, leave it
            }
        }
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

// Special Zara-like cleaner for regex results that might be raw ints
function cleanRegexPrice(raw: string): number {
    // If string is like "179000" (Zara sometimes sends this for 1790.00)
    // We need context. For now, use smartPriceParse.
    return smartPriceParse(raw);
}


// --- BROWSER CONFIG ---

async function getBrowser() {
    if (process.env.NODE_ENV === 'production') {
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteerCore = (await import('puppeteer-core')).default;
        const chromiumAny = chromium as any;
        chromiumAny.setGraphicsMode = false;

        const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

        try {
            const execPath = await chromiumAny.executablePath(remoteExecutablePath);
            return await puppeteerCore.launch({
                args: [...chromiumAny.args, "--hide-scrollbars", "--disable-web-security", "--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
                defaultViewport: { width: 1366, height: 768, deviceScaleFactor: 1 },
                executablePath: execPath,
                headless: chromiumAny.headless,
                ignoreHTTPSErrors: true,
            } as any);
        } catch (launchError) {
            console.error("Browser launch error (Vercel):", launchError);
            throw launchError;
        }
    } else {
        try {
            const puppeteer = (await import('puppeteer')).default;
            return await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
            });
        } catch (err) {
            console.error("Local puppeteer import failed.", err);
            throw err;
        }
    }
}

// --- SCRAPER FUNCTION ---

export async function scrapeProduct(url: string): Promise<ScrapedData> {
    if (!url) throw new Error("URL is required");

    return Sentry.withScope(async (scope) => {
        const domainName = new URL(url).hostname.replace('www.', '');
        scope.setTag("site", domainName);
        scope.setTag("scraper_mode", "hybrid_regex");

        let browser = null;

        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media', 'other'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // 1. NAVIGATION (Robust 25s Timeout)
            try {
                console.log("Navigating to:", url);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
            } catch (error) {
                console.warn("Navigation Timeout (25s) - Proceeding to extraction...");
            }

            // Wait for JSON-LD settling
            await new Promise(r => setTimeout(r, 1000));

            // Hepsiburada Specific Lazy Load Trigger
            if (url.includes('hepsiburada')) {
                try {
                    await page.evaluate(() => window.scrollBy(0, 1000));
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) { }
            }

            // 2. DOM EVALUATION (First Priority)
            const domData = await page.evaluate(() => {
                const result: any = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "manual" };

                // In-Browser Helper
                const safePrice = (val: any) => {
                    // Re-implement simplified smart parse logic in browser or just return string
                    // We will parse properly in Node context using smartPriceParse
                    if (!val) return "";
                    return val.toString().trim();
                };

                const cleanUrl = (raw: any): string => {
                    if (!raw) return "";
                    let u = (Array.isArray(raw) ? raw[0] : (raw.url || raw));
                    if (typeof u !== 'string') return "";

                    // Force HTTPS
                    if (u.startsWith('//')) u = 'https:' + u;
                    if (u.startsWith('http://')) u = u.replace('http://', 'https://');

                    if (u.includes("trendyol.com") && u.includes("/mnresize/")) u = u.replace(/\/mnresize\/\d+\/\d+\//, "/");
                    return u;
                };

                // Strategy A: JSON-LD
                try {
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const script of scripts) {
                        try {
                            let json = JSON.parse(script.innerHTML);
                            if (!Array.isArray(json)) json = [json];
                            for (const item of json) {
                                // Recursive search could be better but keep it simple
                                const type = item['@type'];
                                if (type && (type === 'Product' || type.includes('Product'))) {
                                    if (item.name) result.title = item.name;
                                    if (item.image) result.image = cleanUrl(item.image);

                                    const offer = item.offers ? (Array.isArray(item.offers) ? item.offers[0] : item.offers) : null;
                                    if (offer) {
                                        result.price = safePrice(offer.price || offer.lowPrice || offer.highPrice);
                                        if (offer.priceCurrency) result.currency = offer.priceCurrency;
                                        if (offer.availability && !offer.availability.includes('InStock')) result.inStock = false;
                                        result.source = 'json-ld';
                                    }
                                    if (result.price) return result;
                                }
                            }
                        } catch (e) { }
                    }
                } catch (e) { }

                // Strategy B: Meta Tags
                if (!result.price) {
                    try {
                        const priceMeta = document.querySelector('meta[property="product:price:amount"]') || document.querySelector('meta[property="og:price:amount"]');
                        if (priceMeta) {
                            result.price = safePrice(priceMeta.getAttribute('content'));
                            result.source = 'meta-tag';
                        }
                        const imgMeta = document.querySelector('meta[property="og:image"]');
                        if (imgMeta) result.image = cleanUrl(imgMeta.getAttribute('content'));

                        const titleMeta = document.querySelector('meta[property="og:title"]');
                        if (titleMeta) result.title = titleMeta.getAttribute('content');
                    } catch (e) { }
                }

                // Strategy C: CSS Fallback
                if (!result.price) {
                    try {
                        // Hepsiburada CDN (Image Hunter)
                        if (!result.image && window.location.hostname.includes("hepsiburada")) {
                            // 1. Try OG first (already done, but double check specific Hepsiburada behavior if needed - generic covers it)

                            // 2. Scan IMG tags
                            const hbImages = Array.from(document.querySelectorAll('img')).filter(img => {
                                const s = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('original-src') || "";
                                return s.includes("hbimg.hepsiburada.net");
                            });

                            if (hbImages.length > 0) {
                                hbImages.sort((a, b) => {
                                    const getScore = (el: any) => {
                                        const s = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('original-src') || "";
                                        if (s.includes('/1500/')) return 3;
                                        if (s.includes('/1100/')) return 2;
                                        if (s.includes('/800/')) return 1;
                                        return 0;
                                    };
                                    return getScore(b) - getScore(a);
                                });

                                const best = hbImages[0];
                                let rawSrc = best.getAttribute('src') || best.getAttribute('data-src') || best.getAttribute('original-src') || "";
                                if (rawSrc.startsWith('//')) rawSrc = 'https:' + rawSrc;
                                result.image = rawSrc;
                            }
                        }

                        const priceSelectors = ['.product-price-container .prc-dsc', '.price', '.product-price', '#price_inside_buybox', '.amount'];
                        for (const sel of priceSelectors) {
                            const el = document.querySelector(sel);
                            if (el && /\d/.test(el.textContent || "")) {
                                result.price = safePrice(el.textContent);
                                result.source = 'dom-selectors';
                                break;
                            }
                        }
                    } catch (e) { }
                }

                return result;
            });

            // 3. HYBRID RECOVERY (Regex on Raw HTML)
            const finalData: ScrapedData = {
                title: domData.title || "",
                image: domData.image || "",
                price: smartPriceParse(domData.price),
                currency: domData.currency || "TRY",
                description: "",
                inStock: domData.inStock,
                source: domData.source as any
            };

            // If DOM failed to get valid price or image, try Regex
            if (finalData.price === 0 || !finalData.image) {
                console.log("DOM extraction incomplete. Attempting Regex Recovery...");
                const html = await page.content();

                // Regex Price
                if (finalData.price === 0) {
                    const pricePatterns = [/"price"\s*:\s*([\d.]+)/, /data-price="([\d.]+)"/, /"amount"\s*:\s*"?([\d.]+)"?/];
                    for (const p of pricePatterns) {
                        const m = html.match(p);
                        if (m && m[1]) {
                            finalData.price = smartPriceParse(m[1]);
                            finalData.source = 'regex-scan';
                            break;
                        }
                    }
                }

                // Regex Image (Hepsiburada / Generic)
                if (!finalData.image) {
                    // Hepsiburada Advanced Regex (Protocol insensitive)
                    const hbMatches = Array.from(html.matchAll(/(?:https?:)?\/\/hbimg\.hepsiburada\.net\/[^"'\s>]+/g));
                    if (hbMatches.length > 0) {
                        let links = hbMatches.map(m => m[0]); // Match entire definition

                        // Cleanup Protocols
                        links = links.map(l => l.startsWith('//') ? 'https:' + l : l);

                        // Sort by resolution
                        links.sort((a, b) => {
                            const score = (s: string) => {
                                if (s.includes('/1500/')) return 3;
                                if (s.includes('/1100/')) return 2;
                                if (s.includes('/800/')) return 1;
                                return 0;
                            };
                            return score(b) - score(a);
                        });
                        finalData.image = links[0];
                        if (finalData.image.includes('/mnresize/')) finalData.image = finalData.image.replace(/\/mnresize\/\d+\/\d+\//, "/");
                    } else {
                        const jsonImg = html.match(/"image"\s*:\s*"(https:\/\/[^"]+)"/);
                        if (jsonImg) finalData.image = jsonImg[1];
                    }
                }

                // Regex Title
                if (!finalData.title) {
                    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/);
                    if (nameMatch) finalData.title = nameMatch[1];
                }
            }

            // Fallback Placeholder
            if (!finalData.image) {
                Sentry.captureMessage(`Scraper Warning: Missing Image for ${url}`, "warning");
                finalData.image = "https://placehold.co/600x600?text=No+Image";
            }
            if (finalData.price === 0) {
                Sentry.captureMessage(`Scraper Warning: Zero Price for ${url}`, "warning");
                finalData.source = 'manual';
            }

            // Debug
            if (process.env.NODE_ENV !== 'production') {
                await page.screenshot({ path: path.resolve(process.cwd(), 'debug_last_run.png') });
            }

            return finalData;

        } catch (error: any) {
            console.warn(`Scraping failed for ${url}:`, error);
            Sentry.captureException(error);
            return {
                title: "",
                image: "",
                description: "",
                price: 0,
                currency: "TRY",
                inStock: true,
                source: 'manual',
                error: error.message
            };
        } finally {
            if (browser) await browser.close();
        }
    });
}
