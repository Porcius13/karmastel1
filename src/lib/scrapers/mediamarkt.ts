import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function mediamarktScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page, url, domain } = context;

    const data = await page.evaluate(() => {
        const getMeta = (name: string) =>
            document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ||
            document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
            document.querySelector(`meta[itemprop="${name}"]`)?.getAttribute('content');

        // Target MediaMarkt specific price selectors
        const priceSelectors = [
            '[data-testid="price-amount"]',
            '.price-box .price',
            '.current-price',
            '.price-tag',
            '.product-price'
        ];

        let priceText = "";
        for (const selector of priceSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) {
                priceText = el.textContent.trim();
                break;
            }
        }

        return {
            title: getMeta('og:title') || document.title,
            price: priceText || getMeta('product:price:amount') || getMeta('price') || "0",
            image: getMeta('og:image') || "",
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
        source: 'mediamarkt-specialized'
    };
}
