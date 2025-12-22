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
    // Remove invalid chars but keep digits, commas, dots
    str = str.replace(/[^\d.,]/g, "");

    if (!str) return 0;

    // Zara / Integer Cents check implies if no dot/comma, it might be cents?
    // User logic: "Zara için fiyatın son iki hanesinin kuruş olduğunu anlayan"
    // However, usually we can rely on punctuation.
    // Let's implement robust punctuation detection.

    // 1. Remove thousands separators
    // If we have both , and . -> The last one is decimal separator.
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // comma is decimal (1.234,50)
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            // dot is decimal (1,234.50)
            str = str.replace(/,/g, "");
        }
    } else if (str.includes(',')) {
        // Only comma. 
        // 123,45 -> decimal
        // 1,234 -> typically thousands if 3 digits after, but in TR comma is usually decimal.
        // Rule: Treat comma as decimal unless it looks exactly like 1,234 (3 decimals) AND we are very sure.
        // Actually, in Turkey, comma is standard decimal.
        str = str.replace(",", ".");
    } else if (str.includes('.')) {
        // Only dot. 
        // 123.45 -> decimal
        // 1.234 -> could be thousands (TR) or decimal (US).
        // Ambiguity. If we assume TR context:
        // 1.234 -> 1234
        // 10.999 -> 10999
        // 10.99 -> 10.99
        const parts = str.split('.');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            // If last part is exactly 3 digits, it's likely a thousands separator in TR context
            // EXCEPT if it is a small number like 1.234 TL (Price). 
            // Ideally we want to be safe. 
            // Let's assume dot is decimal unless multiple dots exist.
            if (parts.length > 2) {
                // 1.234.567 -> remove dots
                str = str.replace(/\./g, "");
            } else {
                if (lastPart.length === 3) {
                    // 1.234 -> 1234
                    str = str.replace(".", "");
                }
                // else 1.99 -> 1.99, leave it
            }
        }
    }

    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

