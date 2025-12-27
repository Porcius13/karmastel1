import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function defactoScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page } = context;

    if (!page) throw new Error("DeFacto Scraper requires Puppeteer page");

    const data = await page.evaluate(`(function() {
        function getText(sel) { return document.querySelector(sel)?.textContent?.trim() || ""; }
        function getSrc(sel) { return document.querySelector(sel)?.getAttribute('src') || document.querySelector(sel)?.getAttribute('data-src') || ""; }

        const title = getText('h1.product-card__name') || getText('.product-name') || document.title;
        
        let price = "";
        let image = "";
        
        try {
             // @ts-ignore
             if (window.PRODUCT_DETAIL_LASTVISITED) {
                 // @ts-ignore
                const pd = window.PRODUCT_DETAIL_LASTVISITED;
                
                // Price Strategy
                // Priority 1: CampaignBadge (Often accurate 399.99 instead of rounded 400)
                if (pd.CampaignBadge && pd.CampaignBadge.DiscountPrice > 0) {
                    price = pd.CampaignBadge.DiscountPrice.toString();
                }
                
                // Priority 2: DataLayer
                if (!price && pd.DataLayer) {
                    if (pd.DataLayer.CampaignDiscountedPrice > 0) {
                        price = pd.DataLayer.CampaignDiscountedPrice.toString();
                    } else if (pd.DataLayer.DiscountedPrice > 0) {
                        price = pd.DataLayer.DiscountedPrice.toString();
                    } else if (pd.DataLayer.Price > 0) {
                        price = pd.DataLayer.Price.toString();
                    }
                }

                if (!price && pd.ProductVariantMiniDiscountedPriceInclTax) {
                    price = pd.ProductVariantMiniDiscountedPriceInclTax;
                }

                // Image Strategy
                if (pd.ProductPictures && pd.ProductPictures.length > 0) {
                    // Use the first picture. Construct URL.
                    // Usually format is https://dfcdn.defacto.com.tr/7/{filename} for high res
                    // But we see /2/ in dump which is 333x499. Let's try /7/ for better quality or default to /2/
                    const filename = pd.ProductPictures[0].ProductPictureName;
                    if (filename) {
                        image = "https://dfcdn.defacto.com.tr/7/" + filename; 
                    }
                }
             }
        } catch(e) {}

        // Fallback Price
        if (!price) {
            const salePrice = getText('.product-card__price--sale') || getText('.sale-price') || getText('.campaign-price');
            const newPrice = getText('.product-card__price--new') || getText('.product-price');
            
            if (salePrice) price = salePrice;
            else price = newPrice;
        }

        // Fallback Image
        if (!image) {
             const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
             if (ogImage) {
                 image = ogImage;
             } else {
                image = getSrc('.product-card__image img') || getSrc('.swiper-slide-active img') || getSrc('.product-image-container img');
             }
        }

        const outOfStock = document.body.innerText.includes('Stokta Yok') || !!document.querySelector('.out-of-stock');

        // Check for specific Campaign Price variable if main object failed
        if (!price) {
             // Regex look for variable
             // var PRODUCT_DETAIL_INFO_3277181={...}
        }

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
        source: 'defacto-scraper'
    };
}
