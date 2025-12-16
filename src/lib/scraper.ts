import path from "path";
import fs from "fs";

// --- INTERFACES ---

export interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    source: 'json-ld' | 'regex-scan' | 'visual-scan' | 'dom-selectors' | 'manual';
    error?: string;
}

// --- HELPERS ---

function cleanPrice(text: string | number | undefined | null): number {
    if (text === null || text === undefined) return 0;
    if (typeof text === 'number') return text;

    let cleaned = text.toString().replace(/\s+/g, "").trim();
    cleaned = cleaned.replace(/tl|try|usd|eur|\$|€|£|₺/gi, "");

    // Handle Turkish number format (1.234,56 -> 1234.56)
    if (cleaned.includes(",") && cleaned.includes(".")) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
        cleaned = cleaned.replace(",", ".");
    }

    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
}

// --- BROWSER CONFIG ---

async function getBrowser() {
    if (process.env.NODE_ENV === 'production') {
        // Vercel / AWS Lambda
        // Dynamic imports to avoid "Module not found" if packages are missing locally
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteerCore = (await import('puppeteer-core')).default;

        return await puppeteerCore.launch({
            args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
            defaultViewport: { width: 1920, height: 1080 },
            executablePath: await chromium.executablePath(),
            headless: chromium.headless === 'false' ? false : chromium.headless,
            ignoreHTTPSErrors: true,
        });
    } else {
        // Local Development
        // Use standard 'puppeteer' package
        try {
            const puppeteer = (await import('puppeteer')).default;
            return await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (err) {
            console.error("Local puppeteer import failed. Ensure 'puppeteer' is installed.", err);
            throw err;
        }
    }
}

// --- SCRAPER FUNCTION ---

export async function scrapeProduct(url: string): Promise<ScrapedData> {
    if (!url) {
        throw new Error("URL is required");
    }

    let browser = null;

    try {
        browser = await getBrowser();
        const page = await browser.newPage();

        await page.setViewport({ width: 1280, height: 800 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for dynamic content - Replacing waitForTimeout
        await new Promise(resolve => setTimeout(resolve, 2000));

        // --- DEEP SCAN EVALUATION ---
        const rawData = await page.evaluate(() => {
            const result: any = {
                title: "",
                price: "",
                image: "",
                currency: "TRY",
                source: "manual"
            };

            // 1. Basic Metadata
            const h1 = document.querySelector('h1#product-name') || document.querySelector('h1.product-name') || document.querySelector('h1');
            if (h1 && h1.textContent) result.title = h1.textContent.trim();
            else result.title = document.title;

            const img: any = document.querySelector('img.product-image') || document.querySelector('.product-image-wrapper img');
            if (img && img.src) result.image = img.src;

            // METHOD A: DEEP JSON-LD SCAN
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const script of scripts) {
                    const content = script.innerHTML;
                    if (!content) continue;
                    try {
                        let json = JSON.parse(content);
                        if (!Array.isArray(json)) json = [json];

                        const searchJson = (obj: any): any => {
                            if (!obj || typeof obj !== 'object') return null;
                            if (obj['@type'] === 'Product' || obj['@type'] === 'http://schema.org/Product') {
                                if (obj.offers) return obj;
                            }
                            for (const key in obj) {
                                const found = searchJson(obj[key]);
                                if (found) return found;
                            }
                            return null;
                        };

                        for (const item of json) {
                            const product = searchJson(item);
                            if (product) {
                                const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
                                for (const offer of offers) {
                                    if (offer.price || offer.lowPrice || offer.highPrice) {
                                        result.price = offer.price || offer.lowPrice || offer.highPrice;
                                        result.currency = offer.priceCurrency || "TRY";
                                        result.source = 'json-ld';
                                        if (!result.title && product.name) result.title = product.name;
                                        if (!result.image && product.image) {
                                            result.image = Array.isArray(product.image) ? product.image[0] : product.image;
                                        }
                                        return result;
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                }
            } catch (e) { }

            if (result.price) return result;

            // METHOD B: REGEX SCRIPT SCAN
            try {
                const html = document.body.innerHTML;
                const priceRegex = /"(?:price|amount|value)"\s*:\s*["']?(\d+(?:\.\d+)?)["']?/g;
                let match;
                while ((match = priceRegex.exec(html)) !== null) {
                    const p = parseFloat(match[1]);
                    if (!isNaN(p) && p > 10) {
                        result.price = p;
                        result.source = 'regex-scan';
                        return result;
                    }
                }
            } catch (e) { }

            if (result.price) return result;

            // METHOD C: VISUAL SCAN
            try {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let node;
                const candidates = [];
                while (node = walker.nextNode()) {
                    const txt = node.textContent?.trim();
                    if (txt && (txt.includes('TL') || txt.includes('₺')) && /\d/.test(txt)) {
                        if (txt.length < 30) {
                            const parent = node.parentElement;
                            if (parent) {
                                const style = window.getComputedStyle(parent);
                                const fontSize = parseFloat(style.fontSize);
                                candidates.push({ txt, fontSize, parent });
                            }
                        }
                    }
                }
                candidates.sort((a, b) => b.fontSize - a.fontSize);
                if (candidates.length > 0) {
                    result.price = candidates[0].txt;
                    result.source = 'visual-scan';
                    return result;
                }
            } catch (e) { }

            return result;
        });

        // Debugging
        if (!rawData.price || rawData.price === 0) {
            console.warn("Deep scan failed to find price. Saving debug files...");
            // Only save files in development
            if (process.env.NODE_ENV !== 'production') {
                try {
                    const html = await page.content();
                    fs.writeFileSync(path.resolve(process.cwd(), 'debug-html.txt'), html);
                    await page.screenshot({ path: path.resolve(process.cwd(), 'debug-error.png') });
                } catch (e) { console.warn("Could not save debug files", e); }
            }
        }

        const finalData: ScrapedData = {
            title: rawData.title || "",
            image: rawData.image || "",
            description: "",
            price: cleanPrice(rawData.price),
            currency: rawData.currency || "TRY",
            source: rawData.source as any
        };

        if (finalData.price === 0) {
            finalData.source = 'manual';
        }

        return finalData;

    } catch (error: any) {
        console.warn(`Scraping failed for ${url}:`, error.message);
        return {
            title: "",
            image: "",
            description: "",
            price: 0,
            currency: "TRY",
            source: 'manual',
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
