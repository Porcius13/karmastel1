import { ScrapedData, ScraperContext } from "./types";
import { getBrowser } from "./utils";

export async function hmScraper(context: ScraperContext): Promise<ScrapedData> {
    const { url, domain } = context;
    console.log(`[H&M Scraper] Starting extraction for ${url}`);

    let browser = context.browser;
    let page = context.page;
    let ownBrowser = false;

    try {
        if (!browser) {
            browser = await getBrowser();
            ownBrowser = true;
        }
        if (!page) {
            page = await browser.newPage();
            // Use the same modern User-Agent and Headers as the global scraper
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
        }

        // Strategy: Go to Home Page first to set cookies/session
        console.log("Navigating to H&M Home to establish session...");
        await page.goto('https://www2.hm.com/tr_tr/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000)); // Wait for cookies

        console.log("Navigating to Product Page...");
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for some content
        try {
            await page.waitForSelector('h1, .product-item-headline, #product-price', { timeout: 10000 });
        } catch (e) { }

        page.on('console', (msg: any) => console.log('H&M PAGE LOG:', msg.text()));

        const data = await page.evaluate(() => {
            console.log("H&M Title:", document.title);
            console.log("H&M H1:", document.querySelector('h1')?.textContent);

            // @ts-ignore
            if (window.productArticleDetails) {
                // @ts-ignore
                console.log("Found productArticleDetails keys:", JSON.stringify(Object.keys(window.productArticleDetails)));
            } else {
                console.log("window.productArticleDetails NOT found");
            }

            const res = {
                title: "",
                price: 0,
                image: "",
                currency: "TRY",
                inStock: true
            };

            // 1. Try JSON-LD (Schema.org)
            try {
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                for (const s of scripts) {
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
                }
            } catch (e) { }

            // 2. Try H&M Specific "productArticleDetails"
            // Usually in window.productArticleDetails or similar
            // @ts-ignore
            if (!res.price && window.productArticleDetails) {
                // @ts-ignore
                const pad = window.productArticleDetails;
                // Find the active article if possible, usually the first one or matching URL
                const keys = Object.keys(pad);
                if (keys.length > 0) {
                    const article = pad[keys[0]];
                    res.title = res.title || article.name;
                    res.image = res.image || (article.images && article.images[0] ? article.images[0].url : "");
                    if (article.whitePriceValue) res.price = parseFloat(article.whitePriceValue);
                    else if (article.priceValue) res.price = parseFloat(article.priceValue);
                }
            }

            // 3. Metadata Fallback
            if (!res.price) {
                const ogPrice = document.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
                if (ogPrice) res.price = parseFloat(ogPrice);

                const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
                if (ogTitle) res.title = ogTitle;

                const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
                if (ogImage) res.image = ogImage;
            }

            // 4. Generic Selectors
            if (!res.price) {
                const priceEl = document.querySelector('#product-price') ||
                    document.querySelector('.price-value') ||
                    document.querySelector('.product-item-headline');

                if (priceEl) {
                    const text = priceEl.textContent || "";
                    const digits = text.replace(/[^\d]/g, "");
                    if (digits) res.price = parseFloat(digits) / 100;
                }
            }

            // 5. Aggressive Regex Fallback (Last Resort)
            if (!res.price) {
                const bodyText = document.body.innerText;
                // Look for patterns like "1.299,00 TL" or "₺1.299,00"
                const priceMatch = bodyText.match(/(\d{1,3}(\.\d{3})*,\d{2})\s?TL/);
                if (priceMatch) {
                    const digits = priceMatch[1].replace(/[^\d]/g, "");
                    res.price = parseFloat(digits) / 100;
                }
            }

            return res;
        });

        if (data.image && data.image.startsWith("//")) data.image = "https:" + data.image;

        return {
            title: data.title || "H&M Ürün",
            price: data.price || 0,
            image: data.image || "",
            currency: data.currency || "TRY",
            description: "",
            inStock: data.inStock,
            source: 'hm-scraper',
            error: data.price === 0 ? "H&M Price not found" : undefined
        };

    } catch (e: any) {
        console.error("[H&M Scraper] Error:", e);
        return {
            title: "H&M Hata",
            price: 0,
            image: "",
            currency: "TRY",
            description: "",
            inStock: true,
            source: "hm-scraper",
            error: e.message
        };
    } finally {
        if (ownBrowser && browser) {
            await browser.close();
        }
    }
}
