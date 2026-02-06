import { ScrapedData, ScraperContext } from "./types";
import { smartPriceParse } from "./utils";

export async function genericScraper(context: ScraperContext): Promise<ScrapedData> {
    const { page, url, domain } = context;

    // Use the comprehensive evaluation logic previously in scraper.ts
    const domData = await page.evaluate(`() => {
        const result = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "dom-selectors" };

        const cleanUrl = function (raw) {
            if (!raw) return "";
            let u = raw;
            if (Array.isArray(raw)) u = raw[0];
            if (typeof raw === 'object' && raw !== null) {
                u = raw.contentUrl || raw.url || (Array.isArray(raw.image) ? raw.image[0] : raw.image) || raw;
                if (Array.isArray(u)) u = u[0];
            }
            if (typeof u !== 'string') return "";
            if (u.indexOf('#') === 0 || u.indexOf('/#') !== -1) return "";

            if (u.indexOf('//') === 0) {
                u = 'https:' + u;
            } else if (u.indexOf('http') !== 0 && u.indexOf('data:') !== 0) {
                const origin = window.location.origin;
                if (u.indexOf('/') === 0) {
                    u = origin + u;
                } else {
                    u = origin + '/' + u;
                }
            }
            if (u.indexOf('http://') === 0) u = u.replace('http://', 'https://');
            return u;
        };

        const safePrice = function (val) {
            if (val === undefined || val === null) return "";
            return val.toString().trim();
        };

        // Strategy 0: Shopify Global State
        try {
            const shopMeta = window.meta || (window.ShopifyAnalytics && window.ShopifyAnalytics.meta);
            if (shopMeta && shopMeta.product) {
                const p = shopMeta.product;
                if (!result.title) result.title = p.variants && p.variants[0] && p.variants[0].name || p.type || "";
                if (p.variants && p.variants[0] && p.variants[0].price !== undefined) {
                    const raw = p.variants[0].price;
                    result.price = (typeof raw === 'number' && raw > 1000) ? (raw / 100).toString() : raw.toString();
                    result.source = 'shopify-state';
                }
            }
        } catch (e) { }

        // Strategy A: JSON-LD
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const json = JSON.parse(scripts[i].innerHTML);
                    const findProduct = function (data) {
                        if (!data || typeof data !== 'object') return null;
                        if (Array.isArray(data)) {
                            for (let j = 0; j < data.length; j++) {
                                const f = findProduct(data[j]);
                                if (f) return f;
                            }
                        } else {
                            if (data['@graph']) return findProduct(data['@graph']);
                            const type = data['@type'];
                            const isP = function (t) { return typeof t === 'string' && (t === 'Product' || t === 'ProductGroup' || t.indexOf('Product') !== -1); };
                            if (type && (Array.isArray(type) ? type.some(isP) : isP(type))) return data;
                            for (const k in data) {
                                if (data[k] && typeof data[k] === 'object' && k !== 'isPartOf' && k !== 'breadcrumb') {
                                    const f = findProduct(data[k]);
                                    if (f) return f;
                                }
                            }
                        }
                        return null;
                    };

                    const p = findProduct(json);
                    if (p) {
                        if (p.name && !result.title) result.title = p.name;
                        const img = cleanUrl(p.image);
                        if (img && !result.image) result.image = img;

                        const getOffer = function (obj) {
                            if (obj.offers) return Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
                            if (obj.hasVariant) {
                                const variants = Array.isArray(obj.hasVariant) ? obj.hasVariant : [obj.hasVariant];
                                return (variants[0] && variants[0].offers) ? (Array.isArray(variants[0].offers) ? variants[0].offers[0] : variants[0].offers) : null;
                            }
                            return null;
                        };

                        const offer = getOffer(p);
                        if (offer) {
                            if (offer.priceCurrency) result.currency = offer.priceCurrency;
                            let pr = offer.price || offer.lowPrice || offer.highPrice;
                            if (pr && !result.price) {
                                result.price = safePrice(pr);
                                result.source = 'json-ld';
                            }
                            if (offer.availability?.includes('OutOfStock')) result.inStock = false;
                        }
                    }
                } catch (e) { }
            }
        } catch (e) { }

        // Meta Tags Fallback
        if (!result.title) result.title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title;
        if (!result.image) result.image = cleanUrl(
            document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
            document.querySelector('.cloudzoom')?.getAttribute('src') ||
            document.querySelector('.product-img')?.getAttribute('src') ||
            document.querySelector('[class*="product-image"] img')?.getAttribute('src')
        );
        if (!result.price) {
            const pm = document.querySelector('meta[property="product:price:amount"]') || document.querySelector('meta[itemprop="price"]');
            if (pm) {
                result.price = pm.getAttribute('content') || pm.innerText;
                result.source = 'meta-tag';
            }
        }

        // Strategy C: dr.com.tr Specific Selectors
        if (window.location.hostname.includes('dr.com.tr')) {
            if (!result.price) {
                const drPrice = document.querySelector('.salePrice')?.innerText || 
                                document.querySelector('.price-box .price')?.innerText ||
                                document.querySelector('.product-price')?.innerText ||
                                document.querySelector('.currentPrice')?.innerText ||
                                document.querySelector('[itemprop="price"]')?.innerText ||
                                document.querySelector('[itemprop="price"]')?.getAttribute('content');
                if (drPrice) {
                    result.price = drPrice;
                    result.source = 'dr-specific';
                }
            }
            // Check for Out of Stock on dr.com.tr
            const isOutOfStock = !!document.querySelector('.out-of-stock') || 
                                !!document.querySelector('.not-on-sale') ||
                                !!document.querySelector('.product-info__out-of-stock') ||
                                !!document.querySelector('.btn-out-of-stock') ||
                                Array.from(document.querySelectorAll('span, button, div')).some(el => 
                                    (el.innerText || "").includes('Tükendi') || 
                                    (el.innerText || "").includes('Stokta Yok')
                                );
            if (isOutOfStock) result.inStock = false;
        }

        // Strategy D: Swatch Specific Selectors
        if (window.location.hostname.includes('swatch.com')) {
            if (!result.price) {
                const swatchPrice = document.querySelector('.price .value')?.innerText || 
                                    document.querySelector('.sales .value')?.innerText ||
                                    document.querySelector('.price')?.innerText;
                if (swatchPrice) {
                    result.price = swatchPrice;
                    result.source = 'swatch-specific';
                }
            }
            if (!result.title || result.title === 'İsimsiz Ürün') {
                result.title = (document.querySelector('h1')?.innerText || "").trim();
            }
            if (!result.image || result.image.includes('placehold.co')) {
                const swatchImg = document.querySelector('.product-detail .primary-image img')?.getAttribute('src') ||
                                  document.querySelector('.pdp-main-image img')?.getAttribute('src') ||
                                  document.querySelector('.product-img img')?.getAttribute('src');
                if (swatchImg) result.image = cleanUrl(swatchImg);
            }
        }

        return result;
    }`);

    return {
        title: domData.title || "",
        price: smartPriceParse(domData.price),
        image: domData.image || "",
        currency: domData.currency || "TRY",
        description: "",
        inStock: domData.inStock,
        source: domData.source,
        rawTitle: domData.title,
        rawPrice: domData.price?.toString()
    };
}
