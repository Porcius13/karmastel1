
import { ScrapedData, ScraperContext } from "./types";

export const beymenScraper = async ({ page }: ScraperContext): Promise<ScrapedData> => {
    if (!page) throw new Error("Beymen scraper requires Puppeteer page");
    console.log("[Beymen Scraper] Starting extraction...");

    try {
        await page.waitForSelector('h1, .o-productDetail__title', { timeout: 15000 });
    } catch (e) {
        console.log("Beymen: Selector wait timeout");
    }

    const data = await page.evaluate(() => {
        const res = {
            title: "",
            price: 0,
            image: "",
            currency: "TRY",
            inStock: true
        };

        // 1. JSON-LD (Schema.org)
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

        // 3. DOM Selectors (Beymen specific)
        if (!res.price) {
            const priceEl = document.querySelector('.m-productPrice__salePrice') || document.querySelector('.m-productPrice__lastPrice');
            if (priceEl) {
                const text = priceEl.textContent || "";
                const digits = text.replace(/[^\d,]/g, "").replace(",", "."); // 1.299,00 -> 1299.00
                // Handle different formats if needed, but usually Beymen is standard
                // Actually Beymen often uses "24.450 TL" -> remove dots, replace comma?
                // Standard helper logic needed.
                const raw = text.replace(/[^\d]/g, ""); // 2445000 for 24.450,00?
                // Let's rely on smart parse or simple regex
                // Beymen: "24.450,00 TL"
                // remove . -> "24450,00" -> replace , with . -> "24450.00"
                const clean = text.replace(/\./g, "").replace(",", ".");
                const p = parseFloat(clean);
                if (!isNaN(p)) res.price = p;
            }

            const titleEl = document.querySelector('.o-productDetail__title span') || document.querySelector('h1.o-productDetail__title');
            if (titleEl && !res.title) res.title = titleEl.textContent?.trim() || "";
        }

        return res;
    });

    if (data.image && data.image.startsWith("//")) data.image = "https:" + data.image;

    return {
        title: data.title || "",
        price: data.price || 0,
        image: data.image || "",
        currency: data.currency || "TRY",
        description: "",
        inStock: data.inStock,
        source: "beymen-scraper",
        error: data.price === 0 ? "Beymen Price not found" : undefined
    };
};
