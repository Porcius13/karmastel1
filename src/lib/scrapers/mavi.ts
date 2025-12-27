import { ScrapedData, ScraperContext } from "./types";
import { getBrowser } from "./utils";

export async function maviScraper(context: ScraperContext): Promise<ScrapedData> {
    const { url } = context;
    console.log(`[Mavi Scraper] Starting Dedicated Strategy for: ${url}`);
    let mBrowser = null;
    try {
        mBrowser = await getBrowser();
        const mPage = await mBrowser.newPage();

        // Enhanced Stealth
        await mPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await mPage.setViewport({ width: 1920, height: 1080 });
        await mPage.setExtraHTTPHeaders({
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        });

        // Evade detection
        await mPage.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            (window as any).chrome = { runtime: {} };
        });

        // Randomized delay before navigation
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));

        await mPage.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        // Wait for dynamic elements and simulate human behavior
        await new Promise(r => setTimeout(r, 4000));
        await mPage.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 1500));

        const result: any = await mPage.evaluate(() => {
            const res = { title: "", price: 0, image: "", currency: "TRY", inStock: true, source: "dom-selectors-mavi" };
            try {
                // Priority 1: JSON-LD (Most reliable for unformatted data)
                const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                for (const s of scripts) {
                    try {
                        const text = s.textContent || "";
                        if (!text.includes('"Product"')) continue;
                        const data = JSON.parse(text);
                        const items = Array.isArray(data) ? data : [data];
                        const p = items.find(i => i['@type'] === 'Product' || i.mainEntity?.['@type'] === 'Product');
                        if (p) {
                            const prod = p.mainEntity || p;
                            res.title = prod.name || res.title;
                            const offer = Array.isArray(prod.offers) ? prod.offers[0] : (prod.offers?.itemOffered?.[0]?.offers?.[0] || prod.offers);
                            if (offer && offer.price) {
                                res.price = parseFloat(offer.price);
                                res.source = 'json-ld-mavi';
                            }
                            if (prod.image) {
                                const imgUrl = Array.isArray(prod.image) ? prod.image[0] : (prod.image.contentUrl || prod.image);
                                res.image = imgUrl;
                            }
                            if (offer.availability?.includes('OutOfStock')) {
                                res.inStock = false;
                            }
                        }
                    } catch (e) { }
                }

                // Priority 2: DOM Selectors (Fallback)
                if (!res.title) {
                    const h1 = document.querySelector('.product__title') || document.querySelector('h1');
                    if (h1) res.title = h1.textContent?.trim() || "";
                }

                // Priority 1.5: Meta Tags (Very reliable on Mavi)
                if (!res.price) {
                    const metaPrice = document.querySelector('meta[name="og:price:amount"]')?.getAttribute('content') ||
                        document.querySelector('meta[property="og:price:amount"]')?.getAttribute('content');
                    if (metaPrice) {
                        res.price = parseFloat(metaPrice);
                        res.source = 'meta-tag-mavi';
                    }
                }

                if (!res.price) {
                    const priceSels = ['.product__price.-sale', '.product__price', '.product-detail-info__price'];
                    for (const sel of priceSels) {
                        const el = document.querySelector(sel);
                        if (el) {
                            const val = el.getAttribute('data-price-value') || el.textContent || "";
                            if (val) {
                                let v = val.replace(/[^\d.,]/g, "").replace(",", ".");
                                res.price = parseFloat(v) || 0;
                                if (res.price > 0) break;
                            }
                        }
                    }
                }

                if (!res.image) {
                    const img = document.querySelector('.product__gallery-item img') || document.querySelector('meta[name="og:image"]');
                    if (img) res.image = (img as HTMLImageElement).src || img.getAttribute('content') || "";
                }

            } catch (e) { }
            return res;
        });

        if (result.title && !result.title.toLowerCase().includes("blocked") && !result.title.toLowerCase().includes("cloudflare")) {
            // Clean Mavi Image URL (Remove mnresize for high res)
            if (result.image && result.image.includes('/mnresize/')) {
                result.image = result.image.replace(/\/mnresize\/\d+\/\d+\//, '/');
            }
            if (result.image && result.image.startsWith('//')) {
                result.image = 'https:' + result.image;
            }

            return {
                ...result,
                description: "",
                source: result.source
            };
        }

    } catch (e: any) {
        console.warn("[Mavi Scraper Error]:", e.message);
        if (e.message.includes("blocked")) {
            throw new Error("Mavi security block detected. Please try again later or add manually.");
        }
    } finally {
        if (mBrowser) await mBrowser.close();
    }

    return {
        title: "Mavi Ürün",
        price: 0,
        image: "https://placehold.co/600x600?text=Mavi+Product",
        currency: "TRY",
        description: "Mavi koruması nedeniyle detaylar tam alınamadı. Manuel düzenleyebilirsiniz.",
        inStock: true,
        source: 'manual',
        error: "Mavi restricted access."
    };
}
