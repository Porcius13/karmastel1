import { BaseScraper, smartPriceParse } from "./base";
import { ScrapedData } from "../types";
import { getBrowser } from "../browser";
import * as Sentry from "@sentry/nextjs";

// Standalone function to avoid class serialization issues
function defaultScrapeLogic() {
    const result = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "manual" as string };

    const cleanUrl = function (raw: any) {
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
        } else if (u.indexOf('https:') === 0 && u.indexOf('https://') !== 0) {
            if (window.location.hostname.indexOf('hypeofsteps.com') !== -1) {
                u = u.replace('https:', window.location.origin + '/cdn/shop/');
            } else {
                u = u.replace('https:', window.location.origin + '/');
            }
        }

        if (u.indexOf('http://') === 0) u = u.replace('http://', 'https://');
        return u;
    };

    const safePrice = function (val: any) {
        if (val === undefined || val === null) return "";
        return val.toString().trim();
    };

    // Strategy 0: Shopify Global State
    try {
        const shopMeta = (window as any).meta || ((window as any).ShopifyAnalytics && (window as any).ShopifyAnalytics.meta);
        if (shopMeta && shopMeta.product) {
            const p = shopMeta.product;
            if (!result.title) result.title = p.variants && p.variants[0] && p.variants[0].name || p.type || "";
            if (p.variants && p.variants[0] && p.variants[0].price !== undefined) {
                const raw = p.variants[0].price;
                if (typeof raw === 'number' && raw > 1000) {
                    result.price = (raw / 100).toString();
                } else {
                    result.price = raw.toString();
                }
                result.source = 'json-ld';
            }
        }
    } catch (e) { }

    // Strategy A: JSON-LD
    if (!result.price) {
        try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const json = JSON.parse(scripts[i].innerHTML);
                    const findProduct = function (data: any): any {
                        if (!data || typeof data !== 'object') return null;
                        if (Array.isArray(data)) {
                            for (let j = 0; j < data.length; j++) {
                                const f = findProduct(data[j]);
                                if (f) return f;
                            }
                        } else {
                            if (data['@graph']) return findProduct(data['@graph']);
                            const type = data['@type'];
                            const isP = function (t: any) {
                                return typeof t === 'string' && (t === 'Product' || t === 'ProductGroup' || t.indexOf('Product') !== -1);
                            };
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

                        const getOffer = function (obj: any) {
                            if (obj.offers) return Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
                            if (obj.hasVariant) {
                                const variants = Array.isArray(obj.hasVariant) ? obj.hasVariant : [obj.hasVariant];
                                return (variants[0] && variants[0].offers) ? (Array.isArray(variants[0].offers) ? variants[0].offers[0] : variants[0].offers) : null;
                            }
                            return null;
                        };

                        const offer = getOffer(p);
                        if (offer) {
                            let pr = offer.price || offer.lowPrice || offer.highPrice;
                            if (!pr && offer.priceSpecification) {
                                const specs = Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [offer.priceSpecification];
                                for (let k = 0; k < specs.length; k++) {
                                    if (specs[k].price) {
                                        pr = specs[k].price;
                                        break;
                                    }
                                }
                            }
                            if (pr && !result.price) {
                                result.price = safePrice(pr);
                                result.source = 'json-ld';
                                if (offer.priceCurrency) result.currency = offer.priceCurrency;
                            }
                        }
                    }
                } catch (e) { }
            }
        } catch (e) { }
    }

    // Strategy B: Meta Tags
    if (!result.price || !result.image || !result.title) {
        try {
            if (!result.price) {
                const pm = (document.querySelector('meta[property="product:price:amount"]') ||
                    document.querySelector('meta[property="og:price:amount"]') ||
                    document.querySelector('meta[name="twitter:data1"]') ||
                    document.querySelector('meta[itemprop="price"]')) as HTMLMetaElement;
                if (pm) {
                    result.price = safePrice(pm.getAttribute('content') || pm.getAttribute('value') || pm.innerText);
                    result.source = 'meta-tag';
                }
            }
            if (!result.image) {
                const imgm = (document.querySelector('meta[property="og:image"]') || document.querySelector('meta[name="twitter:image"]')) as HTMLMetaElement;
                if (imgm) result.image = cleanUrl(imgm.getAttribute('content'));
            }
            if (!result.title) {
                const tm = (document.querySelector('meta[property="og:title"]') || document.querySelector('title')) as HTMLMetaElement;
                if (tm) result.title = tm.getAttribute('content') || tm.innerText || tm.innerText;
            }
        } catch (e) { }
    }

    // Site Specific DOM Overrides within DefaultScraper
    try {
        const host = window.location.hostname;
        if (host.indexOf("tagrean.com") !== -1) {
            const tEl = document.querySelector('h1.product_title');
            if (tEl) result.title = tEl.textContent?.trim() || "";
            const pEl = document.querySelector('.summary.entry-summary .price bdi') || document.querySelector('.woocommerce-Price-amount bdi');
            if (pEl) {
                result.price = safePrice(pEl.textContent);
                result.source = 'dom-selectors';
            }
            const iEl = (document.querySelector('.wp-post-image') || document.querySelector('.woocommerce-product-gallery__image img')) as HTMLImageElement;
            if (iEl && iEl.src) result.image = cleanUrl(iEl.src);
        }
        else if (host.indexOf("trendyol") !== -1) {
            try {
                const ep = (window as any)["__envoy_product-detail__PROPS"];
                if (ep && ep.product) {
                    const p = ep.product;
                    if (!result.title) result.title = p.name;
                    const v = p.winnerVariant || (p.variants && p.variants[0]);
                    if (v && v.price && v.price.discountedPrice && !result.price) {
                        result.price = v.price.discountedPrice.value + "";
                        result.source = 'json-ld';
                    }
                    if (p.images && p.images[0] && !result.image) result.image = cleanUrl(p.images[0]);
                }
            } catch (e) { }
        } else if (host.indexOf("hepsiburada") !== -1) {
            const rs = document.getElementById('reduxStore');
            if (rs) {
                try {
                    const state = JSON.parse(rs.innerHTML);
                    const p = state && state.productState && state.productState.product;
                    if (p) {
                        if (!result.title) result.title = p.name;
                        if (p.prices && p.prices[0] && !result.price) {
                            result.price = p.prices[0].value + "";
                            result.source = 'json-ld';
                        }
                        if (p.media && p.media[0] && !result.image) result.image = cleanUrl(p.media[0].url.replace('{size}', '1500'));
                    }
                } catch (e) { }
            }
        } else if (host.indexOf("decathlon") !== -1) {
            const pEl = document.querySelector('.prc__active-price') ||
                document.querySelector('.price-box__price') ||
                document.querySelector('.vtmn-price__amount') ||
                document.querySelector('.vtmn-price');

            if (pEl) {
                result.price = safePrice(pEl.textContent);
                result.source = 'dom-selectors';
            }
        }
        else if (host.indexOf("oldcottoncargo.com.tr") !== -1 || host.indexOf("kufvintage.com") !== -1 || document.querySelector('.TicimaxRuntime')) {
            if ((window as any).productDetailModel) {
                const model = (window as any).productDetailModel;
                if (model.productName && !result.title) result.title = model.productName;
                if (model.product && model.product.indirimliFiyatiStr && !result.price) {
                    result.price = safePrice(model.product.indirimliFiyatiStr);
                    result.source = 'json-ld';
                } else if (model.indirimliFiyatiStr && !result.price) {
                    result.price = safePrice(model.indirimliFiyatiStr);
                    result.source = 'json-ld';
                }
            }
            const tEl = document.querySelector('h1');
            if (tEl) result.title = tEl.textContent?.trim() || "";

            const pSels = ['.indirimliFiyat .spanFiyat', '#fiyat', '.spanFiyat', '.product-price'];
            for (let j = 0; j < pSels.length; j++) {
                const pEl = document.querySelector(pSels[j]);
                if (pEl && pEl.textContent && /[0-9]/.test(pEl.textContent)) {
                    result.price = safePrice(pEl.textContent);
                    result.source = 'dom-selectors';
                    break;
                }
            }

            const imgSels = ['#imgUrunResim', '.product-image img', 'img[data-src*="/urunler/"]'];
            for (let k = 0; k < imgSels.length; k++) {
                const iEl = document.querySelector(imgSels[k]) as HTMLImageElement;
                if (iEl) {
                    const src = iEl.src || iEl.getAttribute('data-src');
                    if (src && src.indexOf('data:') !== 0) {
                        result.image = cleanUrl(src);
                        result.source = 'dom-selectors';
                        break;
                    }
                }
            }
        }
    } catch (e) { }

    // General Fallbacks
    if (!result.price) {
        const sels = ['.price', '.product-price', '.amount', '[itemprop="price"]', '.SinglePrice_center__SWK1D'];
        for (let s = 0; s < sels.length; s++) {
            const el = document.querySelector(sels[s]);
            if (el) {
                const val = el.getAttribute('content') || el.textContent;
                if (val && /[0-9]/.test(val)) {
                    result.price = safePrice(val);
                    result.source = 'dom-selectors';
                    break;
                }
            }
        }
    }

    if (!result.image) {
        const iEl = (document.querySelector('img[itemprop="image"]') || document.querySelector('.product-image img')) as HTMLImageElement;
        if (iEl && iEl.src) result.image = cleanUrl(iEl.src);
    }

    return result;
}

