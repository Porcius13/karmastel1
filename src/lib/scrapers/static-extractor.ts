import * as cheerio from "cheerio";
import { ScrapedData } from "./types";
import { smartPriceParse } from "./utils";

export function extractStaticData(html: string, url: string): ScrapedData | null {
    if (!html) return null;

    try {
        const $ = cheerio.load(html);
        const domain = new URL(url).hostname.replace('www.', '');

        const result: ScrapedData = {
            title: "",
            price: 0,
            image: "",
            currency: "TRY",
            description: "",
            inStock: true,
            source: 'static-cheerio'
        };

        // 1. JSON-LD Extraction (Static)
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || "");
                const findProduct = (data: any): any => {
                    if (!data || typeof data !== 'object') return null;
                    if (Array.isArray(data)) return data.map(findProduct).find(p => p);
                    if (data['@graph']) return findProduct(data['@graph']);
                    const type = data['@type'];
                    if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return data;
                    for (const k in data) {
                        if (data[k] && typeof data[k] === 'object' && k !== 'isPartOf') {
                            const f = findProduct(data[k]);
                            if (f) return f;
                        }
                    }
                    return null;
                };

                const p = findProduct(json);
                if (p) {
                    if (p.name) result.title = p.name;
                    if (p.image) result.image = Array.isArray(p.image) ? p.image[0] : (p.image.url || p.image);
                    const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
                    if (offer) {
                        if (offer.price) result.price = smartPriceParse(offer.price);
                        if (offer.priceCurrency) result.currency = offer.priceCurrency;
                        if (offer.availability?.includes('OutOfStock')) result.inStock = false;
                    }
                }
            } catch (e) { }
        });

        // 2. Meta Tags Fallback
        if (!result.title) result.title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
        if (!result.image) result.image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || "";
        if (result.price === 0) {
            const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                $('meta[itemprop="price"]').attr('content') ||
                $('meta[property="og:price:amount"]').attr('content');
            if (metaPrice) result.price = smartPriceParse(metaPrice);
        }

        // 3. Site Specific Quick Selectors (Static)
        if (domain.includes('hepsiburada.com')) {
            if (!result.price) {
                const hbPrice = $('span[data-test-id="price-current-price"]').text() || $('span[itemprop="price"]').attr('content');
                if (hbPrice) result.price = smartPriceParse(hbPrice);
            }
        }

        if (domain.includes('supplementler.com') || domain.includes('vitaminler.com')) {
            const sTitle = $('.product-name').first().text() || $('h1').first().text() || "";
            const sImage = $('.cloudzoom').first().attr('src') || $('.cloudzoom').first().attr('data-cloudzoom') || "";

            // Re-import isBotChallenge if needed or use local logic to avoid circular deps if they exist
            // Actually, it's better to just check here since we have the title
            if (sTitle.toLowerCase().includes("bir dakika") || sTitle.toLowerCase().includes("lütfen")) {
                return null;
            }

            if (!result.title) result.title = sTitle;
            if (!result.image) result.image = sImage;

            if (result.price === 0) {
                const sPrice = $('.product-price').first().text() || $('.current-price').first().text();
                if (sPrice) result.price = smartPriceParse(sPrice);
            }
        }

        if (domain.includes('dr.com.tr')) {
            if (result.price === 0) {
                const drPrice = $('.salePrice').first().text() ||
                    $('.price-box .price').first().text() ||
                    $('.product-price').first().text() ||
                    $('.currentPrice').first().text() ||
                    $('[itemprop="price"]').attr('content') ||
                    $('[itemprop="price"]').first().text();
                if (drPrice) result.price = smartPriceParse(drPrice);
            }
            const drStock = $('.out-of-stock').length > 0 ||
                $('.not-on-sale').length > 0 ||
                $('.product-info__out-of-stock').length > 0 ||
                $('.btn-out-of-stock').length > 0 ||
                $('span:contains("Stokta Yok")').length > 0 ||
                $('button:contains("Tükendi")').length > 0 ||
                $('.add-to-cart-container').text().includes('Tükendi');
            if (drStock) result.inStock = false;
        }

        if (domain.includes('swatch.com')) {
            if (result.price === 0) {
                const swatchPrice = $('.price .value').first().text() ||
                    $('.sales .value').first().text() ||
                    $('.price').first().text();
                if (swatchPrice) result.price = smartPriceParse(swatchPrice);
            }
            if (!result.title || result.title === 'İsimsiz Ürün') {
                result.title = $('h1').first().text().trim();
            }
            if (!result.image || result.image === "") {
                const swatchImg = $('.product-detail .primary-image img').first().attr('src') ||
                    $('.pdp-main-image img').first().attr('src') ||
                    $('.product-img img').first().attr('src');
                if (swatchImg) result.image = swatchImg;
            }
        }

        // Final Validation: If we have at least a title and a price, it's a success
        if (result.title && result.price > 0) {
            return result;
        }

        return null;
    } catch (error) {
        console.error("Static extraction error:", error);
        return null;
    }
}
