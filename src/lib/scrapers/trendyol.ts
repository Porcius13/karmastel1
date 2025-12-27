import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function trendyolScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page } = context;

    const result = await page.evaluate(`() => {
        const res = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "trendyol-state" };
        try {
            const ep = window["__envoy_product-detail__PROPS"] || window["__PRODUCT_DETAIL_APP_INITIAL_STATE__"];
            if (ep && ep.product) {
                const p = ep.product;
                res.title = p.name || "";
                const v = p.winnerVariant || (p.variants && p.variants[0]);
                if (v && v.price && v.price.discountedPrice) {
                    res.price = v.price.discountedPrice.value + "";
                }
                if (p.images && p.images[0]) res.image = p.images[0];
            } else {
                // DOM Fallback for Trendyol
                res.title = document.querySelector('.pr-new-br span')?.textContent || "";
                res.price = document.querySelector('.prc-dsc')?.textContent || "";
                res.image = document.querySelector('.product-container img')?.src || "";
                res.source = "trendyol-dom";
            }
        } catch (e) { }
        return res;
    }`);

    return {
        ...result,
        price: smartPriceParse(result.price),
        description: "",
        image: result.image && result.image.startsWith('http') ? result.image : (result.image ? 'https:' + result.image : "")
    };
}