export class DefaultScraper extends BaseScraper {
    async scrape(url: string): Promise<ScrapedData> {
        let browser = null;
        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            const cleanUrlStr = url;
            const isAmazon = cleanUrlStr.includes("amazon.com.tr");
            const isDecathlon = cleanUrlStr.includes("decathlon.com.tr");
            const isNike = cleanUrlStr.includes("nike.com");
            const isTagrean = cleanUrlStr.includes("tagrean.com");
            const isMavi = cleanUrlStr.includes("mavi.com");
            const isOldCotton = cleanUrlStr.includes("oldcottoncargo.com.tr");
            const isKufVintage = cleanUrlStr.includes("kufvintage.com");

            const userAgents = [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
                'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230805.019; wv) AppleWebKit/537.36 (KHTML, Gecko) Version/4.0 Chrome/122.0.6261.64 Mobile Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36'
            ];
            const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

            await page.setUserAgent(userAgent);

            if (isAmazon || isDecathlon || isNike || isTagrean || isMavi || isOldCotton || isKufVintage) {
                const isMobile = userAgent.includes('iPhone') || userAgent.includes('Android');
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-ch-ua': isMobile ? '' : '"Not A(Brand";v="99", "Google Chrome";v="122", "Chromium";v="122"',
                    'sec-ch-ua-mobile': isMobile ? '?1' : '?0',
                    'sec-ch-ua-platform': isMobile ? (userAgent.includes('iPhone') ? '"iOS"' : '"Android"') : '"Windows"',
                    'Upgrade-Insecure-Requests': '1',
                    'Referer': 'https://www.google.com/'
                });

