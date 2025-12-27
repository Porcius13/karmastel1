import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function amazonScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page, domain } = context;

    const domData = await page.evaluate(`() => {
        const result = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "amazon-selectors" };
        
        const tEl = document.querySelector('#productTitle');
        if (tEl) result.title = tEl.textContent?.trim() || "";

        const pSelectors = [
            '.a-price.reinventPricePriceToPayMargin.priceToPay .a-offscreen',
            '.a-price.apexPriceToPay .a-offscreen',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '.priceToPay .a-offscreen'
        ];
        for (const s of pSelectors) {
            const pEl = document.querySelector(s);
            if (pEl && pEl.textContent && /[0-9]/.test(pEl.textContent)) {
                result.price = pEl.textContent.trim();
                break;
            }
        }

        if (window.location.hostname.includes('.tr')) result.currency = 'TRY';
        else if (window.location.hostname.includes('.com')) result.currency = 'USD';

        const iEl = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
        if (iEl) {
            let src = iEl.getAttribute('data-old-hires') || iEl.getAttribute('data-a-dynamic-image') || iEl.src;
            const dynamicData = iEl.getAttribute('data-a-dynamic-image');
            if (dynamicData && dynamicData.startsWith('{')) {
                try {
                    const urls = Object.keys(JSON.parse(dynamicData));
                    if (urls.length > 0) src = urls[urls.length - 1]; // Get highest res
                } catch (e) { }
            }
            if (src) result.image = src.replace(/\._AC_[A-Z0-9_]+\./, '.').replace(/\._SY[0-9_]+\./, '.').replace(/\._SX[0-9_]+\./, '.');
        }

        return result;
    }`);

    return {
        title: domData.title,
        price: smartPriceParse(domData.price),
        image: domData.image,
        currency: domData.currency,
        description: "",
        inStock: domData.inStock,
        source: domData.source
    };
}
