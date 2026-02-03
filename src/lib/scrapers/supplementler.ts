import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function supplementlerScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page, url, domain } = context;

    const data = await page.evaluate(() => {
        const getMeta = (name: string) =>
            document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
            document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');

        // Main Image: cloudzoom class is used for high-res images on Supplementler/Vitaminler
        let image = "";
        const zoomImg = document.querySelector('.cloudzoom') as HTMLImageElement;
        if (zoomImg) {
            image = zoomImg.src || zoomImg.getAttribute('data-cloudzoom') || "";
            // data-cloudzoom might contain a JSON string, try to extract zoomImage property
            if (image.includes('zoomImage')) {
                try {
                    const match = image.match(/zoomImage\s*:\s*["']([^"']+)["']/);
                    if (match) image = match[1];
                } catch (e) { }
            }
        }

        if (!image) {
            image = getMeta('og:image') || "";
        }

        // Price
        const priceSelectors = [
            '.product-price',
            '.price',
            '[itemprop="price"]',
            '.current-price'
        ];
        let priceText = "";
        for (const selector of priceSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                priceText = el.textContent.trim();
                break;
            }
        }

        if (!priceText) {
            priceText = getMeta('product:price:amount') || "0";
        }

        return {
            title: getMeta('og:title') || document.title,
            price: priceText,
            image: image,
            currency: getMeta('product:price:currency') || "TRY",
            inStock: !document.body.innerText.includes('Tükendi') && !document.body.innerText.includes('Stokta Yok'),
        };
    });

    return {
        title: data.title.split('|')[0].trim(),
        price: smartPriceParse(data.price),
        image: data.image,
        currency: data.currency,
        description: "",
        inStock: data.inStock,
        source: 'supplementler-specialized'
    };
}
