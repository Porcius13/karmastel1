import { BaseScraper } from "./base";
import { ScrapedData } from "../types";
import { getBrowser } from "../browser";

export class MaviScraper extends BaseScraper {
    async scrape(url: string): Promise<ScrapedData> {
        console.log(`[Mavi Scraper] Starting Dedicated Strategy for: ${url}`);
        let mBrowser = null;
        try {
            mBrowser = await getBrowser();
            const mPage = await mBrowser.newPage();
            // Desktop UA is often safer for big brands to avoid "Install App" walls
            await mPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
            await mPage.setViewport({ width: 1920, height: 1080 });

            await mPage.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            // Wait for dynamic content
            await new Promise(r => setTimeout(r, 2500));

            try {
                await mPage.waitForSelector('.product__title, .product-title, h1', { timeout: 5000 });
            } catch (e) { }

            const result: any = await mPage.evaluate(function () {
                const res = { title: "", price: 0, image: "", currency: "TRY", inStock: true, source: "manual" };
                try {
                    const h1 = document.querySelector('.product__title') || document.querySelector('h1.product-title') || document.querySelector('h1');
                    if (h1) res.title = h1.textContent?.trim() || "";

                    // Price
                    const pEl = document.querySelector('.product__price -sale') || document.querySelector('[data-price-value]') || document.querySelector('.price');
                    if (pEl) {
                        const val = pEl.getAttribute('data-price-value') || pEl.textContent || "";
                        if (val) {
                            // Remove dots (thousand separators) and replace comma with dot (decimal)
                            let v = val.replace(/\./g, "").replace(",", ".");
                            res.price = parseFloat(v) || 0;
                        }
                    }

                    // Image
                    const img = document.querySelector('.product__gallery-item.swiper-slide-active img') ||
                        document.querySelector('.product-detail-carousel .slick-track img') ||
                        document.querySelector('.product__gallery img') ||
                        document.querySelector('meta[property="og:image"]') ||
                        document.querySelector('meta[name="og:image"]') ||
                        document.querySelector('link[rel="preload"][as="image"]');

                    if (img) {
                        res.image = (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src || img.getAttribute('content') || img.getAttribute('href') || "";
                    }

                    res.source = 'dom-selectors-isolated';
                } catch (e) { }
                return res;
            });

            if (result.title) {
                return {
                    title: result.title,
                    price: result.price,
                    image: result.image,
                    currency: result.currency,
                    description: "",
                    inStock: true,
                    source: result.source as any
                };
            }

            return this.getFailResult("Mavi scraper returned empty title");

        } catch (e: any) {
            console.warn("[Mavi Scraper Error]:", e.message);
            return this.getFailResult(e.message);
        } finally {
            if (mBrowser) await mBrowser.close();
        }
    }
}