                await page.setViewport({
                    width: isMobile ? 390 : 1366,
                    height: isMobile ? 844 : 768,
                    deviceScaleFactor: isMobile ? 3 : 1,
                    isMobile: isMobile,
                    hasTouch: isMobile
                });

                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 800) + 400));
            }

            await page.evaluateOnNewDocument(function () {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                const blockList = (isAmazon || isDecathlon || isNike || isTagrean)
                    ? ['image', 'font', 'media']
                    : ['image', 'stylesheet', 'font', 'media'];

                if (blockList.includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            try {
                await page.goto(cleanUrlStr, {
                    waitUntil: isMavi ? 'networkidle0' : 'domcontentloaded',
                    timeout: 30000
                });

                if (isMavi) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (error) {
                console.warn("Navigation failed or timeout - Proceeding to extraction...");
            }

            await new Promise(r => setTimeout(r, 1000));

            if (url.includes('hepsiburada') || url.includes('decathlon') || url.includes('trendyol') || url.includes('amazon') || url.includes('hypeofsteps') || url.includes('mavi')) {
                try {
                    if (url.includes('amazon')) {
                        const isSplash = await page.evaluate(function () {
                            const btn = document.querySelector('button, a, input[type="submit"]');
                            return btn && (btn.textContent?.includes('Alışverişe Devam Et') || (btn as any).value?.includes('Alışverişe Devam Et'));
                        });

                        if (isSplash) {
                            await page.evaluate(function () {
                                const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
                                const target = btns.find(b => b.textContent?.includes('Alışverişe Devam Et') || (b as any).value?.includes('Alışverişe Devam Et'));
                                if (target) (target as any).click();
                            });
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    }
                    await page.evaluate(function () { window.scrollBy(0, 1000); });
                    await new Promise(r => setTimeout(r, 2000));

                    if (isMavi) {
                        await page.mouse.move(100, 100);
                        await page.mouse.move(200, 200);
                    }
                } catch (e) { }
            }

            const domData = await page.evaluate(defaultScrapeLogic);

            const finalData: ScrapedData = {
                title: domData.title || "",
                image: domData.image || "",
                price: smartPriceParse(domData.price),
                currency: domData.currency || "TRY",
                description: "",
                inStock: domData.inStock,
                source: domData.source as any
            };

            if (finalData.price === 0 || !finalData.image) {
                const html = await page.content();
                if (finalData.price === 0) {
                    const pricePatterns = [/"price"\s*:\s*([\d.]+)/, /data-price="([\d.]+)"/];
                    for (const p of pricePatterns) {
                        const m = html.match(p);
                        if (m && m[1]) {
                            finalData.price = smartPriceParse(m[1]);
                            finalData.source = 'regex-scan';
                            break;
                        }
                    }
                }
                if (!finalData.image) {
                    const hbMatches = Array.from(html.matchAll(/(?:https?:)?\/\/hbimg\.hepsiburada\.net\/[^\x22\x27\s>]+/g));
                    if (hbMatches.length > 0) {
                        finalData.image = hbMatches[0][0].startsWith('//') ? 'https:' + hbMatches[0][0] : hbMatches[0][0];
                    }
                }
            }

            if (!finalData.image) finalData.image = "https://placehold.co/600x600?text=No+Image";

            return finalData;

        } catch (error: any) {
            console.error(`Default Scraper Error:`, error.message);
            if (Sentry.captureException) Sentry.captureException(error);
            return this.getFailResult(error.message);
        } finally {
            if (browser) await browser.close();
        }
    }
}
