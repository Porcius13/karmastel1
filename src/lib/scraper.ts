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

function smartPriceParse(raw: any): number {
    if (!raw) return 0;
    if (typeof raw === 'number') return raw;

    let str = raw.toString().trim();
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
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/121.0.0.0 Safari/537.36';

            await page.setUserAgent(userAgent);

            if (isAmazon || isDecathlon || isNike || isTagrean) {
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1'
                });
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 500) + 200));
            }

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
                await page.goto(cleanUrlStr, { waitUntil: 'domcontentloaded', timeout: 25000 });
            } catch (error) {
                console.warn("Navigation Timeout (25s) - Proceeding to extraction...");
            }

            await new Promise(r => setTimeout(r, 1000));

            if (url.includes('hepsiburada') || url.includes('decathlon') || url.includes('trendyol') || url.includes('amazon') || url.includes('hypeofsteps')) {
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
                } catch (e) { }
            }

            const domData = await page.evaluate(new Function(`
                var result = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "manual" };

                var cleanUrl = function (raw) {
                    if (!raw) return "";
                    var u = raw;
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
                        var origin = window.location.origin;
                        if (u.indexOf('/') === 0) {
                            u = origin + u;
                        } else {
                            if (u.indexOf('files/') === 0) {
                               u = origin + '/' + u;
                            } else {
                               u = origin + '/' + u;
                            }
                        }
                    } else if (u.indexOf('https:') === 0 && u.indexOf('https://') !== 0) {
                        // Malformed Shopify path: https:files/ -> https://domain/cdn/shop/files/
                        if (window.location.hostname.indexOf('hypeofsteps.com') !== -1) {
                           u = u.replace('https:', window.location.origin + '/cdn/shop/');
                        } else {
                           u = u.replace('https:', window.location.origin + '/');
                        }
                    }
                    
                    if (u.indexOf('http://') === 0) u = u.replace('http://', 'https://');
                    return u;
                };

                var safePrice = function (val) {
                    if (val === undefined || val === null) return "";
                    return val.toString().trim();
                };

                // Strategy A: JSON-LD (Primary)
                try {
                    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (var i = 0; i < scripts.length; i++) {
                        try {
                            var json = JSON.parse(scripts[i].innerHTML);
                            var findProduct = function (data) {
                                if (!data || typeof data !== 'object') return null;
                                if (Array.isArray(data)) {
                                    for (var j = 0; j < data.length; j++) {
                                        var f = findProduct(data[j]);
                                        if (f) return f;
                                    }
                                } else {
                                    if (data['@graph']) return findProduct(data['@graph']);
                                    var type = data['@type'];
                                    var isP = function (t) {
                                        return typeof t === 'string' && (t === 'Product' || t === 'ProductGroup' || t.indexOf('Product') !== -1);
                                    };
                                    if (type && (Array.isArray(type) ? type.some(isP) : isP(type))) return data;
                                    for (var k in data) {
                                        if (data[k] && typeof data[k] === 'object' && k !== 'isPartOf' && k !== 'breadcrumb') {
                                            var f = findProduct(data[k]);
                                            if (f) return f;
                                        }
                                    }
                                }
                                return null;
                            };

                            var p = findProduct(json);
                            if (p) {
                                if (p.name && !result.title) result.title = p.name;
                                var img = cleanUrl(p.image);
                                if (img && !result.image) result.image = img;
                                
                                var getOffer = function (obj) {
                                    if (obj.offers) return Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
                                    if (obj.hasVariant) {
                                        var variants = Array.isArray(obj.hasVariant) ? obj.hasVariant : [obj.hasVariant];
                                        return (variants[0] && variants[0].offers) ? (Array.isArray(variants[0].offers) ? variants[0].offers[0] : variants[0].offers) : null;
                                    }
                                    return null;
                                };

                                var offer = getOffer(p);
                                if (offer) {
                                    var pr = offer.price || offer.lowPrice || offer.highPrice;
                                    if (!pr && offer.priceSpecification) {
                                        var specs = Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [offer.priceSpecification];
                                        for (var k = 0; k < specs.length; k++) {
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
                        } catch (e) {}
                    }
                } catch (e) {}

                // Strategy B: Meta Tags (Fallback)
                try {
                    if (!result.price) {
                        var pm = document.querySelector('meta[property="product:price:amount"]') || 
                                 document.querySelector('meta[property="og:price:amount"]') || 
                                 document.querySelector('meta[name="twitter:data1"]') ||
                                 document.querySelector('meta[itemprop="price"]');
                        if (pm) {
                            result.price = safePrice(pm.getAttribute('content') || pm.getAttribute('value') || pm.textContent);
                            result.source = 'meta-tag';
                        }
                    }
                    if (!result.image) {
                        var imgm = document.querySelector('meta[property="og:image"]') || document.querySelector('meta[name="twitter:image"]');
                        if (imgm) result.image = cleanUrl(imgm.getAttribute('content'));
                    }
                    if (!result.title) {
                        var tm = document.querySelector('meta[property="og:title"]') || document.querySelector('title');
                        if (tm) result.title = tm.getAttribute('content') || tm.textContent;
                    }
                } catch (e) {}

                // Site Specifics
                var host = window.location.hostname;
                if (host.indexOf("tagrean.com") !== -1) {
                    var tEl = document.querySelector('h1.product_title');
                    if (tEl) result.title = tEl.textContent.trim();
                    var pEl = document.querySelector('.summary.entry-summary .price bdi') || document.querySelector('.woocommerce-Price-amount bdi');
                    if (pEl) {
                        result.price = safePrice(pEl.textContent);
                        result.source = 'dom-selectors';
                    }
                    var iEl = document.querySelector('.wp-post-image') || document.querySelector('.woocommerce-product-gallery__image img');
                    if (iEl && iEl.src) result.image = cleanUrl(iEl.src);
                }

                if (host.indexOf("hypeofsteps.com") !== -1) {
                    var hImgSelectors = [
                        'a.lightbox-image',
                        'meta[property="og:image"]',
                        '.product__media img',
                        'img[src*="/cdn/shop/files/"]'
                    ];
                    for(var k=0; k<hImgSelectors.length; k++) {
                        var el = document.querySelector(hImgSelectors[k]);
                        if(el) {
                            var hSrc = el.getAttribute('href') || el.getAttribute('content') || el.src || el.getAttribute('data-src');
                            if(hSrc) {
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
                    var ep = window["__envoy_product-detail__PROPS"];
                    if (ep && ep.product) {
                        var p = ep.product;
                        if (!result.title) result.title = p.name;
                        var v = p.winnerVariant || (p.variants && p.variants[0]);
                        if (v && v.price && v.price.discountedPrice && !result.price) {
                            result.price = v.price.discountedPrice.value + "";
                            result.source = 'json-ld';
                        }
                        if (p.images && p.images[0] && !result.image) result.image = cleanUrl(p.images[0]);
                    }
                }

                if (host.indexOf("hepsiburada") !== -1) {
                    var rs = document.getElementById('reduxStore');
                    if (rs) {
                        try {
                            var state = JSON.parse(rs.innerHTML);
                            var p = state && state.productState && state.productState.product;
                            if (p) {
                                if (!result.title) result.title = p.name;
                                if (p.prices && p.prices[0] && !result.price) {
                                    result.price = p.prices[0].value + "";
                                    result.source = 'json-ld';
                                }
                                if (p.media && p.media[0] && !result.image) result.image = cleanUrl(p.media[0].url.replace('{size}', '1500'));
                            }
                        } catch (e) {}
                    }
                }

                if (!result.price) {
                    var sels = ['.price', '.product-price', '.amount', '[itemprop="price"]', '.SinglePrice_center__SWK1D'];
                    for (var s = 0; s < sels.length; s++) {
                        var el = document.querySelector(sels[s]);
                        if (el) {
                            var val = el.getAttribute('content') || el.textContent;
                            if (val && /\\d/.test(val)) {
                                result.price = safePrice(val);
                                result.source = 'dom-selectors';
                                break;
                            }
                        }
                    }
                }
                
                if (!result.image) {
                   var iEl = document.querySelector('img[itemprop="image"]') || document.querySelector('.product-image img');
                   if (iEl && iEl.src) result.image = cleanUrl(iEl.src);
                }

                return JSON.parse(JSON.stringify(result));
            `) as any);

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
                    const hbMatches = Array.from(html.matchAll(/(?:https?:)?\/\/hbimg\.hepsiburada\.net\/[^"'\s>]+/g));
                    if (hbMatches.length > 0) {
                        finalData.image = hbMatches[0][0].startsWith('//') ? 'https:' + hbMatches[0][0] : hbMatches[0][0];
                    }
                }
            }

            if (!finalData.image) finalData.image = "https://placehold.co/600x600?text=No+Image";

            return finalData;

        } catch (error: any) {
            if (Sentry.captureException) Sentry.captureException(error);
            return {
                title: "",
                image: "",
                description: "",
                price: 0,
                currency: "TRY",
                inStock: true,
                source: 'manual',
                error: error.message
            };
        } finally {
            if (browser) await browser.close();
        }
    });
}
