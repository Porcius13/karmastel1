import path from "path";
import fs from "fs";
import * as Sentry from "@sentry/nextjs";

// --- INTERFACES ---

export interface ScrapedData {
    title: string;
    price: number;
    image: string;
    currency: string;
    description: string;
    inStock: boolean;
    source: 'meta-tag' | 'json-ld' | 'dom-selectors' | 'regex-scan' | 'manual';
    error?: string;
}

// --- SMART PRICE PARSER ---

export function smartPriceParse(raw: any): number {
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;

    let str = raw.toString().trim();

    // Detect malformed Shopify-style TRY prices like "8.920.00"
    // If we have multiple dots and the last part is exactly 2 digits, 
    // it's likely X.XXX.YY format where only the last one is decimal.
    const dots = (str.match(/\./g) || []).length;
    if (dots > 1) {
        const parts = str.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 2 && /^\d+$/.test(lastPart)) {
            // Treat all but last dot as thousands separators
            str = parts.slice(0, -1).join('') + '.' + lastPart;
        }
    }

    // Remove currency and other non-numeric chars, but keep . and ,
    str = str.replace(/[^\d.,]/g, "");

    if (!str) return 0;

    // Check if both . and , are present
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // 1.250,50 -> comma is decimal
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            // 1,250.50 -> dot is decimal
            str = str.replace(/,/g, "");
        }
    } else if (str.includes(',')) {
        // Only comma: 1250,50 or 1,250
        const parts = str.split(',');
        if (parts[parts.length - 1].length === 3 && str.length > 4) {
            // Likely a thousands separator: 1,250 -> 1250
            str = str.replace(",", "");
        } else {
            // Likely a decimal separator: 1250,50 -> 1250.50
            str = str.replace(",", ".");
        }
    } else if (str.includes('.')) {
        // Only dot: 1250.50 or 1.250
        const parts = str.split('.');
        if (parts[parts.length - 1].length === 3 && str.length > 4) {
            // Likely a thousands separator: 1.250 -> 1250
            str = str.replace(".", "");
        }
        // else already 1250.50
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

// Special Zara-like cleaner for regex results that might be raw ints
function cleanRegexPrice(raw: string): number {
    return smartPriceParse(raw);
}

// --- BROWSER CONFIG ---

async function getBrowser() {
    if (process.env.NODE_ENV === 'production') {
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteerCore = (await import('puppeteer-core')).default;
        const chromiumAny = chromium as any;
        chromiumAny.setGraphicsMode = false;

        const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

        try {
            const execPath = await chromiumAny.executablePath(remoteExecutablePath);
            return await puppeteerCore.launch({
                args: [...chromiumAny.args, "--hide-scrollbars", "--disable-web-security", "--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
                defaultViewport: { width: 1366, height: 768, deviceScaleFactor: 1 },
                executablePath: execPath,
                headless: chromiumAny.headless,
                ignoreHTTPSErrors: true,
            } as any);
        } catch (launchError) {
            console.error("Browser launch error (Vercel):", launchError);
            throw launchError;
        }
    } else {
        try {
            const puppeteer = (await import('puppeteer')).default;
            return await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
            });
        } catch (err) {
            console.error("Local puppeteer import failed.", err);
            throw err;
        }
    }
}

// --- SCRAPER FUNCTION ---

