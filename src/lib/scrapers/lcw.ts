import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function lcwScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page } = context;

    if (!page) {
        throw new Error("LCW Scraper requires Puppeteer page");
    }

    const data = await page.evaluate(`(function() {
        function getText(sel) { return document.querySelector(sel)?.textContent?.trim() || ""; }
        function getSrc(sel) { return document.querySelector(sel)?.getAttribute('src') || ""; }

        const title = getText('h1.product-title') || getText('.product-title') || document.title;
        
        let price = "";
        
        // Strategy A: Global State (Robust)
        try {
             // @ts-ignore
             if (window.cartOperationViewModel) {
                 // @ts-ignore
                 const cvm = window.cartOperationViewModel;
                 if (cvm.ProductPricesList && cvm.ProductPricesList.length > 0) {
                     // Find the default or first price
                     const p = cvm.ProductPricesList.find((x) => x.IsDefault) || cvm.ProductPricesList[0];
                     if (p.CartPriceValue) price = p.CartPriceValue.toString();
                     else if (p.CartPrice) price = p.CartPrice;
                 }
             }
             
             // Backup Strategy B: Optimized Model
             // @ts-ignore
             if (!price && window.optimizedDetailModel) {
                 // @ts-ignore
                 const odm = window.optimizedDetailModel;
                 if (odm.Option && odm.Option.RegionBasedPriceList) {
                     // usually '1' is TR or current region
                     const regionPrice = Object.values(odm.Option.RegionBasedPriceList)[0]; 
                     // @ts-ignore
                     if (regionPrice && regionPrice.DiscountedPrice > 0) {
                        // @ts-ignore
                        price = regionPrice.DiscountedPrice.toString();
                     } else if (regionPrice && regionPrice.Price) {
                        // @ts-ignore
                        price = regionPrice.Price.toString();
                     }
                 }
             }

        } catch(e) {}

        if (!price) {
             // Strategy C: DOM
            const basketPrice = getText('.basket-discount .price') || getText('.cart-price');
            const campaignPrice = getText('.campaign-price');
            const discountedPrice = getText('.advanced-price') || getText('.discounted-price') || getText('.price');
            const rawPrice = getText('.product-price') || getText('.current-price');

            if (basketPrice) price = basketPrice;
            else if (campaignPrice) price = campaignPrice;
            else if (discountedPrice) price = discountedPrice;
            else price = rawPrice;
        }

        let image = "";
        
        // Image Strategy A: Global State
        try {
            // @ts-ignore
            if (window.optimizedDetailModel) {
                // @ts-ignore
                const odm = window.optimizedDetailModel;
                 // @ts-ignore
                if (odm.Option && odm.Option.Pictures && odm.Option.Pictures.length > 0) {
                     // @ts-ignore
                    const pic = odm.Option.Pictures.find(p => p.IsDefault) || odm.Option.Pictures[0];
                    if (pic.LargeImage) image = pic.LargeImage;
                    else if (pic.MediumImage) image = pic.MediumImage;
                }
                 // @ts-ignore
                else if (odm.ModelInfo && odm.ModelInfo.OptionImageUrlList && odm.ModelInfo.OptionImageUrlList.length > 0) {
                     // @ts-ignore
                    image = odm.ModelInfo.OptionImageUrlList[0];
                }
            }
        } catch (e) {}

        if (!image) {
             image = getSrc('.product-large-image img') || getSrc('.product-image img') || getSrc('img[loading="eager"]');
        }
        
        const outOfStock = document.body.innerText.includes('Tükendi');

        return {
            title,
            price,
            image,
            inStock: !outOfStock
        };
    })()`) as any;

    return {
        title: data.title,
        price: smartPriceParse(data.price),
        image: data.image,
        currency: "TRY",
        description: "",
        inStock: data.inStock,
        source: 'lcw-scraper'
    };
}
