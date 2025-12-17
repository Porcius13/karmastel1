import path from "path";
import fs from "fs";

// --- INTERFACES ---

export interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    inStock: boolean;
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

// --- BROWSER CONFIG ---

async function getBrowser() {
    if (process.env.NODE_ENV === 'production') {
        // Vercel / AWS Lambda
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteerCore = (await import('puppeteer-core')).default;

        // Optimization: Use graphics mode false
        chromium.setGraphicsMode = false;

        return await puppeteerCore.launch({
            args: [...chromium.args, "--hide-scrollbars", "--disable-web-security", "--no-sandbox", "--disable-setuid-sandbox"],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    } else {
        // Local Development
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

        // Use a realistic User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Extra Headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'tr-TR,tr;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        });

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
                inStock: true, // Default
                source: "manual"
            };

            // 0. Stock Detection Logic
            try {
                const bodyText = document.body.innerText.toLowerCase();
                const outOfStockKeywords = ["tükendi", "stokta yok", "sold out", "out of stock", "gelince haber ver"];

                // Negative Check
                let negativeKeywordFound = false;
                for (const keyword of outOfStockKeywords) {
                    if (bodyText.includes(keyword)) {
                        negativeKeywordFound = true;
                        // Don't result.inStock = false yet, wait for button check
                    }
                }

                // Positive/Button Check
                // Look for Add to Cart buttons
                const buyButtonSelectors = [
                    'button[class*="add-to-cart"]',
                    'button[class*="addToCart"]',
                    'button[id*="add-to-cart"]',
                    'a[class*="add-to-cart"]',
                    'input[type="submit"][value*="Sepete"]',
                    'button' // Fallback to all buttons and check text
                ];

                let foundBuyButton = false;
                let buyButtonDisabled = false;

                // Helper to check button text
                const isBuyButton = (el: Element) => {
                    const text = el.textContent?.toLowerCase().trim() || "";
                    const val = (el as HTMLInputElement).value?.toLowerCase().trim() || "";
                    const combined = text + val;
                    return combined.includes("sepete ekle") ||
                        combined.includes("add to cart") ||
                        combined.includes("sepete at");
                };

                // Helper to check if button is effectively disabled
                const isDisabled = (el: Element) => {
                    return el.hasAttribute('disabled') || el.classList.contains('disabled') || (el as HTMLElement).style.pointerEvents === 'none' || (el as HTMLElement).style.opacity === '0.5';
                };

                // Scan buttons
                const allButtons = document.querySelectorAll('button, a, input[type="submit"], div[role="button"]');
                for (const btn of allButtons) {
                    if (isBuyButton(btn)) {
                        foundBuyButton = true;
                        if (isDisabled(btn)) {
                            buyButtonDisabled = true;
                        } else {
                            // If we found at least one active buy button, assume in stock
                            buyButtonDisabled = false;
                            break;
                        }
                    }
                }

                if (foundBuyButton) {
                    if (buyButtonDisabled) {
                        result.inStock = false;
                    } else {
                        result.inStock = true; // Overrides previous negative keyword if button is active? Maybe.
                        // Actually if button is active, it usually means in stock.
                    }
                } else {
                    // If no buy button is found, but we found negative keywords, then it's likely out of stock
                    if (negativeKeywordFound) {
                        result.inStock = false;
                    }
                    // Else default true
                }

                // Double check negative keywords with higher priority if results are ambiguous
                // But let's trust the refined logic above for now. 
                // One edge case: "Stock: 5" might trigger "Stock" keyword if we aren't careful, but we used "stokta yok" etc.

            } catch (e) { console.log('Stock check error', e); }

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
                                    // Schema.org Availability
                                    if (offer.availability) {
                                        if (offer.availability.includes("OutOfStock") || offer.availability.includes("SoldOut")) {
                                            result.inStock = false;
                                        } else if (offer.availability.includes("InStock")) {
                                            result.inStock = true;
                                        }
                                    }

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

            // METHOD A.5: META TAGS (OPEN GRAPH / TWITTER)
            try {
                // Image
                if (!result.image) {
                    const imgMeta = document.querySelector('meta[property="og:image"]') ||
                        document.querySelector('meta[property="twitter:image"]') ||
                        document.querySelector('link[rel="image_src"]');
                    if (imgMeta) result.image = imgMeta.getAttribute('content') || imgMeta.getAttribute('href');
                }

                // Title
                if (!result.title || result.title === document.title) {
                    const titleMeta = document.querySelector('meta[property="og:title"]') ||
                        document.querySelector('meta[property="twitter:title"]') ||
                        document.querySelector('meta[name="title"]');
                    if (titleMeta) result.title = titleMeta.getAttribute('content');
                }

                // Availability Meta
                const availabilityMeta = document.querySelector('meta[property="product:availability"]') ||
                    document.querySelector('meta[property="og:availability"]');
                if (availabilityMeta) {
                    const content = availabilityMeta.getAttribute('content')?.toLowerCase();
                    if (content?.includes('out of stock') || content?.includes('oos') || content?.includes('sold out')) {
                        result.inStock = false;
                    } else if (content?.includes('in stock') || content?.includes('instock')) {
                        result.inStock = true;
                    }
                }

                // Price & Currency
                const priceMeta = document.querySelector('meta[property="og:price:amount"]') ||
                    document.querySelector('meta[property="product:price:amount"]') ||
                    document.querySelector('meta[name="twitter:data1"]');

                const currencyMeta = document.querySelector('meta[property="og:price:currency"]') ||
                    document.querySelector('meta[property="product:price:currency"]');

                if (priceMeta) {
                    const pContent = priceMeta.getAttribute('content');
                    if (pContent) {
                        result.price = pContent;
                        result.source = 'meta-tag';
                    }
                }

                if (currencyMeta) {
                    result.currency = currencyMeta.getAttribute('content') || "TRY";
                }

                // Fallback: Description Regex
                if (!result.price) {
                    const descMeta = document.querySelector('meta[name="description"]') ||
                        document.querySelector('meta[property="og:description"]');
                    if (descMeta) {
                        const desc = descMeta.getAttribute('content');
                        if (desc) {
                            const match = desc.match(/(\d+[.,]?\d*)\s*(?:TL|TRY|USD|EUR|₺)/i) || desc.match(/(?:TL|TRY|USD|EUR|₺)\s*(\d+[.,]?\d*)/i);
                            if (match) {
                                result.price = match[1];
                                result.source = 'meta-description';
                            }
                        }
                    }
                }

            } catch (e) { console.log("Meta scan error", e); }

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
            inStock: rawData.inStock,
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
            inStock: true, // Fail-safe
            source: 'manual',
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