export async function scrapeProduct(url: string): Promise<ScrapedData> {
    let cleanUrlStr = url.trim();
    if (!cleanUrlStr) throw new Error("URL is required");

    if (!/^https?:\/\//i.test(cleanUrlStr)) {
        cleanUrlStr = "https://" + cleanUrlStr;
    }

    return (Sentry.withScope ? Sentry.withScope : (fn: any) => fn({}))(async (scope: any) => {
        let domainName = "unknown";
        try {
            domainName = new URL(cleanUrlStr).hostname.replace('www.', '');
        } catch (e) {
            return {
                title: "",
                image: "",
                description: "",
                price: 0,
                currency: "TRY",
                inStock: true,
                source: 'manual',
                error: "Invalid URL format"
            };
        }

        if (scope.setTag) {
            scope.setTag("site", domainName);
            scope.setTag("scraper_mode", "hybrid_regex");
        }

        let browser = null;

        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            const isAmazon = cleanUrlStr.includes("amazon.com.tr");
            const isDecathlon = cleanUrlStr.includes("decathlon.com.tr");
            const isNike = cleanUrlStr.includes("nike.com");
            const isTagrean = cleanUrlStr.includes("tagrean.com");
            const isMavi = cleanUrlStr.includes("mavi.com");
            const isOldCotton = cleanUrlStr.includes("oldcottoncargo.com.tr");
            const isKufVintage = cleanUrlStr.includes("kufvintage.com");
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/121.0.0.0 Safari/537.36';

            await page.setUserAgent(userAgent);

            if (isAmazon || isDecathlon || isNike || isTagrean || isMavi || isOldCotton || isKufVintage) {
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1',
                    'Referer': 'https://www.google.com/'
                });
                // Allow stylesheets for these sites if they use getComputedStyle (Ticimax/Mavi)
                // Actually Mavi doesn't strictly need it, but Ticimax price might benefit from visibility checks
                await page.setViewport({
                    width: 1366 + Math.floor(Math.random() * 100),
                    height: 768 + Math.floor(Math.random() * 100),
                    deviceScaleFactor: 1
                });
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 800) + 400));
            }

            // Stealth: Basic WebDriver removal (handled by getBrowser default args, but keeping simple one)
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
            });

            page.on('console', msg => {
                const text = msg.text();
                if (msg.type() === 'error' || msg.type() === 'warn' || text.includes('[DEBUG]')) {
                    console.log(`PAGE ${msg.type().toUpperCase()}:`, text);
                }
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
                    waitUntil: isMavi ? 'networkidle2' : 'domcontentloaded',
                    timeout: 30000
                });

                if (isMavi) {
                    try {
                        await page.waitForSelector('.product-detail, .product__gallery, script[type="application/ld+json"]', { timeout: 10000 });
                    } catch (e) {
                        console.warn("Mavi: Specific elements didn't load.");
                    }
                }
            } catch (error) {
                console.warn("Navigation Timeout (25s) - Proceeding to extraction...");
            }

            await new Promise(r => setTimeout(r, 1000));

            if (url.includes('hepsiburada') || url.includes('decathlon') || url.includes('trendyol') || url.includes('amazon') || url.includes('hypeofsteps') || url.includes('mavi')) {
                try {
                    if (url.includes('amazon')) {
                        const isSplash = await page.evaluate(() => {
                            const btn = document.querySelector('button, a, input[type="submit"]');
                            return btn && (btn.textContent?.includes('Alışverişe Devam Et') || (btn as any).value?.includes('Alışverişe Devam Et'));
                        });

                        if (isSplash) {
                            await page.evaluate(() => {
                                const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
                                const target = btns.find(b => b.textContent?.includes('Alışverişe Devam Et') || (b as any).value?.includes('Alışverişe Devam Et'));
                                if (target) (target as any).click();
                            });
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    }
                    await page.evaluate(() => window.scrollBy(0, 1000));
                    await new Promise(r => setTimeout(r, 2000));

                    if (isMavi) {
                        // Simulate a small mouse move to trigger any focus/bot checks
                        await page.mouse.move(100, 100);
                        await page.mouse.move(200, 200);
                    }
                } catch (e) { }
            }

            const domData = await page.evaluate(() => {
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

                // Strategy 0: Shopify Global State (Highly reliable for price)
                try {
                    const shopMeta = (window as any).meta || ((window as any).ShopifyAnalytics && (window as any).ShopifyAnalytics.meta);
                    if (shopMeta && shopMeta.product) {
                        const p = shopMeta.product;
                        if (!result.title) result.title = p.variants && p.variants[0] && p.variants[0].name || p.type || "";
                        if (p.variants && p.variants[0] && p.variants[0].price !== undefined) {
                            // Shopify usually gives price in subunits (e.g. 892000 for 8920.00)
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

                // Strategy A: JSON-LD (Primary)
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

                // Strategy B: Meta Tags (Fallback)
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

                // Site Specifics
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

                    if (host.indexOf("hypeofsteps.com") !== -1) {
                        const hImgSelectors = [
                            'a.lightbox-image',
                            'meta[property="og:image"]',
                            '.product__media img',
                            'img[src*="/cdn/shop/files/"]'
                        ];
                        for (let k = 0; k < hImgSelectors.length; k++) {
                            const el = document.querySelector(hImgSelectors[k]);
                            if (el) {
                                let hSrc = el.getAttribute('href') || el.getAttribute('content') || (el as HTMLImageElement).src || el.getAttribute('data-src');
                                if (hSrc) {
                                    // Remove Shopify width/size suffixes for full res
                                    hSrc = hSrc.split('&width=')[0].split('_large')[0].split('_medium')[0];
                                    result.image = cleanUrl(hSrc);
                                    result.source = 'dom-selectors';
                                    break;
                                }
                            }
                        }
                    }

                    if (host.indexOf("trendyol") !== -1) {
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
                    }

                    if (host.indexOf("hepsiburada") !== -1) {
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
                    }

                    if (host.indexOf("decathlon") !== -1) {
                        const pEl = document.querySelector('.prc__active-price') ||
                            document.querySelector('.price-box__price') ||
                            document.querySelector('.vtmn-price__amount') ||
                            document.querySelector('.vtmn-price');

                        if (pEl) {
                            result.price = safePrice(pEl.textContent);
                            result.source = 'dom-selectors';
                        }

                        if (!result.price) {
                            try {
                                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                                for (let i = 0; i < scripts.length; i++) {
                                    const json = JSON.parse(scripts[i].textContent || "");
                                    if (json['@type'] === 'Product') {
                                        if (!result.title) result.title = json.name;
                                        if (!result.image && json.image) result.image = cleanUrl(json.image);
                                        if (json.offers) {
                                            const offer = Array.isArray(json.offers) ? json.offers[0] : json.offers;
                                            if (offer.price) {
                                                result.price = offer.price;
                                                result.source = 'json-ld';
                                            }
                                        }
                                    }
                                }
                            } catch (e) { }
                        }
                    }

                    if (host.indexOf("mavi") !== -1 || host.indexOf("mavi.com") !== -1) {
                        try {
                            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                            for (let i = 0; i < scripts.length; i++) {
                                const json = JSON.parse(scripts[i].textContent || "");
                                if (json && (json['@type'] === 'Product' || (json['@graph'] && json['@graph'].some((item: any) => item['@type'] === 'Product')))) {
                                    const p = json['@type'] === 'Product' ? json : json['@graph'].find((item: any) => item['@type'] === 'Product');
                                    if (p && p.image) {
                                        const imgUrl = Array.isArray(p.image) ? p.image[0] : (typeof p.image === 'string' ? p.image : p.image.url || p.image.contentUrl);
                                        if (imgUrl) {
                                            result.image = cleanUrl(imgUrl);
                                            result.source = 'json-ld';
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (e) { }

                        if (!result.image) {
                            const imgSelectors = [
                                '.product__gallery-item.swiper-slide-active img',
                                '.product__gallery-item img',
                                '.product-detail-carousel .slick-current img',
                                '.product-detail-carousel .slick-slide:not(.slick-cloned) img',
                                'img[data-src*="/products/"]',
                                'picture img',
                                'meta[property="og:image"]'
                            ];

                            for (let k = 0; k < imgSelectors.length; k++) {
                                const el = document.querySelector(imgSelectors[k]) as HTMLImageElement;
                                if (el) {
                                    let src = el.src || el.getAttribute('data-src') || el.getAttribute('srcset') || el.getAttribute('content');
                                    if (src) {
                                        if (src.indexOf(',') !== -1) src = src.split(',')[0].trim().split(' ')[0];
                                        if (src && src.indexOf('svg') === -1 && src.indexOf('icon') === -1 && src.indexOf('data:image') === -1) {
                                            result.image = cleanUrl(src);
                                            result.source = 'dom-selectors';
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        if (!result.image) {
                            const m = document.documentElement.innerHTML.match(/https:\/\/(sky-static\.mavi\.com|mavicdn\.akamaized\.net)\/products\/[^\x22\x27]+\.jpg/);
                            if (m) {
                                result.image = cleanUrl(m[0]);
                                result.source = 'regex-scan';
                            }
                        }
                    }

                    if (host.indexOf("oldcottoncargo.com.tr") !== -1 || host.indexOf("kufvintage.com") !== -1 || document.querySelector('.TicimaxRuntime')) {
                        // Ticimax / Old Cotton Cargo / Kuf Vintage Specifics
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
                } catch (e) { console.error("Site specific error:", e); }

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
            });

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
            const pageTitle = browser ? await (async () => {
                try {
                    const pages = await browser.pages();
                    return pages.length > 0 ? await pages[pages.length - 1].title() : "unknown";
                } catch (e) { return "unknown"; }
            })() : "unknown";

            console.error(`Scrape Error [Page: ${pageTitle}]:`, error.message);
            if (Sentry.captureException) Sentry.captureException(error);
            return {
                title: "",
                image: "",
                description: "",
                price: 0,
                currency: "TRY",
                inStock: true,
                source: 'manual',
                error: `Page: ${pageTitle} | Error: ${error.message}`
            };
        } finally {
            if (browser) await browser.close();
        }
    });
}
