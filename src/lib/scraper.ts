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
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--test-type',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
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




        // --- DEDICATED H&M BYPASS (Puppeteer on Search Results) ---
        if (domainName.includes("hm.com")) {
            try {
                const regionMatch = cleanUrlStr.match(/hm\.com\/([^\/]+)\//);
                let region = regionMatch ? regionMatch[1] : "tr_tr";
                const idMatch = cleanUrlStr.match(/productpage\.(\d+)\.html/) ||
                    cleanUrlStr.match(/productpage\/(\d+)/) ||
                    cleanUrlStr.match(/product\.(\d+)\.html/);
                const productId = idMatch ? idMatch[1] : null;

                if (productId) {
                    console.log(`[H&M Scraper] Starting Search Strategy for ID: ${productId} (${region})`);

                    let hmBrowser = null;
                    try {
                        hmBrowser = await getBrowser();
                        const hmPage = await hmBrowser.newPage();
                        await hmPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/122.0.0.0 Safari/537.36');
                        await hmPage.setViewport({ width: 1366, height: 768 });

                        // Try URL region first, then fallback to tr_tr or en_gb
                        const regionsToTry = [region, 'tr_tr', 'en_gb', 'en_us'].filter((v, i, a) => a.indexOf(v) === i);

                        for (const r of regionsToTry) {
                            const searchUrl = `https://www2.hm.com/${r}/search-results.html?q=${productId}`;
                            console.log(`[H&M Scraper] Trying Region ${r}...`);

                            try {
                                await hmPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

                                const result = await hmPage.evaluate((pid) => {
                                    const article = document.querySelector(`article[data-articlecode="${pid}"]`) ||
                                        document.querySelector(`article[data-articlecode^="${pid.substring(0, 10)}"]`);
                                    if (!article) return null;

                                    const title = article.querySelector('h3')?.textContent?.trim() || "";
                                    const spans = Array.from(article.querySelectorAll('span'));
                                    const priceTexts = spans.map(s => s.textContent || "").filter(t => t.includes('TL') || t.includes('TRY') || t.includes('£') || t.includes('$')).join(' ');
                                    const img = article.querySelector('img');
                                    const image = img?.getAttribute('data-src') || img?.getAttribute('src') || "";

                                    return { title, priceTexts, image };
                                }, productId);

                                if (result && result.title) {
                                    const finalResult: ScrapedData = {
                                        title: result.title,
                                        price: 0,
                                        image: result.image,
                                        currency: r.includes("tr") ? "TRY" : (r.includes("gb") ? "GBP" : "USD"),
                                        description: "",
                                        inStock: true,
                                        source: 'dom-selectors'
                                    };

                                    const matches = result.priceTexts.match(/(\d+[\d.,]*)/g);
                                    if (matches && matches.length > 0) {
                                        const parsedPrices = matches.map(m => {
                                            let s = m.replace(/[^\d.,]/g, "");
                                            if (s.includes(',') && s.includes('.')) {
                                                if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, "").replace(",", ".");
                                                else s = s.replace(/,/g, "");
                                            } else if (s.includes(',')) {
                                                const pts = s.split(',');
                                                if (pts[pts.length - 1].length === 3 && s.length > 4) s = s.replace(",", "");
                                                else s = s.replace(",", ".");
                                            } else if (s.includes('.')) {
                                                const pts = s.split('.');
                                                if (pts[pts.length - 1].length === 3 && s.length > 4) s = s.replace(".", "");
                                            }
                                            return parseFloat(s);
                                        }).filter(p => !isNaN(p) && p > 0);

                                        if (parsedPrices.length > 0) finalResult.price = Math.min(...parsedPrices);
                                    }

                                    if (finalResult.image && !finalResult.image.startsWith('http')) finalResult.image = 'https:' + finalResult.image;
                                    if (finalResult.title && !finalResult.title.toLowerCase().includes("access denied")) {
                                        console.log(`[H&M Scraper] Success in ${r}: ${finalResult.title}`);
                                        return finalResult;
                                    }
                                }
                            } catch (navErr) {
                                console.warn(`[H&M Scraper] Region ${r} failed navigation.`);
                            }
                        }
                    } finally {
                        if (hmBrowser) await hmBrowser.close();
                    }
                }
            } catch (e: any) {
                console.warn("[H&M Scraper Critical Error]:", e.message);
            }

            const idFallback = cleanUrlStr.match(/productpage\.(\d+)\.html/)?.[1];
            return {
                title: idFallback ? `H&M Ürün (${idFallback})` : "H&M Ürün",
                price: 0,
                image: "https://placehold.co/600x600?text=H%26M+Product",
                currency: "TRY",
                description: "H&M koruması nedeniyle detaylar tam alınamadı. Manuel düzenleyebilirsiniz.",
                inStock: true,
                source: 'manual',
                error: "H&M restricted access (Search bypass failed)."
            };
        }

        // --- DEDICATED MAVI SCRAPER (Isolated) ---
        if (domainName.includes("mavi.com")) {
            console.log(`[Mavi Scraper] Starting Dedicated Strategy for: ${cleanUrlStr}`);
            let mBrowser = null;
            try {
                mBrowser = await getBrowser();
                const mPage = await mBrowser.newPage();
                // Desktop UA is often safer for big brands to avoid "Install App" walls
                await mPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
                await mPage.setViewport({ width: 1920, height: 1080 });

                await mPage.goto(cleanUrlStr, { waitUntil: 'networkidle0', timeout: 30000 });
                // Wait for dynamic content
                await new Promise(r => setTimeout(r, 2500));

                try {
                    await mPage.waitForSelector('.product__title, .product-title, h1', { timeout: 5000 });
                } catch (e) { }

                const result: any = await mPage.evaluate(() => {
                    const res = { title: "", price: 0, image: "", currency: "TRY", inStock: true, source: "manual" };
                    try {
                        const h1 = document.querySelector('.product__title') || document.querySelector('h1.product-title') || document.querySelector('h1');
                        if (h1) res.title = h1.textContent?.trim() || "";

                        // Price
                        const pEl = document.querySelector('.product__price -sale') || document.querySelector('[data-price-value]') || document.querySelector('.price');
                        if (pEl) {
                            const val = pEl.getAttribute('data-price-value') || pEl.textContent || "";
                            if (val) {
                                let v = val.replace(/[^\d.,]/g, "").replace(",", ".");
                                res.price = parseFloat(v) || 0;
                            }
                        }

                        // Image
                        const img = document.querySelector('.product__gallery-item.swiper-slide-active img') ||
                            document.querySelector('.product-detail-carousel .slick-track img') ||
                            document.querySelector('.product__gallery img') ||
                            document.querySelector('meta[property="og:image"]') ||
                            document.querySelector('meta[name="og:image"]') ||
                            document.querySelector('link[rel="preload"][as="image"]');

                        if (img) {
                            res.image = (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src || img.getAttribute('content') || img.getAttribute('href') || "";
                        }

                        res.source = 'dom-selectors-isolated';
                    } catch (e) { }
                    return res;
                });

                if (result.title) {
                    return {
                        ...result,
                        description: "",
                        source: result.source
                    };
                }

            } catch (e: any) {
                console.warn("[Mavi Scraper Error]:", e.message);
            } finally {
                if (mBrowser) await mBrowser.close();
            }
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

                // Allow stylesheets for these sites if they use getComputedStyle (Ticimax/Mavi)
                // Actually Mavi doesn't strictly need it, but Ticimax price might benefit from visibility checks
                await page.setViewport({
                    width: isMobile ? 390 : 1366,
                    height: isMobile ? 844 : 768,
                    deviceScaleFactor: isMobile ? 3 : 1,
                    isMobile: isMobile,
                    hasTouch: isMobile
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
                    waitUntil: isMavi ? 'networkidle0' : 'domcontentloaded', // Wait for full network idle for Mavi
                    timeout: 30000
                });

                if (isMavi) {
                    try {
                        // Mavi is heavy on JS, wait a bit more ensuring metadata is populated
                        await new Promise(r => setTimeout(r, 2000));
                        await page.waitForSelector('body', { timeout: 10000 });
                    } catch (e) {
                        console.warn("Mavi: Specific verification timeout.");
                    }
                }
            } catch (error) {
                console.warn("Navigation failed or timeout - Proceeding to extraction...");
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
                } catch (e) {
                    console.error("Site specific error:", e);
                }

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