// Special Zara-like cleaner for regex results that might be raw ints
function cleanRegexPrice(raw: string): number {
    // If string is like "179000" (Zara sometimes sends this for 1790.00)
    // We need context. For now, use smartPriceParse.
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

    // Add protocol if missing
    if (!/^https?:\/\//i.test(cleanUrlStr)) {
        cleanUrlStr = "https://" + cleanUrlStr;
    }

    return Sentry.withScope(async (scope) => {
        let domainName = "unknown";
        try {
            domainName = new URL(cleanUrlStr).hostname.replace('www.', '');
        } catch (e) {
            console.warn("Invalid URL format:", cleanUrlStr);
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

        scope.setTag("site", domainName);
        scope.setTag("scraper_mode", "hybrid_regex");

        let browser = null;

        try {
            browser = await getBrowser();
            const page = await browser.newPage();

            // --- STEALTH LOGIC ---
            const isAmazon = cleanUrlStr.includes("amazon.com.tr");
            const isDecathlon = cleanUrlStr.includes("decathlon.com.tr");
            const isNike = cleanUrlStr.includes("nike.com");
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

            await page.setUserAgent(userAgent);

            if (isAmazon || isDecathlon || isNike) {
                // Adaptive headers for Amazon, Decathlon & Nike to bypass bot blocks (Cloudflare, etc)
                await page.setExtraHTTPHeaders({
                    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Upgrade-Insecure-Requests': '1'
                });
                // Small random delay for "human" feel
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 500) + 200));
            }

            // Pipe browser logs to Node console for debugging scraper errors
            page.on('console', msg => {
                if (msg.type() === 'error' || msg.type() === 'warn') {
                    console.log(`PAGE ${msg.type().toUpperCase()}:`, msg.text());
                }
            });

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                // Amazon & Decathlon & Nike anti-bot (Cloudflare, Akamai etc) trigger if CSS/Static assets are blocked
                const blockList = (isAmazon || isDecathlon || isNike)
                    ? ['image', 'font', 'media'] // Allow CSS for anti-bot challenges
                    : ['image', 'stylesheet', 'font', 'media'];

                if (blockList.includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // 1. NAVIGATION (Robust 25s Timeout)
            try {
                console.log("Navigating to:", cleanUrlStr);
                await page.goto(cleanUrlStr, { waitUntil: 'domcontentloaded', timeout: 25000 });
            } catch (error) {
                console.warn("Navigation Timeout (25s) - Proceeding to extraction...");
            }

            // Wait for JSON-LD settling
            await new Promise(r => setTimeout(r, 1000));

            // Hybrid Specific Lazy Load / SPA Trigger
            if (url.includes('hepsiburada') || url.includes('decathlon') || url.includes('trendyol') || url.includes('amazon')) {
                try {
                    // Amazon Splash Bypass (Soft Bot Detection)
                    if (url.includes('amazon')) {
                        const splashBtn = await page.$('a[href*="/ref=nav_logo"], button:contains("Alışverişe Devam Et"), input[data-action-type="SELECT_LOCATION"]');
                        // Use a more generic check for the "Continue Shopping" button seen in logs
                        const isSplash = await page.evaluate(() => {
                            const btn = document.querySelector('button, a, input[type="submit"]');
                            return btn && (btn.textContent?.includes('Alışverişe Devam Et') || (btn as any).value?.includes('Alışverişe Devam Et'));
                        });

                        if (isSplash) {
                            console.log("Amazon Splash Detected. Clicking to continue...");
                            await page.evaluate(() => {
                                const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
                                const target = btns.find(b => b.textContent?.includes('Alışverişe Devam Et') || (b as any).value?.includes('Alışverişe Devam Et'));
                                if (target) (target as any).click();
                            });
                            await new Promise(r => setTimeout(r, 1500));
                        }
                    }

                    await page.evaluate(() => window.scrollBy(0, 1000));
                    await new Promise(r => setTimeout(r, 2000)); // Standard 2s wait for SPA elements
                } catch (e) { }
            }

            // 2. DOM EVALUATION (First Priority)
            const domData = await page.evaluate(() => {
                const result: any = { title: "", price: "", image: "", currency: "TRY", inStock: true, source: "manual" };

                // In-Browser Helper
                const safePrice = (val: any) => {
                    // Re-implement simplified smart parse logic in browser or just return string
                    // We will parse properly in Node context using smartPriceParse
                    if (!val) return "";
                    return val.toString().trim();
                };

                const cleanUrl = (raw: any): string => {
                    if (!raw) return "";
                    // Handle JSON-LD ImageObject or array
                    let u = raw;
                    if (Array.isArray(raw)) {
                        u = raw[0];
                    } else if (typeof raw === 'object') {
                        u = raw.contentUrl || raw.url || (Array.isArray(raw.image) ? raw.image[0] : raw.image) || raw;
                        if (Array.isArray(u)) u = u[0];
                    }

                    if (typeof u !== 'string') return "";

                    // Force HTTPS
                    if (u.startsWith('//')) u = 'https:' + u;
                    if (u.startsWith('http://')) u = u.replace('http://', 'https://');

                    // Clean Trendyol / Generic mnresize patterns
                    if ((u.includes("trendyol") || u.includes("dsmcdn") || u.includes("hepsiburada")) && u.includes("/mnresize/")) {
                        u = u.replace(/\/mnresize\/\d+\/\d+\//, "/");
                    }
                    return u;
                };

                // Strategy A: JSON-LD
                try {
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const script of scripts) {
                        try {
                            let json = JSON.parse(script.innerHTML);
                            if (!Array.isArray(json)) json = [json];
                            for (const item of json) {
                                // Recursive search could be better but keep it simple
                                const type = item['@type'];
                                if (type && (type === 'Product' || type.includes('Product'))) {
                                    if (item.name) result.title = item.name;
                                    if (item.image) result.image = cleanUrl(item.image);

                                    const offer = item.offers ? (Array.isArray(item.offers) ? item.offers[0] : item.offers) : null;
                                    if (offer) {
                                        result.price = safePrice(offer.price || offer.lowPrice || offer.highPrice);
                                        if (offer.priceCurrency) result.currency = offer.priceCurrency;
                                        if (offer.availability && !offer.availability.includes('InStock')) result.inStock = false;
                                        result.source = 'json-ld';
                                    }
                                    // Only return if we have BOTH price and image
                                    if (result.price && result.image) return result;
                                }
                            }
                        } catch (e) { }
                    }
                } catch (e) { }

                // Strategy B: Meta Tags
                if (!result.price) {
                    try {
                        const priceMeta = document.querySelector('meta[property="product:price:amount"]') ||
                            document.querySelector('meta[property="og:price:amount"]') ||
                            document.querySelector('meta[name="twitter:data1"]'); // Some sites use data1 for price
                        if (priceMeta) {
                            result.price = safePrice(priceMeta.getAttribute('content') || priceMeta.getAttribute('value'));
                            result.source = 'meta-tag';
                        }
                        const imgMeta = document.querySelector('meta[property="og:image"]') ||
                            document.querySelector('meta[name="twitter:image"]') ||
                            document.querySelector('link[rel="image_src"]');
                        if (imgMeta) result.image = cleanUrl(imgMeta.getAttribute('content') || imgMeta.getAttribute('href'));

                        const titleMeta = document.querySelector('meta[property="og:title"]') ||
                            document.querySelector('meta[name="twitter:title"]') ||
                            document.querySelector('title');
                        if (titleMeta) result.title = titleMeta.getAttribute('content') || titleMeta.textContent;
                    } catch (e) { }
                }

                // Strategy C: CSS Fallback
                if (!result.price) {
                    try {
                        // TRENDYOL ENVOY PROPS EXTRACTION (PuzzleJs Hybrid)
                        if (window.location.hostname.includes("trendyol")) {
                            const envoyProps = (window as any)["__envoy_product-detail__PROPS"];
                            if (envoyProps && envoyProps.product) {
                                const p = envoyProps.product;
                                result.title = p.name || result.title;
                                if (p.winnerVariant && p.winnerVariant.price && p.winnerVariant.price.discountedPrice) {
                                    result.price = p.winnerVariant.price.discountedPrice.value?.toString() || "";
                                }
                                if (p.images && p.images.length > 0) {
                                    // Trendyol images in Props are already original/zoom quality
                                    result.image = cleanUrl(p.images[0]);
                                } else {
                                    // Fallback to image-gallery props
                                    const galleryProps = (window as any)["__envoy_product-image-gallery__PROPS"];
                                    if (galleryProps && galleryProps.images && galleryProps.images.length > 0) {
                                        result.image = cleanUrl(galleryProps.images[0]);
                                    }
                                }
                                result.source = 'json-ld'; // Reusing label for SSR state
                                if (result.price) return result;
                            }
                        }

                        // HEPSIBURADA REDUX EXTRACTION (SUPER ROBUST)
                        if (window.location.hostname.includes("hepsiburada")) {
                            const reduxScript = document.getElementById('reduxStore');
                            if (reduxScript) {
                                try {
                                    const state = JSON.parse(reduxScript.innerHTML);
                                    const p = state?.productState?.product;
                                    if (p) {
                                        result.title = p.name || result.title;
                                        if (p.prices && p.prices.length > 0) {
                                            result.price = p.prices[0].value?.toString() || "";
                                            result.currency = p.prices[0].currency || "TRY";
                                        }
                                        if (p.media && p.media.length > 0) {
                                            let imgUrl = p.media[0].url || "";
                                            // Handle {size} placeholder
                                            result.image = cleanUrl(imgUrl.replace('{size}', '1500'));
                                        }
                                        // Stock status
                                        if (p.availabilityStatus) {
                                            result.inStock = p.availabilityStatus === 'InStock';
                                        }
                                        result.source = 'json-ld'; // Reuse label or use DOM if we had one
                                        if (result.price) return result;
                                    }
                                } catch (e) {
                                    console.warn("Redux parse failed", e);
                                }
                            }
                        }

                        // DECATHLON VARIANT EXTRACTION (Variant-Aware)
                        if (window.location.hostname.includes("decathlon")) {
                            try {
                                const dkt = (window as any)["__DKT"];
                                if (dkt && dkt._ctx && dkt._ctx.data) {
                                    // 1. Get Model Code (mc) from URL
                                    const urlParams = new URLSearchParams(window.location.search);
                                    const mc = urlParams.get('mc');

                                    // 2. Find Supermodel context
                                    const supermodel = dkt._ctx.data.find((d: any) => d.type === 'Supermodel');
                                    if (supermodel && supermodel.data && supermodel.data.models) {
                                        const model = mc
                                            ? supermodel.data.models.find((m: any) => m.modelId === mc)
                                            : supermodel.data.models[0]; // Fallback to first

                                        if (model) {
                                            result.price = model.price?.toString() || result.price;
                                            if (model.image) result.image = cleanUrl(model.image.url || model.image);
                                            result.source = 'json-ld'; // SSR State
                                            if (result.price) return result;
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn("Decathlon DKT extraction failed", e);
                            }
                        }

                        // Hepsiburada CDN (Image Hunter - Fallback if Redux fails)
                        if (!result.image && window.location.hostname.includes("hepsiburada")) {
                            // 1. Try OG first (already done, but double check specific Hepsiburada behavior if needed - generic covers it)

                            // 2. Scan IMG tags
                            const hbImages = Array.from(document.querySelectorAll('img')).filter(img => {
                                const s = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('original-src') || "";
                                return s.includes("hbimg.hepsiburada.net");
                            });

                            if (hbImages.length > 0) {
                                hbImages.sort((a, b) => {
                                    const getScore = (el: any) => {
                                        const s = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('original-src') || "";
                                        if (s.includes('/1500/')) return 3;
                                        if (s.includes('/1100/')) return 2;
                                        if (s.includes('/800/')) return 1;
                                        return 0;
                                    };
                                    return getScore(b) - getScore(a);
                                });

                                const best = hbImages[0];
                                let rawSrc = best.getAttribute('src') || best.getAttribute('data-src') || best.getAttribute('original-src') || "";
                                if (rawSrc.startsWith('//')) rawSrc = 'https:' + rawSrc;
                                result.image = rawSrc;
                            }
                        }

                        // AMAZON SPECIFIC EXTRACTION (Cunning & Robust)
                        if (window.location.hostname.includes("amazon")) {
                            try {
                                // 1. Title
                                result.title = document.querySelector('#productTitle')?.textContent?.trim() || result.title;

                                // 2. Price (Target hidden inputs first for clean numeric data)
                                const priceInput = document.querySelector('input[name*="customerVisiblePrice"]') ||
                                    document.querySelector('input[id*="attach-base-product-price"]');
                                if (priceInput) {
                                    result.price = (priceInput as any).value || result.price;
                                } else {
                                    // Fallback to offscreen or price symbols
                                    const offscreen = document.querySelector('.a-price .a-offscreen');
                                    if (offscreen) {
                                        result.price = offscreen.textContent?.trim() || result.price;
                                    } else {
                                        const whole = document.querySelector('.a-price-whole')?.textContent?.trim();
                                        const fraction = document.querySelector('.a-price-fraction')?.textContent?.trim();
                                        if (whole) result.price = `${whole}${fraction || ""}`;
                                    }
                                }

                                // 3. Image
                                const landingImg = document.querySelector('#landingImage') as HTMLImageElement;
                                if (landingImg && landingImg.src) {
                                    result.image = cleanUrl(landingImg.src);
                                } else {
                                    const dynamicImg = document.querySelector('#imgTagWrapperId img') as HTMLImageElement;
                                    if (dynamicImg && dynamicImg.src) result.image = cleanUrl(dynamicImg.src);
                                }

                                result.source = 'dom-selectors';
                                if (result.price && result.image) return result;
                            } catch (e) {
                                console.warn("Amazon specific extraction failed", e);
                            }
                        }

                        // NIKE SPECIFIC EXTRACTION (Next.js Data Hunter)
                        if (window.location.hostname.includes("nike.com")) {
                            try {
                                const nextData = (window as any)["__NEXT_DATA__"];
                                if (nextData && nextData.props && nextData.props.pageProps) {
                                    const pp = nextData.props.pageProps;
                                    // 1. Try to get data from selectedProduct
                                    const p = pp.selectedProduct || (pp.productGroups && pp.productGroups[0]?.products?.[Object.keys(pp.productGroups[0]?.products || {})[0]]);
                                    if (p) {
                                        result.title = p.title || result.title;
                                        if (p.prices) {
                                            result.price = p.prices.currentPrice?.toString() || p.prices.listPrice?.toString() || result.price;
                                            result.currency = p.prices.currency || result.currency;
                                        }
                                        if (p.images && p.images.portraitURL) {
                                            result.image = cleanUrl(p.images.portraitURL);
                                        }
                                        result.source = 'json-ld'; // NEXT_DATA is SSR state
                                        if (result.price) return result;
                                    }
                                }
                            } catch (e) {
                                console.warn("Nike NEXT_DATA extraction failed", e);
                            }
                        }

                        const priceSelectors = [
                            '.product-price-container .prc-dsc',
                            '.price',
                            '.product-price',
                            '#price_inside_buybox',
                            '.amount',
                            '[itemprop="price"]',
                            '.price-format__main-price',
                            '.vtmn-price',
                            '[data-testid="price"]',
                            '.current-price',
                            '.product__price'
                        ];
                        for (const sel of priceSelectors) {
                            const el = document.querySelector(sel);
                            if (el && /\d/.test(el.textContent || "")) {
                                result.price = safePrice(el.textContent);
                                result.source = 'dom-selectors';
                                break;
                            }
                        }
                    } catch (e) { }
                }

                return result;
            });

            // 3. HYBRID RECOVERY (Regex on Raw HTML)
            const finalData: ScrapedData = {
                title: domData.title || "",
                image: domData.image || "",
                price: smartPriceParse(domData.price),
                currency: domData.currency || "TRY",
                description: "",
                inStock: domData.inStock,
                source: domData.source as any
            };

            // If DOM failed to get valid price or image, try Regex
            if (finalData.price === 0 || !finalData.image) {
                console.log("DOM extraction incomplete. Attempting Regex Recovery...");
                const html = await page.content();

                // Regex Price
                if (finalData.price === 0) {
                    const pricePatterns = [/"price"\s*:\s*([\d.]+)/, /data-price="([\d.]+)"/, /"amount"\s*:\s*"?([\d.]+)"?/];
                    for (const p of pricePatterns) {
                        const m = html.match(p);
                        if (m && m[1]) {
                            finalData.price = smartPriceParse(m[1]);
                            finalData.source = 'regex-scan';
                            break;
                        }
                    }
                }

                // Regex Image (Hepsiburada / Generic)
                if (!finalData.image) {
                    // Hepsiburada Advanced Regex (Protocol insensitive)
                    const hbMatches = Array.from(html.matchAll(/(?:https?:)?\/\/hbimg\.hepsiburada\.net\/[^"'\s>]+/g));
                    if (hbMatches.length > 0) {
                        let links = hbMatches.map(m => m[0]); // Match entire definition

                        // Cleanup Protocols
                        links = links.map(l => l.startsWith('//') ? 'https:' + l : l);

                        // Sort by resolution
                        links.sort((a, b) => {
                            const score = (s: string) => {
                                if (s.includes('/1500/')) return 3;
                                if (s.includes('/1100/')) return 2;
                                if (s.includes('/800/')) return 1;
                                return 0;
                            };
                            return score(b) - score(a);
                        });
                        finalData.image = links[0];
                        if (finalData.image.includes('/mnresize/')) finalData.image = finalData.image.replace(/\/mnresize\/\d+\/\d+\//, "/");
                    } else {
                        const jsonImg = html.match(/"image"\s*:\s*"(https:\/\/[^"]+)"/);
                        if (jsonImg) finalData.image = jsonImg[1];
                    }
                }

                // Regex Title
                if (!finalData.title) {
                    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/);
                    if (nameMatch) finalData.title = nameMatch[1];
                }

                // 4. TRENDYOL REGEX STATE RECOVERY (If Script execution failed)
                if (url.includes('trendyol') && (finalData.price === 0 || !domData.image)) {
                    try {
                        console.log("Trendyol DOM incomplete. Scanning raw HTML for Envoy Props...");
                        const envoyMatch = html.match(/window\["__envoy_product-detail__PROPS"\]\s*=\s*(\{.*?\});/);
                        if (envoyMatch && envoyMatch[1]) {
                            const state = JSON.parse(envoyMatch[1]);
                            const p = state?.product;
                            if (p) {
                                if (!finalData.title) finalData.title = p.name;
                                if (finalData.price === 0 && p.winnerVariant?.price?.discountedPrice) {
                                    finalData.price = smartPriceParse(p.winnerVariant.price.discountedPrice.value);
                                    finalData.source = 'regex-scan';
                                }
                                if (!domData.image && p.images && p.images.length > 0) {
                                    // Implementation of price parser-like cleanUrl in Node
                                    let img = p.images[0];
                                    if (img.startsWith('//')) img = 'https:' + img;
                                    img = img.replace(/\/mnresize\/\d+\/\d+\//, "/");
                                    finalData.image = img;
                                    finalData.source = 'regex-scan';
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Trendyol Regex State Recovery failed:", e);
                    }
                }
            }

            // Fallback Placeholder
            if (!finalData.image) {
                Sentry.captureMessage(`Scraper Warning: Missing Image for ${url}`, "warning");
                finalData.image = "https://placehold.co/600x600?text=No+Image";
            }
            if (finalData.price === 0) {
                Sentry.captureMessage(`Scraper Warning: Zero Price for ${url}`, "warning");
                finalData.source = 'manual';
            }

            // Debug
            console.log("Scraping Completed Successfully:", {
                title: finalData.title,
                price: finalData.price,
                image: finalData.image.substring(0, 50) + "...",
                source: finalData.source
            });

            if (process.env.NODE_ENV !== 'production') {
                await page.screenshot({ path: path.resolve(process.cwd(), 'debug_last_run.png') });
            }

            return finalData;

        } catch (error: any) {
            console.warn(`Scraping failed for ${url}:`, error);
            Sentry.captureException(error);
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
