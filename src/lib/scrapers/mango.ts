
import { ScrapedData, ScraperContext } from "./types";

export const mangoScraper = async ({ page }: ScraperContext): Promise<ScrapedData> => {
    if (!page) throw new Error("Mango scraper requires Puppeteer page");
    console.log("[Mango Scraper] Starting extraction...");

    // Wait for content (Mango is SPA)
    try {
        await page.waitForSelector('h1, .product-features-prices__price', { timeout: 10000 });
    } catch (e) {
        console.log("Mango: Selector wait timeout");
    }

    const data = await page.evaluate(() => {
        const res = {
            title: "",
            price: 0,
            image: "",
            currency: "TRY",
            inStock: true
        };

        // 1. JSON-LD
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
            try {
                const json = JSON.parse(s.textContent || "{}");
                const items = Array.isArray(json) ? json : [json];
                const product = items.find(i => i['@type'] === 'Product');
                if (product) {
                    res.title = product.name;
                    res.image = Array.isArray(product.image) ? product.image[0] : product.image;
                    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
                    if (offer) {
                        res.price = parseFloat(offer.price);
                        res.currency = offer.priceCurrency;
                        if (offer.availability && offer.availability.includes("OutOfStock")) res.inStock = false;
                    }
                }
            } catch (e) { }
        }

        // 2. Meta Tags
        if (!res.price) {
            const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
            if (ogPrice) res.price = parseFloat(ogPrice);

            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
            if (ogTitle) res.title = ogTitle;

            const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            if (ogImage) res.image = ogImage;
        }

        // 3. DOM Selectors
        if (!res.price) {
            const priceEl = document.querySelector('.product-features-prices__price') ||
                document.querySelector('.product-sale') ||
                document.querySelector('span[data-testid="current-price"]'); // Possible new selector

            if (priceEl) {
                const text = priceEl.textContent || "";
                const digits = text.replace(/[^\d]/g, ""); // e.g. 1.299,99 TL
                if (digits) res.price = parseFloat(digits) / 100;
            }
        }

        // 4. Aggressive Fallback (Regex search in body)
        if (!res.price) {
            const bodyText = document.body.innerText;
            // Look for patterns like "1.299,99 TL" or "₺1.299,99" close to "price" or just isolated
            // This is risky but better than 0.
            // Try to find the first price-like string that is not a phone number or date
            const priceMatch = bodyText.match(/(\d{1,3}(\.\d{3})*,\d{2})\s?TL/);
            if (priceMatch) {
                const digits = priceMatch[1].replace(/[^\d]/g, "");
                res.price = parseFloat(digits) / 100;
            }
        }

        // Title fallback (always try to get title if not found yet)
        const titleEl = document.querySelector('h1');
        if (titleEl && !res.title) res.title = titleEl.textContent?.trim() || "";

        return res;
    });

    return {
        title: data.title || "",
        price: data.price || 0,
        image: data.image || "",
        currency: data.currency || "TRY",
        description: "",
        inStock: data.inStock,
        source: "mango-scraper",
        error: data.price === 0 ? "Mango Price not found" : undefined
    };
};
