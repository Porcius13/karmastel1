
import { ScraperContext, ScrapedData } from "./types";

export const zaraScraper = async ({ page }: ScraperContext): Promise<ScrapedData> => {
    if (!page) throw new Error("Zara scraper requires Puppeteer page");

    page.on('console', (msg: any) => console.log('PAGE LOG:', msg.text()));

    console.log("[Zara Scraper] Starting extraction...");

    try {
        await page.waitForSelector('h1, h2, .price__amount', { timeout: 5000 }).catch(() => console.log("Zara: Selector wait timeout"));
    } catch (e) { }

    const res: ScrapedData = {
        title: "",
        price: 0,
        currency: "TRY",
        image: "",
        description: "",
        inStock: true,
        source: "zara-scraper"
    };

    try {
        // Evaluate page content
        const data = await page.evaluate(() => {
            const result = {
                title: "",
                price: 0,
                image: "",
                currency: "TRY"
            };

            // Debug
            console.log("Zara Document Title:", document.title);
            console.log("Zara Title H1:", document.querySelector('h1')?.textContent);
            console.log("Zara Meta Price:", document.querySelector('meta[property="og:price:amount"]')?.getAttribute('content'));

            // 1. Try Meta Tags (Og tags are usually reliable on Zara)
            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
            const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ||
                document.querySelector('meta[property="og:price:amount"]')?.getAttribute('content');
            const ogCurrency = document.querySelector('meta[property="product:price:currency"]')?.getAttribute('content') ||
                document.querySelector('meta[property="og:price:currency"]')?.getAttribute('content');

            if (ogTitle) result.title = ogTitle;
            if (ogImage) result.image = ogImage;
            if (ogPrice) {
                result.price = parseFloat(ogPrice);
            }
            if (ogCurrency) result.currency = ogCurrency;

            // 2. JSON-LD Fallback
            if (!result.price) {
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                console.log("Found JSON-LD scripts:", scripts.length);
                for (const s of scripts) {
                    try {
                        const json = JSON.parse(s.textContent || "{}");
                        const items = Array.isArray(json) ? json : [json];
                        const product = items.find(i => i['@type'] === 'Product');
                        if (product) {
                            result.title = result.title || product.name;
                            result.image = result.image || (Array.isArray(product.image) ? product.image[0] : product.image);

                            const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                            if (offer) {
                                result.price = parseFloat(offer.price || offer.highPrice || 0);
                                result.currency = offer.priceCurrency || "TRY";
                            }
                        }
                    } catch (e) { }
                }
            }

            // 3. Zara Specific Window Object (window.zara.viewPayload)
            // Sometimes available in hydration state
            try {
                // @ts-ignore
                if (window.zara) {
                    console.log("Found window.zara");
                    console.log("Keys in window.zara:", JSON.stringify(Object.keys((window as any).zara)));

                    // @ts-ignore
                    const payload = window.zara.viewPayload || window.zara.appPayload;
                    if (payload) {
                        console.log("Found payload:", JSON.stringify(Object.keys(payload)));
                        // @ts-ignore
                        if (payload.analyticsData) {
                            console.log("Found analyticsData:", JSON.stringify(payload.analyticsData));
                        }
                        // @ts-ignore
                        if (payload.docInfo) {
                            console.log("Found docInfo:", JSON.stringify(payload.docInfo));
                        }

                        if (payload.product) {
                            console.log("Found payload.product:", JSON.stringify(Object.keys(payload.product)));
                        } else {
                            console.log("payload.product missing. Checking other keys...");
                        }
                    } else {
                        console.log("viewPayload/appPayload MISSING in window.zara");
                    }

                    // @ts-ignore
                    if (window.zara.viewPayload && window.zara.viewPayload.product) {
                        // @ts-ignore
                        const p = window.zara.viewPayload.product;
                        result.title = result.title || p.name;
                        // @ts-ignore
                        const detail = p.detail;
                        if (detail && detail.colors) {
                            // @ts-ignore
                            const color = detail.colors[0];
                            if (color) {
                                result.image = result.image || (color.mainImgs && color.mainImgs[0] ? color.mainImgs[0].url : "");
                                result.price = result.price || (color.price / 100); // Zara often stores price in cents
                            }
                        }
                    }
                } else {
                    console.log("window.zara NOT found");
                }
            } catch (e) { }

            // 4. Try DOM Selectors (Last Resort)
            if (!result.price) {
                const priceEl = document.querySelector('.price__amount') || document.querySelector('.price-current__amount');
                if (priceEl) {
                    const text = priceEl.textContent || "";
                    const digits = text.replace(/[^\d]/g, "");
                    if (digits) result.price = parseFloat(digits) / 100; // Zara usually ok without cents? Check.
                }
            }

            // 5. "Grep" Strategy: Find Product ID in global state
            try {
                // Extract ID from URL (e.g. -p03046029.html -> 03046029)
                const urlIdMatch = document.location.href.match(/-p(\d+)\.html/);
                if (urlIdMatch) {
                    const id = urlIdMatch[1];
                    console.log("Extracted Product ID:", id);

                    // Helper to find object in tree
                    const findInTree = (obj: any, targetId: string): any => {
                        if (!obj || typeof obj !== 'object') return null;
                        if (obj.id == targetId || obj.k == targetId || obj.catentryId == targetId) return obj;

                        for (const key in obj) {
                            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                const res = findInTree(obj[key], targetId);
                                if (res) return res;
                            }
                        }
                        return null;
                    };

                    // Search in window.zara
                    // @ts-ignore
                    if (window.zara && window.zara.viewPayload) {
                        // @ts-ignore
                        const productFound = findInTree(window.zara.viewPayload, id);
                        if (productFound) {
                            console.log("Found product via Grep:", JSON.stringify(productFound).slice(0, 200));
                            result.title = result.title || productFound.name || productFound.title;
                            // Try to find price in the found object or its 'detail.colors'
                            if (productFound.detail && productFound.detail.colors) {
                                const color = productFound.detail.colors[0];
                                if (color) {
                                    result.price = result.price || (color.price / 100);
                                    result.image = result.image || (color.mainImgs?.[0]?.url || "");
                                }
                            } else if (productFound.price) {
                                result.price = result.price || (parseInt(productFound.price) / 100);
                            }
                        }
                    }
                }
            } catch (e: any) { console.log("Grep error:", e.message) }

            return result;
        });

        res.title = data.title;
        res.price = data.price;
        res.image = data.image;
        if (data.currency) res.currency = data.currency;

        // Clean image URL if relative
        if (res.image && res.image.startsWith("//")) {
            res.image = "https:" + res.image;
        }

    } catch (e) {
        console.error("[Zara Scraper] Error:", e);
    }

    return res;
};
